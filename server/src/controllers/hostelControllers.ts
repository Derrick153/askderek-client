// ─────────────────────────────────────────────────────────────────────────────
//  hostelControllers.ts
//
//  Hostel booking system for AskDerek.
//
//  Business rules enforced:
//    — Student cannot book their own hostel
//    — Cannot double book same room same semester
//    — FIXED closingType requires fixedEndDate
//    — SCHOOL_CALENDAR closingType requires schoolId and school must exist
//    — OPEN_ENDED closingType — student checks out when ready
//    — Price from PaymentStructure — never from request body
//    — Reference generated server side — never trusted from client
//    — Ownership verified via two-step query — semesterPlan + property
//    — Audit log fires after transaction — never inside
//    — Admin role verified from database on every admin request
// ─────────────────────────────────────────────────────────────────────────────

import { Request, Response }               from "express";
import { z }                               from "zod";
import { prisma }                          from "../lib/prisma";
import { logUserEvent, logSystemEvent }    from "../lib/auditService";
import { createNotification } from "../lib/inAppNotificationService";
import { recordEvent } from "../lib/notificationEventService";
import { runNotificationProcessorOnce } from "../lib/notificationProcessor";
import { ClosingType, HostelBookingStatus, TransferReason, BedStatus } from "@prisma/client";
import crypto                              from "crypto";
import { paystackInitialize, generateReference } from "../lib/paystack";
import { transitionBooking, BookingTxError as CentralBookingTxError } from "../lib/bookingTransitionService";

// ── RESPONSE TYPES ────────────────────────────────────────────────────────────

interface ApiSuccess<T = unknown> {
  success: true;
  message: string;
  data?:   T;
}

interface ApiError {
  success: false;
  message: string;
  errors?: { field: string; message: string }[];
}

type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ── VALIDATION SCHEMAS ────────────────────────────────────────────────────────

const createSemesterBookingSchema = z.object({
  propertyId:   z.number({ error: "propertyId must be a number" })
                 .int()
                 .positive(),
  bedId:        z.number({ error: "bedId must be a number" })
                 .int()
                 .positive(),
  semesterName: z.string()
                 .min(3,   "semesterName must be at least 3 characters")
                 .max(100, "semesterName cannot exceed 100 characters"),
  checkIn:      z.string()
                 .datetime({ message: "checkIn must be a valid ISO datetime" }),
  closingType:  z.enum(["FIXED", "SCHOOL_CALENDAR", "OPEN_ENDED"], {
    error: "closingType must be FIXED, SCHOOL_CALENDAR or OPEN_ENDED",
  }),
  fixedEndDate: z.string()
                 .datetime({ message: "fixedEndDate must be a valid ISO datetime" })
                 .optional(),
  schoolId:     z.number({ error: "schoolId must be a number" })
                 .int()
                 .positive()
                 .optional(),
  bookingGender: z.enum(["MALE", "FEMALE"], { error: "bookingGender must be MALE or FEMALE" }).optional(),
});

const checkoutStudentSchema = z.object({
  actualEndDate: z.string()
                  .datetime({ message: "actualEndDate must be a valid ISO datetime" }),
});

const extendStaySchema = z.object({
  newEndDate: z.string()
               .datetime({ message: "newEndDate must be a valid ISO datetime" }),
});

// ── SHARED HELPERS ────────────────────────────────────────────────────────────

// Extracts userId from verified Clerk JWT.
// Identity must always come from the token — never from req.body.
const requireAuth = (req: Request, res: Response): string | null => {
  const userId = req.auth?.().userId;
  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return null;
  }
  return userId;
};

// Verifies caller is an active admin via database check.
// JWT alone is not trusted for admin actions.
const requireAdminAuth = async (
  req: Request,
  res: Response
): Promise<string | null> => {
  const userId = req.auth?.().userId;
  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return null;
  }
  const user = await prisma.user.findUnique({
    where:  { clerkId: userId },
    select: { role: true, isActive: true },
  });
  if (!user || user.role !== "ADMIN" || !user.isActive) {
    res.status(403).json({ success: false, message: "Forbidden" });
    return null;
  }
  return userId;
};

// Validates a numeric route parameter.
// Returns null and sends 400 if value is not a valid positive integer.
const getNumericParam = (
  value: string,
  name:  string,
  res:   Response
): number | null => {
  const id = Number(value);
  if (isNaN(id) || id <= 0) {
    res.status(400).json({ success: false, message: `Invalid ${name}` });
    return null;
  }
  return id;
};

// Converts Zod issues to the standard API error shape.
const formatZodErrors = (
  issues: z.ZodIssue[]
): { field: string; message: string }[] =>
  issues.map(i => ({
    field:   String(i.path[0] ?? "unknown"),
    message: i.message,
  }));

// Generates a unique hostel booking reference — server side only.
// Format: HST-YYYY-XXXXXXXX
// Never accepted from client input — prevents reference manipulation.
const generateHostelReference = (): string => {
  const year = new Date().getFullYear();
  const hex  = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `HST-${year}-${hex}`;
};

// -----------------------------------------------------------------------------
//  ADD ROOM � MANAGER
//  POST /api/hostels/:propertyId/rooms
//
//  Manager adds a single room to their hostel, with its beds created
//  automatically based on capacity.
//  Ownership verified � only the hostel's manager (or admin) can add rooms.
// -----------------------------------------------------------------------------

const addRoomSchema = z.object({
  roomNumber:    z.string().min(1, "roomNumber is required").max(20),
  block:         z.string().max(20).optional(),
  floor:         z.string().max(20).optional(),
  gender:        z.enum(["MALE", "FEMALE", "MIXED"]).optional(),
  capacity:      z.number({ error: "capacity must be a number" }).int().positive().max(10, "capacity cannot exceed 10 beds per room"),
  semesterPrice: z.number().positive().optional(),
});

export const addRoom = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const managerClerkId = requireAuth(req, res);
  if (!managerClerkId) return;

  const propertyId = getNumericParam(req.params.propertyId, "propertyId", res);
  if (!propertyId) return;

  const parsed = addRoomSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors:  formatZodErrors(parsed.error.issues),
    });
    return;
  }

  const { roomNumber, block, floor, gender, capacity, semesterPrice } = parsed.data;

  try {
    const property = await prisma.property.findFirst({
      where: {
        id:            propertyId,
        managerClerkId,
        listingType:   "HOSTEL",
        deletedAt:     null,
      },
    });

    if (!property) {
      res.status(404).json({
        success: false,
        message: "Hostel not found or you do not have permission",
      });
      return;
    }

    const room = await prisma.$transaction(async (tx) => {
      const newRoom = await tx.room.create({
        data: {
          propertyId,
          roomNumber,
          block:    block    ?? null,
          floor:    floor    ?? null,
          gender:   gender   ?? null,
          capacity,
          semesterPrice: semesterPrice ?? null,
        },
      });

      const bedLabels = Array.from({ length: capacity }, (_, i) =>
        String.fromCharCode(65 + i)
      );

      await tx.bed.createMany({
        data: bedLabels.map((bedNumber) => ({
          roomId: newRoom.id,
          bedNumber,
        })),
      });

      return tx.room.findUnique({
        where:   { id: newRoom.id },
        include: { beds: true },
      });
    });

    await logSystemEvent({
      action:  "HOSTEL_ROOM_ADDED",
      target:  `Room #${room!.id} � Property #${propertyId}`,
      details: `Room ${roomNumber} added with ${capacity} beds by ${managerClerkId}`,
    });

    res.status(201).json({
      success: true,
      message: "Room added successfully",
      data:    room,
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      res.status(400).json({
        success: false,
        message: `Room ${roomNumber} already exists for this hostel`,
      });
      return;
    }
    console.error("[hostelControllers.addRoom]", {
      propertyId,
      managerClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const addPaymentStructureSchema = z.object({
  price:          z.number({ error: "price must be a number" }).positive(),
  roomId:         z.number().int().positive().optional(),
  effectiveFrom:  z.string().datetime({ message: "effectiveFrom must be a valid ISO datetime" }).optional(),
  effectiveUntil: z.string().datetime({ message: "effectiveUntil must be a valid ISO datetime" }).optional(),
  reason:         z.string().max(500).optional(),
});

// -----------------------------------------------------------------------------
//  ADD PAYMENT STRUCTURE - MANAGER
//  POST /api/hostels/:propertyId/pricing
//
//  Creates a new price version, optionally scoped to one room (roomId
//  null = property-wide default). Effective-dated - a manager can
//  schedule a future price without touching what is charged today.
//  Pricing truth is dates + scope, never isActive/cron - the same
//  principle this codebase already uses for bed occupancy (never
//  stored, always calculated live) applied here to price status.
//  Closing the previous open row is scoped to the exact same
//  (propertyId, roomId) pair, so a room-specific price never
//  disturbs the property default's own history, or another room's.
// -----------------------------------------------------------------------------
export const addPaymentStructure = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const managerClerkId = requireAuth(req, res);
  if (!managerClerkId) return;

  const propertyId = getNumericParam(req.params.propertyId, "propertyId", res);
  if (!propertyId) return;

  const parsed = addPaymentStructureSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors:  formatZodErrors(parsed.error.issues),
    });
    return;
  }
  const { price, roomId, reason } = parsed.data;
  const effectiveFrom  = parsed.data.effectiveFrom ? new Date(parsed.data.effectiveFrom) : new Date();
  const effectiveUntil = parsed.data.effectiveUntil ? new Date(parsed.data.effectiveUntil) : null;

  if (effectiveUntil && effectiveUntil <= effectiveFrom) {
    res.status(400).json({ success: false, message: "effectiveUntil must be after effectiveFrom" });
    return;
  }

  try {
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        managerClerkId,
        listingType: "HOSTEL",
        deletedAt: null,
      },
    });
    if (!property) {
      res.status(404).json({
        success: false,
        message: "Hostel not found or you do not have permission",
      });
      return;
    }

    if (roomId) {
      const room = await prisma.room.findFirst({ where: { id: roomId, propertyId } });
      if (!room) {
        res.status(404).json({ success: false, message: "Room not found for this hostel" });
        return;
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Find the currently-open row in the SAME (propertyId, roomId) scope.
      // A room-specific price only ever supersedes that same room's own
      // prior price - never the property default's, and vice versa.
      const openRow = await tx.paymentStructure.findFirst({
        where: { propertyId, roomId: roomId ?? null, effectiveUntil: null },
        orderBy: { effectiveFrom: "desc" },
      });

      if (openRow) {
        if (openRow.effectiveFrom >= effectiveFrom) {
          return { error: 400 as const, message: "A pricing version in this scope already starts on or after this effective date. Adjust the date or edit the existing version." };
        }
        await tx.paymentStructure.update({
          where: { id: openRow.id },
          data:  { effectiveUntil: effectiveFrom, isActive: false },
        });
      }

      const structure = await tx.paymentStructure.create({
        data: {
          propertyId,
          roomId: roomId ?? null,
          durationType: "SEMESTER",
          price,
          effectiveFrom,
          effectiveUntil,
          reason: reason ?? null,
          createdBy: managerClerkId,
          isActive: true,
        },
      });

      return { structure };
    });

    if ("error" in result) {
      res.status(result.error).json({ success: false, message: result.message });
      return;
    }

    await logUserEvent({
      userClerkId: managerClerkId,
      action:  "HOSTEL_PRICING_SET",
      target:  roomId ? `Room #${roomId} - Property #${propertyId}` : `Property #${propertyId}`,
      details: `Price set to GHS ${price}, effective ${effectiveFrom.toISOString()} by ${managerClerkId}${reason ? `. Reason: ${reason}` : ""}`,
    });

    res.status(201).json({
      success: true,
      message: "Pricing configured successfully",
      data:    result.structure,
    });
  } catch (error: any) {
    console.error("[hostelControllers.addPaymentStructure]", {
      propertyId,
      managerClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// -----------------------------------------------------------------------------
//  GET PROPERTY PRICING - MANAGER (read-only)
//  GET /api/hostels/:propertyId/pricing
//
//  Returns every price version for a property (default + room
//  overrides), with status computed live from dates against the
//  current moment - never stored, never cron-maintained. Same
//  principle this codebase already uses for bed occupancy.
// -----------------------------------------------------------------------------
export const getPropertyPricing = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const managerClerkId = requireAuth(req, res);
  if (!managerClerkId) return;

  const propertyId = getNumericParam(req.params.propertyId, "propertyId", res);
  if (!propertyId) return;

  try {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, managerClerkId, listingType: "HOSTEL", deletedAt: null },
    });
    if (!property) {
      res.status(404).json({ success: false, message: "Hostel not found or you do not have permission" });
      return;
    }

    const rows = await prisma.paymentStructure.findMany({
      where: { propertyId },
      include: { room: { select: { roomNumber: true } } },
      orderBy: [{ roomId: "asc" }, { effectiveFrom: "desc" }],
    });

    const uniqueActorIds = [...new Set(rows.map((r) => r.createdBy).filter((id): id is string => !!id))];
    const actors = await prisma.user.findMany({
      where:  { clerkId: { in: uniqueActorIds } },
      select: { clerkId: true, name: true },
    });
    const actorMap = new Map(actors.map((a) => [a.clerkId, a.name]));

    const now = new Date();
    const withStatus = rows.map((r) => {
      let status: "ACTIVE" | "UPCOMING" | "EXPIRED";
      if (r.effectiveFrom > now) {
        status = "UPCOMING";
      } else if (r.effectiveUntil && r.effectiveUntil <= now) {
        status = "EXPIRED";
      } else {
        status = "ACTIVE";
      }
      return {
        ...r,
        status,
        createdByName: r.createdBy ? (actorMap.get(r.createdBy) ?? r.createdBy) : null,
      };
    });

    res.status(200).json({
      success: true,
      message: `${withStatus.length} pricing version(s) found`,
      data: withStatus,
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.getPropertyPricing]", {
      propertyId,
      managerClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// -----------------------------------------------------------------------------
//  BULK ADD ROOMS � MANAGER
//  POST /api/hostels/:propertyId/rooms/bulk
//
//  Manager adds a range of rooms at once, e.g. "101-120" or "A101-A120".
//  Each room gets the same capacity/gender/price, with beds auto-created.
//  Skips any room number that already exists rather than failing the
//  whole batch � reports back exactly what was created and what was skipped.
// -----------------------------------------------------------------------------

const bulkAddRoomsSchema = z.object({
  startRoom:     z.string().min(1, "startRoom is required").max(20),
  endRoom:       z.string().min(1, "endRoom is required").max(20),
  block:         z.string().max(20).optional(),
  floor:         z.string().max(20).optional(),
  gender:        z.enum(["MALE", "FEMALE", "MIXED"]).optional(),
  capacity:      z.number({ error: "capacity must be a number" }).int().positive().max(10, "capacity cannot exceed 10 beds per room"),
  semesterPrice: z.number().positive().optional(),
});

const parseRoomRange = (
  startRoom: string,
  endRoom: string
): { prefix: string; start: number; end: number; digits: number } | null => {
  const match = (s: string) => s.match(/^([A-Za-z]*)(\d+)$/);
  const startMatch = match(startRoom);
  const endMatch   = match(endRoom);

  if (!startMatch || !endMatch) return null;
  if (startMatch[1] !== endMatch[1]) return null;

  const start = parseInt(startMatch[2], 10);
  const end   = parseInt(endMatch[2], 10);
  if (start > end) return null;
  if (end - start > 100) return null;

  return { prefix: startMatch[1], start, end, digits: startMatch[2].length };
};

export const bulkAddRooms = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const managerClerkId = requireAuth(req, res);
  if (!managerClerkId) return;

  const propertyId = getNumericParam(req.params.propertyId, "propertyId", res);
  if (!propertyId) return;

  const parsed = bulkAddRoomsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors:  formatZodErrors(parsed.error.issues),
    });
    return;
  }

  const { startRoom, endRoom, block, floor, gender, capacity, semesterPrice } = parsed.data;

  const range = parseRoomRange(startRoom, endRoom);
  if (!range) {
    res.status(400).json({
      success: false,
      message: "startRoom and endRoom must share the same prefix and form a valid numeric range (e.g. 101-120 or A101-A120), up to 100 rooms at a time",
    });
    return;
  }

  try {
    const property = await prisma.property.findFirst({
      where: {
        id:            propertyId,
        managerClerkId,
        listingType:   "HOSTEL",
        deletedAt:     null,
      },
    });

    if (!property) {
      res.status(404).json({
        success: false,
        message: "Hostel not found or you do not have permission",
      });
      return;
    }

    const roomNumbers: string[] = [];
    for (let n = range.start; n <= range.end; n++) {
      roomNumbers.push(range.prefix + String(n).padStart(range.digits, "0"));
    }

    const existing = await prisma.room.findMany({
      where:  { propertyId, roomNumber: { in: roomNumbers } },
      select: { roomNumber: true },
    });
    const existingSet = new Set(existing.map((r) => r.roomNumber));
    const toCreate = roomNumbers.filter((rn) => !existingSet.has(rn));

    const bedLabels = Array.from({ length: capacity }, (_, i) =>
      String.fromCharCode(65 + i)
    );

    const createdRooms = await prisma.$transaction(async (tx) => {
      const rooms = [];
      for (const roomNumber of toCreate) {
        const room = await tx.room.create({
          data: {
            propertyId,
            roomNumber,
            block:    block  ?? null,
            floor:    floor  ?? null,
            gender:   gender ?? null,
            capacity,
            semesterPrice: semesterPrice ?? null,
          },
        });
        await tx.bed.createMany({
          data: bedLabels.map((bedNumber) => ({ roomId: room.id, bedNumber })),
        });
        rooms.push(room);
      }
      return rooms;
    });

    await logSystemEvent({
      action:  "HOSTEL_ROOMS_BULK_ADDED",
      target:  `Property #${propertyId}`,
      details: `${createdRooms.length} rooms added (${toCreate.join(", ") || "none"}) by ${managerClerkId}. Skipped ${existingSet.size} existing: ${[...existingSet].join(", ") || "none"}`,
    });

    res.status(201).json({
      success: true,
      message: `${createdRooms.length} room(s) created, ${existingSet.size} skipped (already existed)`,
      data: {
        created: createdRooms,
        skipped: [...existingSet],
      },
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.bulkAddRooms]", {
      propertyId,
      managerClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// -----------------------------------------------------------------------------
//  BULK CAPACITY PREVIEW - MANAGER
//  POST /api/hostels/:propertyId/rooms/capacity/bulk-preview
//
//  Read-only. Checks every room in the given range against a target
//  capacity and reports which rooms are safe to change and which are
//  blocked, with occupant context on blocked ones. Makes no database
//  changes - the manager reviews this before anything is applied.
// -----------------------------------------------------------------------------
const bulkCapacityPreviewSchema = z.object({
  startRoom: z.string().min(1),
  endRoom:   z.string().min(1),
  capacity:  z.number({ error: "capacity must be a number" }).int().positive().max(10, "capacity cannot exceed 10 beds per room"),
});

export const bulkPreviewCapacity = async (
  req: Request,
  res: Response<ApiResponse>
) : Promise<void> => {
  const managerClerkId = requireAuth(req, res);
  if (!managerClerkId) return;

  const propertyId = getNumericParam(req.params.propertyId, "propertyId", res);
  if (!propertyId) return;

  const parsed = bulkCapacityPreviewSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors:  formatZodErrors(parsed.error.issues),
    });
    return;
  }

  const { startRoom, endRoom, capacity } = parsed.data;
  const range = parseRoomRange(startRoom, endRoom);
  if (!range) {
    res.status(400).json({
      success: false,
      message: "startRoom and endRoom must share the same prefix and form a valid numeric range (e.g. 101-120 or A101-A120), up to 100 rooms at a time",
    });
    return;
  }

  try {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, managerClerkId, listingType: "HOSTEL", deletedAt: null },
    });
    if (!property) {
      res.status(404).json({ success: false, message: "Hostel not found or you do not have permission" });
      return;
    }

    const roomNumbers: string[] = [];
    for (let n = range.start; n <= range.end; n++) {
      roomNumbers.push(range.prefix + String(n).padStart(range.digits, "0"));
    }

    const rooms = await prisma.room.findMany({
      where:   { propertyId, roomNumber: { in: roomNumbers } },
      include: { beds: true },
    });

    const results = await Promise.all(
      rooms.map(async (room) => {
        const plan = planCapacityChange(room.beds, capacity);

        if (plan.kind === "noChange") {
          return { roomId: room.id, roomNumber: room.roomNumber, status: "noChange" as const };
        }
        if (plan.kind === "increase") {
          return { roomId: room.id, roomNumber: room.roomNumber, status: "safe" as const, added: plan.newLabels, removed: [] as string[] };
        }
        if (plan.kind === "decrease") {
          return { roomId: room.id, roomNumber: room.roomNumber, status: "safe" as const, added: [] as string[], removed: plan.toRemove.map((b) => b.bedNumber) };
        }

        const occupants = await Promise.all(
          plan.blockingBeds.map(async (b) => {
            let detail = b.status as string;
            if (b.currentBookingId) {
              const booking = await prisma.semesterPlan.findUnique({
                where:  { id: b.currentBookingId },
                select: { studentClerkId: true, reference: true },
              });
              if (booking) {
                const student = await prisma.user.findUnique({
                  where:  { clerkId: booking.studentClerkId },
                  select: { name: true },
                });
                detail = `${b.status} - ${student?.name ?? "student"} (Booking ${booking.reference})`;
              }
            }
            return { bed: b.bedNumber, detail };
          })
        );

        return { roomId: room.id, roomNumber: room.roomNumber, status: "blocked" as const, blockedReason: occupants };
      })
    );

    const foundRoomNumbers = new Set(rooms.map((r) => r.roomNumber));
    const missing = roomNumbers.filter((rn) => !foundRoomNumbers.has(rn));
    const safe     = results.filter((r) => r.status === "safe");
    const blocked  = results.filter((r) => r.status === "blocked");
    const noChange = results.filter((r) => r.status === "noChange");

    res.status(200).json({
      success: true,
      message: `${safe.length} of ${rooms.length} room(s) can be changed safely`,
      data: {
        requestedCapacity: capacity,
        totalRoomsInRange: roomNumbers.length,
        roomsFound:        rooms.length,
        roomsMissing:      missing,
        safeCount:         safe.length,
        blockedCount:      blocked.length,
        noChangeCount:     noChange.length,
        results,
      },
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.bulkPreviewCapacity]", {
      propertyId,
      managerClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// -----------------------------------------------------------------------------
//  BULK CAPACITY APPLY - MANAGER
//  POST /api/hostels/:propertyId/rooms/capacity/bulk-apply
//
//  Applies a capacity change to a manager-confirmed list of room IDs (the
//  rooms kept after reviewing the preview - never the raw range again).
//  Each room is re-checked and updated in its own transaction, so one
//  room failing never rolls back another room's already-safe change.
//  One audit entry per room changed, plus one summary entry for the batch.
// -----------------------------------------------------------------------------
const bulkCapacityApplySchema = z.object({
  roomIds:  z.array(z.number().int().positive()).min(1, "at least one roomId is required").max(100, "cannot update more than 100 rooms at a time"),
  capacity: z.number({ error: "capacity must be a number" }).int().positive().max(10, "capacity cannot exceed 10 beds per room"),
});

export const bulkApplyCapacity = async (
  req: Request,
  res: Response<ApiResponse>
) : Promise<void> => {
  const managerClerkId = requireAuth(req, res);
  if (!managerClerkId) return;

  const propertyId = getNumericParam(req.params.propertyId, "propertyId", res);
  if (!propertyId) return;

  const parsed = bulkCapacityApplySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors:  formatZodErrors(parsed.error.issues),
    });
    return;
  }

  const { roomIds, capacity: newCapacity } = parsed.data;

  try {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, managerClerkId, listingType: "HOSTEL", deletedAt: null },
    });
    if (!property) {
      res.status(404).json({ success: false, message: "Hostel not found or you do not have permission" });
      return;
    }

    const outcomes: { roomId: number; roomNumber?: string; status: string; added?: string[]; removed?: string[]; reason?: string }[] = [];

    for (const roomId of roomIds) {
      const outcome = await prisma.$transaction(async (tx) => {
        const room = await tx.room.findUnique({ where: { id: roomId }, include: { beds: true } });

        if (!room || room.propertyId !== propertyId) {
          return { roomId, status: "notFound" as const };
        }

        const plan = planCapacityChange(room.beds, newCapacity);

        if (plan.kind === "noChange") {
          return { roomId, roomNumber: room.roomNumber, status: "noChange" as const };
        }
        if (plan.kind === "blocked") {
          return {
            roomId,
            roomNumber: room.roomNumber,
            status: "blocked" as const,
            reason: `${plan.blockingBeds.length} bed(s) occupied or reserved`,
          };
        }
        if (plan.kind === "increase") {
          await tx.bed.createMany({ data: plan.newLabels.map((bedNumber) => ({ roomId: room.id, bedNumber })) });
          await tx.room.update({ where: { id: room.id }, data: { capacity: newCapacity } });
          return { roomId, roomNumber: room.roomNumber, status: "updated" as const, added: plan.newLabels, removed: [] as string[] };
        }

        await tx.bed.deleteMany({ where: { id: { in: plan.toRemove.map((b) => b.id) } } });
        await tx.room.update({ where: { id: room.id }, data: { capacity: newCapacity } });
        return { roomId, roomNumber: room.roomNumber, status: "updated" as const, added: [] as string[], removed: plan.toRemove.map((b) => b.bedNumber) };
      });

      outcomes.push(outcome);

      if (outcome.status === "updated") {
        await logSystemEvent({
          action:  "HOSTEL_ROOM_CAPACITY_UPDATED",
          target:  `Room #${outcome.roomId} - ${outcome.roomNumber}`,
          details: JSON.stringify({
            roomId: outcome.roomId,
            roomNumber: outcome.roomNumber,
            newCapacity,
            bedsAdded: outcome.added,
            bedsRemoved: outcome.removed,
            performedBy: managerClerkId,
            bulk: true,
          }),
        });
      }
    }

    const updated  = outcomes.filter((o) => o.status === "updated");
    const blocked  = outcomes.filter((o) => o.status === "blocked");
    const notFound = outcomes.filter((o) => o.status === "notFound");
    const noChange = outcomes.filter((o) => o.status === "noChange");

    await logSystemEvent({
      action:  "HOSTEL_ROOM_CAPACITY_BULK_UPDATED",
      target:  `Property #${propertyId}`,
      details: `Bulk capacity change to ${newCapacity} by ${managerClerkId}. Updated: ${updated.length}. Blocked: ${blocked.length}. Not found: ${notFound.length}. No change: ${noChange.length}.`,
    });

    res.status(200).json({
      success: true,
      message: `${updated.length} of ${roomIds.length} room(s) updated`,
      data: {
        requestedCapacity: newCapacity,
        updatedCount:  updated.length,
        blockedCount:  blocked.length,
        notFoundCount: notFound.length,
        noChangeCount: noChange.length,
        results: outcomes,
      },
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.bulkApplyCapacity]", {
      propertyId,
      managerClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// -----------------------------------------------------------------------------
//  GET HOSTEL ROOMS � MANAGER
//  GET /api/hostels/:propertyId/rooms
//
//  Returns every room and bed for a hostel, grouped for dashboard display.
//  Occupancy is calculated live from bed status � never stored separately,
//  avoiding the classic counter-drift bug where a stored number silently
//  goes out of sync with reality.
// -----------------------------------------------------------------------------
const fetchActiveRoomsWithBeds = (propertyId: number, includeInactive = false) =>
  prisma.room.findMany({
    where:   { propertyId, ...(includeInactive ? {} : { isActive: true }) },
    include: { beds: true },
    orderBy: [{ block: "asc" }, { floor: "asc" }, { roomNumber: "asc" }],
  });

const computeRoomStats = (rooms: Awaited<ReturnType<typeof fetchActiveRoomsWithBeds>>) => {
  const allBeds = rooms.flatMap((r) => r.beds);
  return {
    totalRooms:      rooms.length,
    totalBeds:       allBeds.length,
    occupiedBeds:    allBeds.filter((b) => b.status === "OCCUPIED").length,
    reservedBeds:    allBeds.filter((b) => b.status === "RESERVED").length,
    maintenanceBeds: allBeds.filter((b) => b.status === "MAINTENANCE" && !b.isRetired).length,
    retiredBeds:     allBeds.filter((b) => b.isRetired).length,
    availableBeds:   allBeds.filter((b) => b.status === "AVAILABLE").length,
  };
};

export const getHostelRooms = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const managerClerkId = requireAuth(req, res);
  if (!managerClerkId) return;

  const propertyId = getNumericParam(req.params.propertyId, "propertyId", res);
  if (!propertyId) return;

  try {
    const property = await prisma.property.findFirst({
      where: {
        id:            propertyId,
        managerClerkId,
        listingType:   "HOSTEL",
        deletedAt:     null,
      },
    });

    if (!property) {
      res.status(404).json({
        success: false,
        message: "Hostel not found or you do not have permission",
      });
      return;
    }

    const rooms = await fetchActiveRoomsWithBeds(propertyId, true);

    res.status(200).json({
      success: true,
      message: "Hostel rooms retrieved successfully",
      data: {
        rooms,
        ...computeRoomStats(rooms),
      },
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.getHostelRooms]", {
      propertyId,
      managerClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getPublicHostelRooms = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const propertyId = getNumericParam(req.params.propertyId, "propertyId", res);
  if (!propertyId) return;

  try {
    const property = await prisma.property.findFirst({
      where: {
        id:            propertyId,
        listingType:   "HOSTEL",
        listingStatus: "AVAILABLE",
        deletedAt:     null,
        isArchived:    false,
      },
    });

    if (!property) {
      res.status(404).json({
        success: false,
        message: "Hostel not found",
      });
      return;
    }

    const rooms = await fetchActiveRoomsWithBeds(propertyId);

    // Resolve the real, Step 8-authoritative price for each room -
    // room-specific price wins when one exists, property default is
    // the fallback. Never the cosmetic Room.semesterPrice field.
    const roomIds = rooms.map((r) => r.id);
    const priceNow = new Date();
    const priceRows = await prisma.paymentStructure.findMany({
      where: {
        propertyId,
        OR: [{ roomId: { in: roomIds } }, { roomId: null }],
        effectiveFrom: { lte: priceNow },
        AND: [{ OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: priceNow } }] }],
      },
      orderBy: { effectiveFrom: "desc" },
    });
    const propertyDefault = priceRows.find((p) => p.roomId === null)?.price ?? null;
    const resolvedPriceByRoom = new Map<number, number | null>();
    for (const roomId of roomIds) {
      const roomSpecific = priceRows.find((p) => p.roomId === roomId)?.price;
      resolvedPriceByRoom.set(roomId, roomSpecific ?? propertyDefault);
    }

    const publicRooms = rooms.map((room) => ({
      id:             room.id,
      roomNumber:     room.roomNumber,
      block:          room.block,
      floor:          room.floor,
      gender:         room.gender,
      capacity:       room.capacity,
      semesterPrice:  resolvedPriceByRoom.get(room.id) ?? null,
      beds: room.beds.map((bed) => ({
        id:        bed.id,
        bedNumber: bed.bedNumber,
        status:    bed.status,
      })),
    }));

    res.status(200).json({
      success: true,
      message: "Hostel rooms retrieved successfully",
      data: {
        rooms: publicRooms,
        ...computeRoomStats(rooms),
      },
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.getPublicHostelRooms]", {
      propertyId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// -----------------------------------------------------------------------------
//  UPDATE ROOM � MANAGER
//  PUT /api/hostels/rooms/:roomId
//
//  Manager edits a room's details. Capacity cannot be changed here �
//  changing bed count after beds may already have bookings tied to them
//  is a separate, more careful operation, intentionally not supported yet.
// -----------------------------------------------------------------------------

const updateRoomSchema = z.object({
  block:         z.string().max(20).optional(),
  floor:         z.string().max(20).optional(),
  gender:        z.enum(["MALE", "FEMALE", "MIXED"]).optional(),
  semesterPrice: z.number().positive().optional(),
  isActive:      z.boolean().optional(),
});

export const updateRoom = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const managerClerkId = requireAuth(req, res);
  if (!managerClerkId) return;

  const roomId = getNumericParam(req.params.roomId, "roomId", res);
  if (!roomId) return;

  const parsed = updateRoomSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors:  formatZodErrors(parsed.error.issues),
    });
    return;
  }

  try {
    const room = await prisma.room.findUnique({
      where:   { id: roomId },
      include: { property: true },
    });

    if (!room) {
      res.status(404).json({ success: false, message: "Room not found" });
      return;
    }

    if (room.property.managerClerkId !== managerClerkId) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to manage this room",
      });
      return;
    }

    const updated = await prisma.room.update({
      where: { id: roomId },
      data:  parsed.data,
      include: { beds: true },
    });

    await logSystemEvent({
      action:  "HOSTEL_ROOM_UPDATED",
      target:  `Room #${roomId}`,
      details: `Updated by ${managerClerkId}: ${JSON.stringify(parsed.data)}`,
    });

    res.status(200).json({
      success: true,
      message: "Room updated successfully",
      data:    updated,
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.updateRoom]", {
      roomId,
      managerClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updateHostelProfileSchema = z.object({
  emergencyContactName:  z.string().max(150,  "emergencyContactName cannot exceed 150 characters").optional(),
  emergencyContactPhone: z.string().max(20,   "emergencyContactPhone cannot exceed 20 characters").optional(),
  rules:                 z.string().max(2000, "rules cannot exceed 2000 characters").optional(),
});

export const updateHostelProfile = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const managerClerkId = requireAuth(req, res);
  if (!managerClerkId) return;

  const propertyId = getNumericParam(req.params.propertyId, "propertyId", res);
  if (!propertyId) return;

  const parsed = updateHostelProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors:  formatZodErrors(parsed.error.issues),
    });
    return;
  }

  try {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });

    if (!property) {
      res.status(404).json({ success: false, message: "Property not found" });
      return;
    }
    if (property.managerClerkId !== managerClerkId) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to manage this property",
      });
      return;
    }
    if (property.listingType !== "HOSTEL") {
      res.status(400).json({
        success: false,
        message: "This endpoint only applies to HOSTEL properties",
      });
      return;
    }

    const updated = await prisma.property.update({
      where: { id: propertyId },
      data:  parsed.data,
    });

    await logSystemEvent({
      action:  "HOSTEL_PROFILE_UPDATED",
      target:  `Property #${propertyId}`,
      details: `Updated by ${managerClerkId}: ${JSON.stringify(parsed.data)}`,
    });

    res.status(200).json({
      success: true,
      message: "Hostel profile updated successfully",
      data:    updated,
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.updateHostelProfile]", {
      propertyId,
      managerClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// -----------------------------------------------------------------------------
//  DELETE ROOM � MANAGER
//  DELETE /api/hostels/rooms/:roomId
//
//  Blocked unless every bed in the room is AVAILABLE or MAINTENANCE.
//  Occupied, Reserved, or Pending-Approval beds all block deletion �
//  a room can never be deleted while it still represents a real
//  commitment to a student.
// -----------------------------------------------------------------------------

export const deleteRoom = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const managerClerkId = requireAuth(req, res);
  if (!managerClerkId) return;

  const roomId = getNumericParam(req.params.roomId, "roomId", res);
  if (!roomId) return;

  try {
    const room = await prisma.room.findUnique({
      where:   { id: roomId },
      include: { property: true, beds: true },
    });

    if (!room) {
      res.status(404).json({ success: false, message: "Room not found" });
      return;
    }

    if (room.property.managerClerkId !== managerClerkId) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to manage this room",
      });
      return;
    }

    const blockingBeds = room.beds.filter(
      (b) => b.status === "OCCUPIED" || b.status === "RESERVED"
    );

    if (blockingBeds.length > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete room � ${blockingBeds.length} bed(s) are occupied or reserved`,
      });
      return;
    }

    await prisma.room.delete({ where: { id: roomId } });

    await logSystemEvent({
      action:  "HOSTEL_ROOM_DELETED",
      target:  `Room #${roomId} � ${room.roomNumber}`,
      details: `Deleted by ${managerClerkId}`,
    });

    res.status(200).json({
      success: true,
      message: "Room deleted successfully",
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.deleteRoom]", {
      roomId,
      managerClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// -----------------------------------------------------------------------------
//  UPDATE ROOM CAPACITY - MANAGER
//  PUT /api/hostels/rooms/:roomId/capacity
//
//  planCapacityChange (below) is a pure, no-database function shared by
//  this endpoint and the bulk capacity endpoints, so both always apply
//  the exact same safety rules and can never quietly drift apart.
//
//  Increasing capacity creates new beds using the lowest unused letters,
//  so gaps in existing bed labels (e.g. A, C with B missing) are filled
//  safely instead of risking a duplicate bedNumber.
//
//  Decreasing capacity removes only the highest-lettered beds, and only
//  if none of the beds being removed are OCCUPIED or RESERVED. The entire
//  operation is rejected if any targeted bed is blocking - never a partial
//  change. Blocked responses include which student/booking is occupying
//  the bed so the manager knows what to do next; audit logs record only
//  IDs, never student names, to avoid duplicating personal data into a
//  permanent record.
//
//  Bed changes and the capacity update happen in one transaction.
// -----------------------------------------------------------------------------
type CapacityBed = { id: number; bedNumber: string; status: string; currentBookingId: number | null };

type CapacityPlan =
  | { kind: "noChange" }
  | { kind: "increase"; newLabels: string[] }
  | { kind: "decrease"; toRemove: CapacityBed[] }
  | { kind: "blocked"; blockingBeds: CapacityBed[] };

const planCapacityChange = (beds: CapacityBed[], newCapacity: number): CapacityPlan => {
  const currentCapacity = beds.length;
  if (newCapacity === currentCapacity) return { kind: "noChange" };

  if (newCapacity > currentCapacity) {
    const existingLabels = new Set(beds.map((b) => b.bedNumber));
    const newLabels: string[] = [];
    let code = 65;
    while (newLabels.length < newCapacity - currentCapacity && code < 65 + 26) {
      const label = String.fromCharCode(code);
      if (!existingLabels.has(label)) newLabels.push(label);
      code++;
    }
    return { kind: "increase", newLabels };
  }

  const sortedBeds = [...beds].sort((a, b) => a.bedNumber.localeCompare(b.bedNumber));
  const toRemove = sortedBeds.slice(newCapacity);
  const blockingBeds = toRemove.filter((b) => b.status === "OCCUPIED" || b.status === "RESERVED");
  if (blockingBeds.length > 0) return { kind: "blocked", blockingBeds };
  return { kind: "decrease", toRemove };
};

const updateRoomCapacitySchema = z.object({
  capacity: z.number({ error: "capacity must be a number" }).int().positive().max(10, "capacity cannot exceed 10 beds per room"),
});

export const updateRoomCapacity = async (
  req: Request,
  res: Response<ApiResponse>
) : Promise<void> => {
  const managerClerkId = requireAuth(req, res);
  if (!managerClerkId) return;

  const roomId = getNumericParam(req.params.roomId, "roomId", res);
  if (!roomId) return;

  const parsed = updateRoomCapacitySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors:  formatZodErrors(parsed.error.issues),
    });
    return;
  }

  const { capacity: newCapacity } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const room = await tx.room.findUnique({
        where:   { id: roomId },
        include: { property: true, beds: true },
      });

      if (!room) {
        return { error: 404 as const, message: "Room not found" };
      }
      if (room.property.managerClerkId !== managerClerkId) {
        return { error: 403 as const, message: "You do not have permission to manage this room" };
      }

      const plan = planCapacityChange(room.beds, newCapacity);

      if (plan.kind === "noChange") {
        return { room, added: [] as string[], removed: [] as string[], noChange: true };
      }

      if (plan.kind === "increase") {
        await tx.bed.createMany({
          data: plan.newLabels.map((bedNumber) => ({ roomId: room.id, bedNumber })),
        });
        await tx.room.update({
          where: { id: room.id },
          data:  { capacity: newCapacity },
        });
        return { room, added: plan.newLabels, removed: [] as string[], noChange: false };
      }

      if (plan.kind === "blocked") {
        const occupantErrors = await Promise.all(
          plan.blockingBeds.map(async (b) => {
            let detail = b.status as string;
            if (b.currentBookingId) {
              const booking = await tx.semesterPlan.findUnique({
                where:  { id: b.currentBookingId },
                select: { studentClerkId: true, reference: true },
              });
              if (booking) {
                const student = await tx.user.findUnique({
                  where:  { clerkId: booking.studentClerkId },
                  select: { name: true },
                });
                detail = `${b.status} - ${student?.name ?? "student"} (Booking ${booking.reference})`;
              }
            }
            return { field: `Bed ${b.bedNumber}`, message: detail };
          })
        );
        return {
          error: 400 as const,
          message: `Cannot reduce capacity - ${plan.blockingBeds.length} bed${plan.blockingBeds.length === 1 ? "" : "s"} ${plan.blockingBeds.length === 1 ? "is" : "are"} occupied or reserved`,
          occupantErrors,
        };
      }

      await tx.bed.deleteMany({
        where: { id: { in: plan.toRemove.map((b) => b.id) } },
      });
      await tx.room.update({
        where: { id: room.id },
        data:  { capacity: newCapacity },
      });

      return { room, added: [] as string[], removed: plan.toRemove.map((b) => b.bedNumber), noChange: false };
    });

    if ("error" in result) {
      res.status(result.error).json({
        success: false,
        message: result.message,
        ...("occupantErrors" in result ? { errors: result.occupantErrors } : {}),
      });
      return;
    }

    if (!result.noChange) {
      await logSystemEvent({
        action:  "HOSTEL_ROOM_CAPACITY_UPDATED",
        target:  `Room #${roomId} - ${result.room.roomNumber}`,
        details: JSON.stringify({
          roomId,
          roomNumber:  result.room.roomNumber,
          oldCapacity: result.room.beds.length,
          newCapacity,
          bedsAdded:   result.added,
          bedsRemoved: result.removed,
          performedBy: managerClerkId,
        }),
      });
    }

    res.status(200).json({
      success: true,
      message: "Room capacity updated successfully",
      data: {
        roomId,
        capacity: newCapacity,
        added:    result.added,
        removed:  result.removed,
      },
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.updateRoomCapacity]", {
      roomId,
      managerClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// -----------------------------------------------------------------------------
//  UPDATE BED STATUS � MANAGER
//  PUT /api/hostels/beds/:bedId/status
//
//  Manager marks a bed under maintenance, or brings it back to available.
//  Cannot be used to directly set OCCUPIED or RESERVED � those states are
//  only ever set by the booking/approval flow itself, never by hand,
//  to keep bed status and booking records from drifting apart.
// -----------------------------------------------------------------------------

const updateBedStatusSchema = z.object({
  status: z.enum(["AVAILABLE", "MAINTENANCE"], {
    error: "status must be AVAILABLE or MAINTENANCE",
  }),
});

export const updateBedStatus = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const managerClerkId = requireAuth(req, res);
  if (!managerClerkId) return;
  const bedId = getNumericParam(req.params.bedId, "bedId", res);
  if (!bedId) return;
  const parsed = updateBedStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors:  formatZodErrors(parsed.error.issues),
    });
    return;
  }
  const { status } = parsed.data;
  try {
    const bed = await prisma.bed.findUnique({
      where:   { id: bedId },
      include: { room: { include: { property: true } } },
    });
    if (!bed) {
      res.status(404).json({ success: false, message: "Bed not found" });
      return;
    }
    if (bed.room.property.managerClerkId !== managerClerkId) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to manage this bed",
      });
      return;
    }

    // A retired bed is permanently out of service. Block ALL status
    // changes here, regardless of what was requested. Un-retiring is a
    // deliberate separate action, not something that should ever happen
    // as a side effect of the ordinary maintenance toggle.
    if (bed.isRetired) {
      res.status(400).json({
        success: false,
        message: "This bed is retired and permanently out of service. Its status cannot be changed.",
      });
      return;
    }

    // No-op: requested status already matches current status - nothing to do.
    if (bed.status === status) {
      res.status(200).json({
        success: true,
        message: `Bed is already ${status.toLowerCase()}`,
        data:    bed,
      });
      return;
    }

    // Fast-path check for the common case (no race in progress).
    // The updateMany below performs the real, atomic safety check -
    // this just gives a friendly early message most of the time.
    if (bed.status === "OCCUPIED" || bed.status === "RESERVED") {
      res.status(400).json({
        success: false,
        message: `Cannot change status - bed is currently ${bed.status.toLowerCase()} by an active booking`,
      });
      return;
    }

    // Atomic conditional update: only succeeds if the bed status still
    // matches what was just read. If a booking changed it in the meantime
    // (e.g. AVAILABLE -> RESERVED), count will be 0 and we reject cleanly.
    const updateResult = await prisma.bed.updateMany({
      where: { id: bedId, status: bed.status },
      data:  { status },
    });

    if (updateResult.count === 0) {
      res.status(409).json({
        success: false,
        message: "Bed status just changed. Please refresh and try again.",
      });
      return;
    }

    await prisma.bedStatusHistory.create({
      data: {
        bedId:       bedId,
        oldStatus:   bed.status,
        newStatus:   status,
        action:      "HOSTEL_BED_STATUS_UPDATED",
        performedBy: managerClerkId,
      },
    });

    const updated = await prisma.bed.findUnique({ where: { id: bedId } });

    await logUserEvent({
      userClerkId: managerClerkId,
      action:  "HOSTEL_BED_STATUS_UPDATED",
      target:  `Bed #${bedId} - Room #${bed.roomId}`,
      details: `${bed.status} -> ${status} by ${managerClerkId}`,
    });

    res.status(200).json({
      success: true,
      message: "Bed status updated successfully",
      data:    updated,
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.updateBedStatus]", {
      bedId,
      managerClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// -----------------------------------------------------------------------------
//  BED TRANSFER - MANAGER
//
//  Moves a currently occupied student from one bed to another, keeping the
//  same booking (never creates a new one) and leaving a permanent, append-
//  only transfer record. The target bed is claimed atomically - same proven
//  conditional-update pattern used by every other Step 4 fix tonight.
// -----------------------------------------------------------------------------
const transferBedSchema = z.object({
  bookingId:    z.number({ error: "bookingId must be a number" }).int().positive(),
  targetBedId:  z.number({ error: "targetBedId must be a number" }).int().positive(),
  reason:       z.enum(["ROOM_MAINTENANCE", "STUDENT_REQUEST", "OCCUPANCY_REBALANCING", "ACCESSIBILITY", "DISCIPLINARY", "OTHER"]),
  reasonNote:   z.string().max(500).optional(),
  oldBedStatus: z.enum(["AVAILABLE", "MAINTENANCE"], { error: "oldBedStatus must be AVAILABLE or MAINTENANCE" }),
}).refine(
  (data) => data.reason !== "OTHER" || (data.reasonNote && data.reasonNote.trim().length > 0),
  { message: "reasonNote is required when reason is OTHER", path: ["reasonNote"] }
);

// GET /api/hostels/beds/:bedId/transfer-info
// Read-only. Resolves the student real name and current location for an
// occupied bed, so the manager UI never shows a raw Clerk ID.
export const getBedTransferInfo = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const managerClerkId = requireAuth(req, res);
  if (!managerClerkId) return;

  const bedId = getNumericParam(req.params.bedId, "bedId", res);
  if (!bedId) return;

  try {
    const bed = await prisma.bed.findUnique({
      where:   { id: bedId },
      include: { room: { include: { property: true } } },
    });

    if (!bed) {
      res.status(404).json({ success: false, message: "Bed not found" });
      return;
    }
    if (bed.room.property.managerClerkId !== managerClerkId) {
      res.status(403).json({ success: false, message: "You do not have permission to manage this bed" });
      return;
    }
    if (bed.status !== "OCCUPIED" || !bed.currentBookingId) {
      res.status(400).json({ success: false, message: "This bed is not currently occupied - nothing to transfer" });
      return;
    }

    const booking = await prisma.semesterPlan.findUnique({ where: { id: bed.currentBookingId } });
    if (!booking) {
      res.status(404).json({ success: false, message: "Booking not found for this bed" });
      return;
    }

    const student = await prisma.user.findUnique({
      where:  { clerkId: booking.studentClerkId },
      select: { name: true },
    });

    res.status(200).json({
      success: true,
      message: "Transfer info retrieved successfully",
      data: {
        bookingId:         booking.id,
        studentName:       student?.name ?? "Unknown student",
        currentRoomNumber: bed.room.roomNumber,
        currentBedNumber:  bed.bedNumber,
        currentBedId:      bed.id,
        propertyId:        bed.room.propertyId,
      },
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.getBedTransferInfo]", {
      bedId,
      managerClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// POST /api/hostels/bed-transfers
export const transferBed = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const managerClerkId = requireAuth(req, res);
  if (!managerClerkId) return;

  const parsed = transferBedSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors:  formatZodErrors(parsed.error.issues),
    });
    return;
  }

  const { bookingId, targetBedId, reason, reasonNote, oldBedStatus } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.semesterPlan.findUnique({ where: { id: bookingId } });
      if (!booking) {
        return { error: 404 as const, message: "Booking not found" };
      }

      const property = await tx.property.findFirst({
        where: { id: booking.propertyId, managerClerkId, deletedAt: null },
      });
      if (!property) {
        return { error: 403 as const, message: "You do not have permission to manage this booking" };
      }

      if (!booking.bedId) {
        return { error: 400 as const, message: "This booking has no current bed - cannot transfer" };
      }

      const sourceBed = await tx.bed.findUnique({
        where:   { id: booking.bedId },
        include: { room: true },
      });
      if (!sourceBed || sourceBed.currentBookingId !== booking.id) {
        return { error: 400 as const, message: "Source bed no longer matches this booking - cannot transfer" };
      }
      if (sourceBed.status !== "OCCUPIED") {
        return { error: 400 as const, message: `Cannot transfer - source bed is currently ${sourceBed.status.toLowerCase()}, not occupied` };
      }

      if (targetBedId === sourceBed.id) {
        return { error: 400 as const, message: "Target bed must be different from the current bed" };
      }

      const targetBed = await tx.bed.findUnique({
        where:   { id: targetBedId, room: { isActive: true } },
        include: { room: true },
      });
      if (!targetBed) {
        return { error: 404 as const, message: "Target bed not found" };
      }
      if (targetBed.room.propertyId !== booking.propertyId) {
        return { error: 403 as const, message: "Target bed does not belong to this hostel" };
      }

      // Atomic claim: only succeeds if the target bed is still AVAILABLE
      // at this exact moment. count === 0 means someone else took it first.
      const claimResult = await tx.bed.updateMany({
        where: { id: targetBedId, status: "AVAILABLE" },
        data:  { status: "OCCUPIED", currentBookingId: booking.id },
      });
      if (claimResult.count === 0) {
        return { error: 409 as const, message: "Target bed is no longer available. Please choose another bed." };
      }

      await tx.semesterPlan.update({
        where: { id: bookingId },
        data:  { bedId: targetBedId, roomNumber: targetBed.room.roomNumber },
      });

      await tx.bed.update({
        where: { id: sourceBed.id },
        data:  { status: oldBedStatus as BedStatus, currentBookingId: null },
      });

      await tx.bedStatusHistory.create({
        data: {
          bedId:       targetBed.id,


          bookingId:       booking.id,
          bookingReference: booking.reference,
          oldStatus:   "AVAILABLE",
          newStatus:   "OCCUPIED",
          action:      "HOSTEL_BED_TRANSFER",
          performedBy: managerClerkId,
        },
      });

      await tx.bedStatusHistory.create({
        data: {
          bedId:       sourceBed.id,
bookingId:       booking.id,
          bookingReference: booking.reference,
                    oldStatus:   "OCCUPIED",
          newStatus:   oldBedStatus,
          action:      "HOSTEL_BED_TRANSFER",
          performedBy: managerClerkId,
        },
      });

      const transfer = await tx.bedTransfer.create({
        data: {
          bookingId:      booking.id,
          propertyId:     booking.propertyId,
          studentClerkId: booking.studentClerkId,
          fromBedId:      sourceBed.id,
          fromRoomNumber: sourceBed.room.roomNumber,
          fromBedNumber:  sourceBed.bedNumber,
          toBedId:        targetBed.id,
          toRoomNumber:   targetBed.room.roomNumber,
          toBedNumber:    targetBed.bedNumber,
          reason:         reason as TransferReason,
          reasonNote:     reasonNote ?? null,
          oldBedStatus:   oldBedStatus as BedStatus,
          performedBy:    managerClerkId,
        },
      });

      return { transfer, sourceBed, targetBed };
    });

    if ("error" in result) {
      res.status(result.error).json({ success: false, message: result.message });
      return;
    }

    await logUserEvent({
      userClerkId: managerClerkId,
      action:  "HOSTEL_BED_TRANSFER",
      target:  `SemesterPlan #${bookingId}`,
      details: `Transferred from ${result.sourceBed.room.roomNumber}/${result.sourceBed.bedNumber} to ${result.targetBed.room.roomNumber}/${result.targetBed.bedNumber} by ${managerClerkId}. Reason: ${reason}.`,
    });

    res.status(201).json({
      success: true,
      message: "Student transferred successfully",
      data:    result.transfer,
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.transferBed]", {
      bookingId,
      targetBedId,
      managerClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// -----------------------------------------------------------------------------
//  RECORD CHECK-IN - MANAGER
//  PUT /api/hostels/bookings/:bookingId/check-in
//
//  Records that a student has physically arrived, separate from booking
//  approval (which already sets the bed to OCCUPIED). Does not touch bed
//  status or approval logic at all - purely a factual record. Idempotent:
//  the atomic update only succeeds if checkedInAt is still null, so a
//  double-click or two managers acting at once can never silently
//  overwrite the true original check-in record.
// -----------------------------------------------------------------------------
export const recordCheckIn = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const managerClerkId = requireAuth(req, res);
  if (!managerClerkId) return;

  const bookingId = getNumericParam(req.params.bookingId, "bookingId", res);
  if (!bookingId) return;

  try {
    const booking = await prisma.semesterPlan.findUnique({ where: { id: bookingId } });
    if (!booking) {
      res.status(404).json({ success: false, message: "Booking not found" });
      return;
    }

    const property = await prisma.property.findFirst({
      where: { id: booking.propertyId, managerClerkId, deletedAt: null },
    });
    if (!property) {
      res.status(403).json({ success: false, message: "You do not have permission to manage this booking" });
      return;
    }

    if (booking.status !== "ACTIVE") {
      res.status(400).json({ success: false, message: `Cannot check in - booking status is ${booking.status.toLowerCase()}, not active` });
      return;
    }

    // Atomic + idempotent: only succeeds if checkedInAt is still null.
    // count === 0 means it was already recorded - we fetch and return
    // the original record instead of silently overwriting it.
    const now = new Date();
    const result = await prisma.semesterPlan.updateMany({
      where: { id: bookingId, checkedInAt: null },
      data:  { checkedInAt: now, checkedInBy: managerClerkId },
    });

    if (result.count === 0) {
      const existing = await prisma.semesterPlan.findUnique({
        where:  { id: bookingId },
        select: { checkedInAt: true, checkedInBy: true },
      });
      res.status(200).json({
        success: true,
        message: "Already checked in",
        data:    existing,
      });
      return;
    }

    await logUserEvent({
      userClerkId: managerClerkId,
      action:  "HOSTEL_STUDENT_CHECKED_IN",
      target:  `SemesterPlan #${bookingId}`,
      details: `Checked in at ${now.toISOString()} by ${managerClerkId}`,
    });

    res.status(200).json({
      success: true,
      message: "Check-in recorded successfully",
      data:    { checkedInAt: now, checkedInBy: managerClerkId },
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.recordCheckIn]", {
      bookingId,
      managerClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// -----------------------------------------------------------------------------
//  NO-SHOW CANDIDATES - MANAGER (read-only)
//  GET /api/hostels/:propertyId/no-show-candidates
//
//  Lists ACTIVE bookings whose check-in date has passed but were never
//  checked in. Informational only - never auto-cancels anything. The
//  manager decides what to do with each one.
// -----------------------------------------------------------------------------
export const getNoShowCandidates = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const managerClerkId = requireAuth(req, res);
  if (!managerClerkId) return;

  const propertyId = getNumericParam(req.params.propertyId, "propertyId", res);
  if (!propertyId) return;

  try {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, managerClerkId, deletedAt: null },
    });
    if (!property) {
      res.status(404).json({ success: false, message: "Hostel not found or you do not have permission" });
      return;
    }

    const candidates = await prisma.semesterPlan.findMany({
      where: {
        propertyId,
        status: "ACTIVE",
        checkIn: { lt: new Date() },
        checkedInAt: null,
        noShowMarkedAt: null,
      },
      orderBy: { checkIn: "asc" },
    });

    const withNames = await Promise.all(
      candidates.map(async (c) => {
        const student = await prisma.user.findUnique({
          where:  { clerkId: c.studentClerkId },
          select: { name: true, phoneNumber: true },
        });
        return {
          bookingId:   c.id,
          studentName: student?.name ?? "Unknown student",
          studentPhone: student?.phoneNumber ?? null,
          roomNumber:  c.roomNumber,
          checkIn:     c.checkIn,
          reference:   c.reference,
        };
      })
    );

    res.status(200).json({
      success: true,
      message: `${withNames.length} no-show candidate(s) found`,
      data:    withNames,
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.getNoShowCandidates]", {
      propertyId,
      managerClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// -----------------------------------------------------------------------------
//  MARK NO-SHOW - MANAGER
//  PUT /api/hostels/bookings/:bookingId/no-show
//
//  Manager's deliberate decision - never automatic. Idempotent, same
//  atomic pattern as check-in: only succeeds if noShowMarkedAt is still
//  null. Does not touch the bed or booking status - purely a factual
//  flag for the manager to act on separately.
// -----------------------------------------------------------------------------
export const markNoShow = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const managerClerkId = requireAuth(req, res);
  if (!managerClerkId) return;

  const bookingId = getNumericParam(req.params.bookingId, "bookingId", res);
  if (!bookingId) return;

  try {
    const booking = await prisma.semesterPlan.findUnique({ where: { id: bookingId } });
    if (!booking) {
      res.status(404).json({ success: false, message: "Booking not found" });
      return;
    }

    const property = await prisma.property.findFirst({
      where: { id: booking.propertyId, managerClerkId, deletedAt: null },
    });
    if (!property) {
      res.status(403).json({ success: false, message: "You do not have permission to manage this booking" });
      return;
    }

    if (booking.checkedInAt) {
      res.status(400).json({ success: false, message: "Cannot mark as no-show - this student has already checked in" });
      return;
    }

    const result = await prisma.semesterPlan.updateMany({
      where: { id: bookingId, noShowMarkedAt: null },
      data:  { noShowMarkedAt: new Date() },
    });

    if (result.count === 0) {
      res.status(200).json({ success: true, message: "Already marked as no-show" });
      return;
    }

    await logUserEvent({
      userClerkId: managerClerkId,
      action:  "HOSTEL_BOOKING_NO_SHOW_MARKED",
      target:  `SemesterPlan #${bookingId}`,
      details: `Marked as no-show by ${managerClerkId}`,
    });

    res.status(200).json({
      success: true,
      message: "Marked as no-show",
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.markNoShow]", {
      bookingId,
      managerClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// -----------------------------------------------------------------------------
//  RETIRE BED - MANAGER
//  PUT /api/hostels/beds/:bedId/retire
//
//  Permanently takes a bed out of service. Never deletes the row - keeps
//  its permanent ID so historical bookings/transfers referencing it stay
//  valid. Force-sets status to MAINTENANCE so every existing availability
//  check (booking, transfer) automatically excludes it without needing
//  any changes to that code. Cannot retire a bed with an active student.
// -----------------------------------------------------------------------------
const retireBedSchema = z.object({
  reason: z.string().min(1, "reason is required").max(500),
});

export const retireBed = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const managerClerkId = requireAuth(req, res);
  if (!managerClerkId) return;

  const bedId = getNumericParam(req.params.bedId, "bedId", res);
  if (!bedId) return;

  const parsed = retireBedSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors:  formatZodErrors(parsed.error.issues),
    });
    return;
  }

  try {
    const bed = await prisma.bed.findUnique({
      where:   { id: bedId },
      include: { room: { include: { property: true } } },
    });
    if (!bed) {
      res.status(404).json({ success: false, message: "Bed not found" });
      return;
    }
    if (bed.room.property.managerClerkId !== managerClerkId) {
      res.status(403).json({ success: false, message: "You do not have permission to manage this bed" });
      return;
    }
    if (bed.status === "OCCUPIED" || bed.status === "RESERVED") {
      res.status(400).json({
        success: false,
        message: `Cannot retire - bed is currently ${bed.status.toLowerCase()} by an active booking`,
      });
      return;
    }

    const result = await prisma.bed.updateMany({
      where: { id: bedId, isRetired: false },
      data: {
        isRetired:     true,
        retiredAt:     new Date(),
        retiredReason: parsed.data.reason,
        retiredBy:     managerClerkId,
        status:        "MAINTENANCE",
      },
    });

    if (result.count === 0) {
      res.status(200).json({ success: true, message: "Bed is already retired" });
      return;
    }

    await prisma.bedStatusHistory.create({
      data: {
        bedId:       bedId,
        oldStatus:   bed.status,
        newStatus:   "MAINTENANCE",
        action:      "HOSTEL_BED_RETIRED",
        performedBy: managerClerkId,
      },
    });

    await logUserEvent({
      userClerkId: managerClerkId,
      action:  "HOSTEL_BED_RETIRED",
      target:  `Bed #${bedId} - Room #${bed.roomId}`,
      details: `Retired by ${managerClerkId}. Reason: ${parsed.data.reason}`,
    });

    res.status(200).json({
      success: true,
      message: "Bed retired successfully",
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.retireBed]", {
      bedId,
      managerClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// -----------------------------------------------------------------------------
//  BED STATUS HISTORY - MANAGER (read-only)
//  GET /api/hostels/beds/:bedId/history
//
//  Returns the full recorded history for a single bed. Data has been
//  written since the bed-history wiring was completed; this is the first
//  endpoint that actually reads it back.
// -----------------------------------------------------------------------------
export const getBedStatusHistory = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const managerClerkId = requireAuth(req, res);
  if (!managerClerkId) return;

  const bedId = getNumericParam(req.params.bedId, "bedId", res);
  if (!bedId) return;

  try {
    const bed = await prisma.bed.findUnique({
      where:   { id: bedId },
      include: { room: { include: { property: true } } },
    });
    if (!bed) {
      res.status(404).json({ success: false, message: "Bed not found" });
      return;
    }
    if (bed.room.property.managerClerkId !== managerClerkId) {
      res.status(403).json({ success: false, message: "You do not have permission to view this bed history" });
      return;
    }

    const history = await prisma.bedStatusHistory.findMany({
      where: { bedId },
      orderBy: { createdAt: "desc" },
    });


    // Resolve actor Clerk IDs to real names for display, without
    // ever changing the stored performedBy field - one batch query
    // for all unique actors, not N+1 per entry.
    const uniqueActorIds = [...new Set(history.map((h) => h.performedBy))];
    const actors = await prisma.user.findMany({
      where:  { clerkId: { in: uniqueActorIds } },
      select: { clerkId: true, name: true },
    });
    const actorMap = new Map(actors.map((a) => [a.clerkId, a.name]));

    const historyWithActorNames = history.map((h) => ({
      ...h,
      actorName: actorMap.get(h.performedBy) ?? h.performedBy,
    }));

    res.status(200).json({
      success: true,
      message: `${history.length} history entries found`,
      data: historyWithActorNames,
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.getBedStatusHistory]", {
      bedId,
      managerClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// -----------------------------------------------------------------------------
//  MANAGER ACTIVITY LOG
//  GET /api/hostels/:propertyId/activity
//
//  Manager-only view into their own hostel actions. Reuses the existing
//  admin audit table - filters to entries where THIS manager is the real
//  performer (identity from the verified token, never trusted from the
//  request), which naturally scopes results to their own hostel actions
//  since every logged action already required ownership verification.
// -----------------------------------------------------------------------------
export const getManagerActivityLog = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const managerClerkId = requireAuth(req, res);
  if (!managerClerkId) return;

  const propertyId = getNumericParam(req.params.propertyId, "propertyId", res);
  if (!propertyId) return;

  const page  = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Number(req.query.limit) || 20);
  const skip  = (page - 1) * limit;

  try {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, managerClerkId, deletedAt: null },
    });
    if (!property) {
      res.status(404).json({ success: false, message: "Hostel not found or you do not have permission" });
      return;
    }

    const where = {
      action:  { startsWith: "HOSTEL_" },
      details: { contains: managerClerkId },
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      message: "Activity log retrieved",
      data: { logs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.getManagerActivityLog]", {
      propertyId,
      managerClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// -----------------------------------------------------------------------------
//  INITIALIZE HOSTEL PAYMENT - STUDENT
//  POST /api/hostels/bookings/:bookingId/pay
//
//  Mirrors the proven Rent payment-initiation pattern exactly (see
//  paymentControllers.initializePayment), extended for SemesterPlan instead
//  of Lease. The amount charged is ALWAYS booking.amountPaid - the real
//  Step 8/11 price snapshot captured at booking creation time. Never
//  recalculated here, never trusted from the request body.
// -----------------------------------------------------------------------------
export const initializeHostelPayment = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const studentClerkId = requireAuth(req, res);
  if (!studentClerkId) return;

  const bookingId = getNumericParam(req.params.bookingId, "bookingId", res);
  if (!bookingId) return;

  const { email } = req.body;
  if (!email) {
    res.status(400).json({ success: false, message: "email is required" });
    return;
  }

  try {
    const booking = await prisma.semesterPlan.findUnique({
      where:   { id: bookingId },
      include: { property: true },
    });

    if (!booking) {
      res.status(404).json({ success: false, message: "Booking not found" });
      return;
    }

    if (booking.studentClerkId !== studentClerkId) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }

    if (booking.status !== "AWAITING_PAYMENT") {
      res.status(400).json({
        success: false,
        message: `This booking is not awaiting payment (current status: ${booking.status.toLowerCase()})`,
      });
      return;
    }

    if (booking.paymentDueAt && new Date() > booking.paymentDueAt) {
      res.status(400).json({ success: false, message: "The payment window for this booking has expired" });
      return;
    }

    const amount = booking.amountPaid;
    const reference = generateReference(booking.id, "HOSTEL");

    const data = await paystackInitialize({
      email,
      amount,
      reference,
      metadata: {
        semesterPlanId: booking.id,
        propertyId:     booking.propertyId,
        studentClerkId: booking.studentClerkId,
        propertyName:   booking.property?.name          ?? "Hostel",
        managerClerkId: booking.property?.managerClerkId ?? "",
      },
    });

    await prisma.transaction.create({
      data: {
        paystackReference: reference,
        amount,
        currency:          "GHS",
        status:             "Pending",
        type:               "HostelPayment",
        tenantClerkId:      booking.studentClerkId,
        semesterPlanId:     booking.id,
        metadata:           { semesterPlanId: booking.id, propertyId: booking.propertyId },
      },
    });

    await logUserEvent({
      userClerkId: studentClerkId,
      action:      "HOSTEL_PAYMENT_INITIALIZED",
      target:      `SemesterPlan #${booking.id}`,
      details:     `ref: ${reference}, amount: GHS ${amount}`,
    });

    res.status(200).json({ success: true, message: "Payment initialized", data });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.initializeHostelPayment]", {
      bookingId,
      studentClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Failed to initialize payment" });
  }
};
// -----------------------------------------------------------------------------
//  CANCEL BOOKING - STUDENT / MANAGER / ADMIN
//  PUT /api/hostels/bookings/:bookingId/cancel
//
//  Locked policy (Derrick, Step 12):
//    - Student may cancel while PENDING_APPROVAL or AWAITING_PAYMENT only.
//    - Manager/Admin may cancel PENDING_APPROVAL, AWAITING_PAYMENT, or ACTIVE.
//    - No automated Paystack refund here - the reason field is where a
//      human-controlled refund decision gets recorded for now.
//    - Terminal statuses (REJECTED, EXPIRED, COMPLETED, CANCELLED) can
//      never be cancelled again.
// -----------------------------------------------------------------------------
//  GET BOOKING TIMELINE - STUDENT / MANAGER / ADMIN
//  GET /api/hostels/bookings/:bookingId/timeline
//
//  The real, queryable, ordered history of every transition this booking
//  has actually gone through - reads BookingTransitionHistory, written
//  exclusively by the centralized transitionBooking() service. No
//  fabricated events - if a step never happened, it is simply absent.
// -----------------------------------------------------------------------------
export const getBookingTimeline = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const callerClerkId = requireAuth(req, res);
  if (!callerClerkId) return;

  const bookingId = getNumericParam(req.params.bookingId, "bookingId", res);
  if (!bookingId) return;

  try {
    const booking = await prisma.semesterPlan.findUnique({
      where:   { id: bookingId },
      include: { property: true },
    });

    if (!booking) {
      res.status(404).json({ success: false, message: "Booking not found" });
      return;
    }

    const isStudent = booking.studentClerkId === callerClerkId;
    const isManager = booking.property.managerClerkId === callerClerkId;

    let isAdmin = false;
    if (!isStudent && !isManager) {
      const user = await prisma.user.findUnique({ where: { clerkId: callerClerkId } });
      isAdmin = user?.role === "ADMIN";
    }

    if (!isStudent && !isManager && !isAdmin) {
      res.status(403).json({ success: false, message: "You do not have permission to view this booking's timeline" });
      return;
    }

    const events = await prisma.bookingTransitionHistory.findMany({
      where:   { bookingId },
      orderBy: { createdAt: "asc" },
    });

    const actorIds = Array.from(new Set(events.map((e) => e.actorClerkId).filter((id) => id !== "system")));
    const actors = actorIds.length > 0
      ? await prisma.user.findMany({ where: { clerkId: { in: actorIds } }, select: { clerkId: true, name: true } })
      : [];
    const actorMap = new Map(actors.map((a) => [a.clerkId, a.name]));

    const enrichedEvents = events.map((e) => ({
      ...e,
      actorName: e.actorClerkId === "system" ? "System" : (actorMap.get(e.actorClerkId) ?? "Unknown"),
    }));

    res.status(200).json({
      success: true,
      message: "Booking timeline retrieved",
      data: {
        booking: { id: booking.id, reference: booking.reference, status: booking.status },
        events:  enrichedEvents,
      },
    });
  } catch (error) {
    console.error("[hostelControllers.getBookingTimeline]", {
      bookingId,
      callerClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
// -----------------------------------------------------------------------------
export const cancelBooking = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const callerClerkId = requireAuth(req, res);
  if (!callerClerkId) return;

  const bookingId = getNumericParam(req.params.bookingId, "bookingId", res);
  if (!bookingId) return;

  const { reason } = req.body;
  if (!reason || typeof reason !== "string" || reason.trim().length < 3) {
    res.status(400).json({ success: false, message: "A cancellation reason is required" });
    return;
  }

  try {
    const booking = await prisma.semesterPlan.findUnique({
      where:   { id: bookingId },
      include: { property: true },
    });

    if (!booking) {
      res.status(404).json({ success: false, message: "Booking not found" });
      return;
    }

    const isStudent = booking.studentClerkId === callerClerkId;
    const isManager = booking.property.managerClerkId === callerClerkId;

    let isAdmin = false;
    if (!isStudent && !isManager) {
      const user = await prisma.user.findUnique({ where: { clerkId: callerClerkId } });
      isAdmin = user?.role === "ADMIN";
    }

    if (!isStudent && !isManager && !isAdmin) {
      res.status(403).json({ success: false, message: "You do not have permission to cancel this booking" });
      return;
    }

    if (["REJECTED", "EXPIRED", "COMPLETED", "CANCELLED"].includes(booking.status)) {
      res.status(400).json({
        success: false,
        message: "This booking has already been " + booking.status.toLowerCase() + " and cannot be cancelled",
      });
      return;
    }

    if (isStudent && !isManager && !isAdmin) {
      if (booking.status !== "PENDING_APPROVAL" && booking.status !== "AWAITING_PAYMENT") {
        res.status(400).json({
          success: false,
          message: "You can only cancel a booking before payment. Please contact the hostel manager for help with this booking.",
        });
        return;
      }
    }

    const previousStatus = booking.status;
    const actorRole = isAdmin ? "ADMIN" : isManager ? "MANAGER" : "STUDENT";

    const result = await prisma.$transaction(async (tx) => {
      const updated = await transitionBooking(tx, {
        bookingId: bookingId,
        toStatus: "CANCELLED",
        actorClerkId: callerClerkId,
        actorRole: actorRole,
        reason: reason.trim(),
        extraData: {
          cancelledAt: new Date(),
          cancelledBy: callerClerkId,
          cancellationReason: reason.trim(),
        },
      });

      if (booking.bedId) {
        const bed = await tx.bed.findUnique({ where: { id: booking.bedId } });
        if (bed && (bed.status === "RESERVED" || bed.status === "OCCUPIED")) {
          await tx.bed.update({
            where: { id: booking.bedId },
            data:  { status: "AVAILABLE", currentBookingId: null },
          });

          await tx.bedStatusHistory.create({
            data: {
              bedId:            booking.bedId,
              bookingId:        booking.id,
              bookingReference: booking.reference,
              oldStatus:        bed.status,
              newStatus:        "AVAILABLE",
              action:           "HOSTEL_BOOKING_CANCELLED",
              performedBy:      callerClerkId,
            },
          });
        }
      }

      return updated;
    });

    await logUserEvent({
      userClerkId: callerClerkId,
      action:      "HOSTEL_BOOKING_CANCELLED",
      target:      "SemesterPlan #" + bookingId,
      details:     "Cancelled by " + actorRole + ". Previous status: " + previousStatus + ". Reason: " + reason.trim(),
    });

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data:    result,
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.cancelBooking]", {
      bookingId,
      callerClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
// -----------------------------------------------------------------------------
//  APPROVE BOOKING � MANAGER
//  PUT /api/hostels/bookings/:bookingId/approve
//
//  Manager reviews a pending booking and confirms it. Runs as one atomic
//  transaction, checking in order: booking exists ? not already decided
//  ? bed still reserved for this exact booking ? hostel still active ?
//  only then approve. This ordering prevents race conditions where two
//  nearly-simultaneous actions could both succeed.
// -----------------------------------------------------------------------------

export const approveBooking = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const managerClerkId = requireAuth(req, res);
  if (!managerClerkId) return;

  const bookingId = getNumericParam(req.params.bookingId, "bookingId", res);
  if (!bookingId) return;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.semesterPlan.findUnique({
        where:   { id: bookingId },
        include: { property: true, bed: true },
      });

      if (!booking) {
        return { error: 404 as const, message: "Booking not found" };
      }

      if (booking.property.managerClerkId !== managerClerkId) {
        return { error: 403 as const, message: "You do not have permission to manage this booking" };
      }

      if (booking.status !== "PENDING_APPROVAL") {
        return { error: 400 as const, message: `Booking has already been ${booking.status.toLowerCase()}` };
      }

      if (!booking.bed || booking.bed.status !== "RESERVED") {
        return { error: 400 as const, message: "Bed is no longer reserved for this booking � cannot approve" };
      }

      if (booking.property.isArchived || booking.property.deletedAt) {
        return { error: 400 as const, message: "This hostel is no longer active � cannot approve booking" };
      }

      // Approval moves the booking to AWAITING_PAYMENT with a real deadline.
      // The bed deliberately stays RESERVED here - it does NOT become
      // OCCUPIED until payment actually succeeds (webhook-verified). This
      // keeps the manager's bed inventory truthful: OCCUPIED means someone
      // genuinely paid, not merely that a manager clicked approve. If
      // payment is never completed, the expiry job releases the bed back
      // to AVAILABLE with nothing further to undo here.
      const paymentDueAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const updatedBooking = await transitionBooking(tx, {
        bookingId: bookingId,
        toStatus: "AWAITING_PAYMENT",
        actorClerkId: managerClerkId,
        actorRole: "MANAGER",
        extraData: { paymentDueAt },
      });

      return { booking: updatedBooking };
    });

    if ("error" in result) {
      res.status(result.error).json({ success: false, message: result.message });
      return;
    }

    await logSystemEvent({
      action:  "HOSTEL_BOOKING_APPROVED",
      target:  `SemesterPlan #${bookingId}`,
      details: `Approved by ${managerClerkId}`,
    });

    await recordEvent({
      eventType:      "BOOKING_APPROVED",
      entityType:     "SemesterPlan",
      entityId:       bookingId,
      idempotencyKey: `BOOKING_APPROVED:${bookingId}`,
      payload: {
        userClerkId: result.booking.studentClerkId,
        bookingId,
        actionUrl: `/tenants/bookings/${bookingId}`,
      },
    });
    void runNotificationProcessorOnce();

    res.status(200).json({
      success: true,
      message: "Booking approved successfully",
      data:    result.booking,
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.approveBooking]", {
      bookingId,
      managerClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// -----------------------------------------------------------------------------
//  REJECT BOOKING � MANAGER
//  PUT /api/hostels/bookings/:bookingId/reject
//
//  Manager declines a pending booking. Bed returns to AVAILABLE so
//  another student can book it. Refund handling (if payment was already
//  taken) happens outside this function, via the existing payment system.
// -----------------------------------------------------------------------------

const rejectBookingSchema = z.object({
  reason: z.string().min(5, "reason must be at least 5 characters").max(500),
});

export const rejectBooking = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const managerClerkId = requireAuth(req, res);
  if (!managerClerkId) return;

  const bookingId = getNumericParam(req.params.bookingId, "bookingId", res);
  if (!bookingId) return;

  const parsed = rejectBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors:  formatZodErrors(parsed.error.issues),
    });
    return;
  }

  const { reason } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.semesterPlan.findUnique({
        where:   { id: bookingId },
        include: { property: true },
      });

      if (!booking) {
        return { error: 404 as const, message: "Booking not found" };
      }

      if (booking.property.managerClerkId !== managerClerkId) {
        return { error: 403 as const, message: "You do not have permission to manage this booking" };
      }

      if (booking.status !== "PENDING_APPROVAL") {
        return { error: 400 as const, message: `Booking has already been ${booking.status.toLowerCase()}` };
      }

      const updatedBooking = await transitionBooking(tx, {
        bookingId: bookingId,
        toStatus: "REJECTED",
        actorClerkId: managerClerkId,
        actorRole: "MANAGER",
        reason,
      });

      if (booking.bedId) {
        await tx.bed.update({
          where: { id: booking.bedId },
          data:  { status: "AVAILABLE", currentBookingId: null },
        });

        await tx.bedStatusHistory.create({
          data: {
            bedId:       booking.bedId,

            bookingId:       booking.id,
            bookingReference: booking.reference,
            oldStatus:   "RESERVED",
            newStatus:   "AVAILABLE",
            action:      "HOSTEL_BOOKING_REJECTED",
            performedBy: managerClerkId,
          },
        });
      }

      return { booking: updatedBooking };
    });

    if ("error" in result) {
      res.status(result.error).json({ success: false, message: result.message });
      return;
    }

    await logSystemEvent({
      action:  "HOSTEL_BOOKING_REJECTED",
      target:  `SemesterPlan #${bookingId}`,
      details: `Rejected by ${managerClerkId}. Reason: ${reason}`,
    });

    await recordEvent({
      eventType:      "BOOKING_REJECTED",
      entityType:     "SemesterPlan",
      entityId:       bookingId,
      idempotencyKey: `BOOKING_REJECTED:${bookingId}`,
      payload: {
        userClerkId: result.booking.studentClerkId,
        bookingId,
        reason,
        actionUrl: `/tenants/bookings/${bookingId}`,
      },
    });
    void runNotificationProcessorOnce();

    res.status(200).json({
      success: true,
      message: "Booking rejected � the bed is now available again",
      data:    result.booking,
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.rejectBooking]", {
      bookingId,
      managerClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// -----------------------------------------------------------------------------
//  GET HOSTEL STATISTICS � MANAGER
//  GET /api/hostels/:propertyId/statistics
//
//  Returns the operational numbers a manager checks daily: room/bed
//  counts, revenue, and booking status breakdown. Everything is
//  calculated live from real records � nothing is stored separately,
//  so these numbers can never silently drift from reality.
// -----------------------------------------------------------------------------

export const getHostelStatistics = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const managerClerkId = requireAuth(req, res);
  if (!managerClerkId) return;

  const propertyId = getNumericParam(req.params.propertyId, "propertyId", res);
  if (!propertyId) return;

  try {
    const property = await prisma.property.findFirst({
      where: {
        id:            propertyId,
        managerClerkId,
        listingType:   "HOSTEL",
        deletedAt:     null,
      },
    });

    if (!property) {
      res.status(404).json({
        success: false,
        message: "Hostel not found or you do not have permission",
      });
      return;
    }

    // Real database-side aggregation - no records loaded into Node to
    // be counted in JavaScript. Each query below returns only small,
    // already-summarized rows (one row per status/group), regardless
    // of how many rooms, beds or bookings the hostel actually has.
    const [
      totalRooms,
      bedStatusGroups,
      retiredBeds,
      bookingStatusGroups,
      revenueAgg,
      outstandingAgg,
    ] = await Promise.all([
      prisma.room.count({
        where: { propertyId, isActive: true },
      }),
      prisma.bed.groupBy({
        by:     ["status"],
        where:  { room: { propertyId, isActive: true }, isRetired: false },
        _count: { _all: true },
      }),
      prisma.bed.count({
        where: { room: { propertyId, isActive: true }, isRetired: true },
      }),
      prisma.semesterPlan.groupBy({
        by:     ["status"],
        where:  { propertyId },
        _count: { _all: true },
      }),
      prisma.semesterPlan.aggregate({
        where: {
          propertyId,
          status: { in: ["ACTIVE", "EXTENDED", "COMPLETED"] },
        },
        _sum: { amountPaid: true },
      }),
      prisma.semesterPlan.aggregate({
        where: { propertyId, status: "AWAITING_PAYMENT" },
        _sum: { amountPaid: true },
      }),
    ]);

    const bedCount = (status: string) =>
      bedStatusGroups.find((g) => g.status === status)?._count._all ?? 0;

    const occupiedBeds    = bedCount("OCCUPIED");
    const reservedBeds    = bedCount("RESERVED");
    const maintenanceBeds = bedCount("MAINTENANCE");
    const availableBeds   = bedCount("AVAILABLE");
    const totalBeds       = occupiedBeds + reservedBeds + maintenanceBeds + availableBeds;

    const bookingCount = (status: string) =>
      bookingStatusGroups.find((g) => g.status === status)?._count._all ?? 0;

    const pendingApprovals  = bookingCount("PENDING_APPROVAL");
    const confirmedBookings = bookingCount("ACTIVE") + bookingCount("EXTENDED");
    const rejectedBookings  = bookingCount("REJECTED");

    const occupancyRate = totalBeds > 0
      ? Math.round((occupiedBeds / totalBeds) * 100)
      : 0;

    res.status(200).json({
      success: true,
      message: "Hostel statistics retrieved successfully",
      data: {
        totalRooms,
        totalBeds,
        occupiedBeds,
        reservedBeds,
        maintenanceBeds,
        retiredBeds,
        availableBeds,
        occupancyRate,
        totalRevenue:      revenueAgg._sum.amountPaid ?? 0,
        outstandingAmount: outstandingAgg._sum.amountPaid ?? 0,
        pendingApprovals,
        confirmedBookings,
        rejectedBookings,
      },
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.getHostelStatistics]", {
      propertyId,
      managerClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
//  GET HOSTEL OCCUPANCY - MANAGER (drill-down)
//  GET /api/hostels/:propertyId/occupancy?level=block|floor|room|bed
//    &block=A&floor=1&roomId=32
//
//  One flexible endpoint serving all four drill-down levels (Step 16
//  Phase 3). Every level is a real database-side GROUP BY / FILTER
//  aggregation - no room, bed or booking list is ever loaded into
//  Node just to be counted in memory. Existing indexes already
//  support these queries: Room(propertyId), Bed(roomId), Bed(status).
// -----------------------------------------------------------------------------
export const getHostelOccupancy = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const managerClerkId = requireAuth(req, res);
  if (!managerClerkId) return;

  const propertyId = getNumericParam(req.params.propertyId, "propertyId", res);
  if (!propertyId) return;

  const level = (req.query.level as string) || "block";
  const block = req.query.block as string | undefined;
  const floor = req.query.floor as string | undefined;
  const roomIdParam = req.query.roomId ? Number(req.query.roomId) : undefined;

  try {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, managerClerkId, listingType: "HOSTEL", deletedAt: null },
    });
    if (!property) {
      res.status(404).json({ success: false, message: "Hostel not found or you do not have permission" });
      return;
    }

    if (level === "block") {
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT
           COALESCE(r.block, 'Unassigned') as block,
           COUNT(DISTINCT r.id)::int as "totalRooms",
           COUNT(b.id)::int as "totalBeds",
           COUNT(*) FILTER (WHERE b.status = 'OCCUPIED')::int as "occupiedBeds",
           COUNT(*) FILTER (WHERE b.status = 'RESERVED')::int as "reservedBeds",
           COUNT(*) FILTER (WHERE b.status = 'AVAILABLE')::int as "availableBeds",
           COUNT(*) FILTER (WHERE b.status = 'MAINTENANCE')::int as "maintenanceBeds"
         FROM "Room" r
         LEFT JOIN "Bed" b ON b."roomId" = r.id AND b."isRetired" = false
         WHERE r."propertyId" = $1 AND r."isActive" = true
         GROUP BY r.block
         ORDER BY r.block`,
        propertyId
      );
      res.status(200).json({ success: true, message: "Block occupancy retrieved", data: rows });
      return;
    }

    if (level === "floor") {
      if (!block) {
        res.status(400).json({ success: false, message: "block is required for level=floor" });
        return;
      }
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT
           COALESCE(r.floor, 'Unassigned') as floor,
           COUNT(DISTINCT r.id)::int as "totalRooms",
           COUNT(b.id)::int as "totalBeds",
           COUNT(*) FILTER (WHERE b.status = 'OCCUPIED')::int as "occupiedBeds",
           COUNT(*) FILTER (WHERE b.status = 'RESERVED')::int as "reservedBeds",
           COUNT(*) FILTER (WHERE b.status = 'AVAILABLE')::int as "availableBeds",
           COUNT(*) FILTER (WHERE b.status = 'MAINTENANCE')::int as "maintenanceBeds"
         FROM "Room" r
         LEFT JOIN "Bed" b ON b."roomId" = r.id AND b."isRetired" = false
         WHERE r."propertyId" = $1 AND r."isActive" = true AND COALESCE(r.block, 'Unassigned') = $2
         GROUP BY r.floor
         ORDER BY r.floor`,
        propertyId, block
      );
      res.status(200).json({ success: true, message: "Floor occupancy retrieved", data: rows });
      return;
    }

    if (level === "room") {
      if (!block || !floor) {
        res.status(400).json({ success: false, message: "block and floor are required for level=room" });
        return;
      }
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT
           r.id, r."roomNumber", r.gender, r.capacity, r."semesterPrice",
           COUNT(b.id)::int as "totalBeds",
           COUNT(*) FILTER (WHERE b.status = 'OCCUPIED')::int as "occupiedBeds",
           COUNT(*) FILTER (WHERE b.status = 'RESERVED')::int as "reservedBeds",
           COUNT(*) FILTER (WHERE b.status = 'AVAILABLE')::int as "availableBeds",
           COUNT(*) FILTER (WHERE b.status = 'MAINTENANCE')::int as "maintenanceBeds"
         FROM "Room" r
         LEFT JOIN "Bed" b ON b."roomId" = r.id AND b."isRetired" = false
         WHERE r."propertyId" = $1 AND r."isActive" = true
           AND COALESCE(r.block, 'Unassigned') = $2 AND COALESCE(r.floor, 'Unassigned') = $3
         GROUP BY r.id
         ORDER BY r."roomNumber"`,
        propertyId, block, floor
      );
      res.status(200).json({ success: true, message: "Room occupancy retrieved", data: rows });
      return;
    }

    if (level === "bed") {
      if (!roomIdParam) {
        res.status(400).json({ success: false, message: "roomId is required for level=bed" });
        return;
      }
      const roomCheck = await prisma.room.findFirst({
        where: { id: roomIdParam, propertyId },
        select: { id: true },
      });
      if (!roomCheck) {
        res.status(404).json({ success: false, message: "Room not found for this hostel" });
        return;
      }
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT
           b.id, b."bedNumber", b.status,
           sp.id as "bookingId", sp.reference as "bookingReference", sp.status as "bookingStatus",
           u.name as "studentName", u.email as "studentEmail"
         FROM "Bed" b
         LEFT JOIN "SemesterPlan" sp ON sp."bedId" = b.id
           AND sp.status IN ('ACTIVE','EXTENDED','AWAITING_PAYMENT','PENDING_APPROVAL')
         LEFT JOIN "User" u ON u."clerkId" = sp."studentClerkId"
         WHERE b."roomId" = $1 AND b."isRetired" = false
         ORDER BY b."bedNumber"`,
        roomIdParam
      );
      res.status(200).json({ success: true, message: "Bed occupancy retrieved", data: rows });
      return;
    }

    res.status(400).json({ success: false, message: "Invalid level - use block, floor, room, or bed" });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.getHostelOccupancy]", {
      propertyId,
      managerClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
// -----------------------------------------------------------------------------
//  GET HOSTEL ATTENTION CENTER - MANAGER (Step 16 Phase 4)
//  GET /api/hostels/:propertyId/attention
//
//  Combines four real, targeted queries into one operational to-do
//  list - pending approvals, upcoming check-ins, upcoming check-outs,
//  and beds needing maintenance. Every item comes from real database
//  state; nothing is invented. Each query is scoped and limited, not
//  a full-table scan.
// -----------------------------------------------------------------------------
export const getHostelAttentionCenter = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const managerClerkId = requireAuth(req, res);
  if (!managerClerkId) return;

  const propertyId = getNumericParam(req.params.propertyId, "propertyId", res);
  if (!propertyId) return;

  try {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, managerClerkId, listingType: "HOSTEL", deletedAt: null },
    });
    if (!property) {
      res.status(404).json({ success: false, message: "Hostel not found or you do not have permission" });
      return;
    }

    const now = new Date();
    const soon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const [pendingApprovals, upcomingCheckIns, upcomingCheckOuts, maintenanceBeds] = await Promise.all([
      prisma.semesterPlan.findMany({
        where: { propertyId, status: "PENDING_APPROVAL" },
        select: { id: true, studentClerkId: true, roomNumber: true, semesterName: true, createdAt: true },
        orderBy: { createdAt: "asc" },
        take: 10,
      }),
      prisma.semesterPlan.findMany({
        where: {
          propertyId,
          status: { in: ["ACTIVE", "EXTENDED"] },
          checkedInAt: null,
          checkIn: { gte: now, lte: soon },
        },
        select: { id: true, studentClerkId: true, roomNumber: true, checkIn: true },
        orderBy: { checkIn: "asc" },
        take: 10,
      }),
      prisma.semesterPlan.findMany({
        where: {
          propertyId,
          status: { in: ["ACTIVE", "EXTENDED"] },
          actualEndDate: null,
          closingType: "FIXED",
          fixedEndDate: { gte: now, lte: soon },
        },
        select: { id: true, studentClerkId: true, roomNumber: true, fixedEndDate: true },
        orderBy: { fixedEndDate: "asc" },
        take: 10,
      }),
      prisma.bed.findMany({
        where: { room: { propertyId, isActive: true }, status: "MAINTENANCE", isRetired: false },
        select: { id: true, bedNumber: true, room: { select: { roomNumber: true } } },
        take: 10,
      }),
    ]);

    const studentIds = Array.from(new Set([
      ...pendingApprovals.map((b) => b.studentClerkId),
      ...upcomingCheckIns.map((b) => b.studentClerkId),
      ...upcomingCheckOuts.map((b) => b.studentClerkId),
    ]));
    const students = await prisma.user.findMany({
      where: { clerkId: { in: studentIds } },
      select: { clerkId: true, name: true },
    });
    const nameOf = (clerkId: string) => students.find((s) => s.clerkId === clerkId)?.name ?? "Unknown student";

    res.status(200).json({
      success: true,
      message: "Attention center retrieved",
      data: {
        pendingApprovals: pendingApprovals.map((b) => ({
          bookingId: b.id, studentName: nameOf(b.studentClerkId), roomNumber: b.roomNumber,
          semesterName: b.semesterName, submittedAt: b.createdAt,
        })),
        upcomingCheckIns: upcomingCheckIns.map((b) => ({
          bookingId: b.id, studentName: nameOf(b.studentClerkId), roomNumber: b.roomNumber, checkIn: b.checkIn,
        })),
        upcomingCheckOuts: upcomingCheckOuts.map((b) => ({
          bookingId: b.id, studentName: nameOf(b.studentClerkId), roomNumber: b.roomNumber, checkOut: b.fixedEndDate,
        })),
        maintenanceBeds: maintenanceBeds.map((b) => ({
          bedId: b.id, bedNumber: b.bedNumber, roomNumber: b.room.roomNumber,
        })),
      },
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.getHostelAttentionCenter]", {
      propertyId,
      managerClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
export const createSemesterBooking = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const studentClerkId = requireAuth(req, res);
  if (!studentClerkId) return;

  const parsed = createSemesterBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors:  formatZodErrors(parsed.error.issues),
    });
    return;
  }
  const {
    propertyId,
    bedId,
    semesterName,
    checkIn,
    closingType,
    fixedEndDate,
    schoolId,
    bookingGender,
  } = parsed.data;
  if (closingType === "FIXED" && !fixedEndDate) {
    res.status(400).json({
      success: false,
      message: "fixedEndDate is required when closingType is FIXED",
    });
    return;
  }
  if (closingType === "SCHOOL_CALENDAR" && !schoolId) {
    res.status(400).json({
      success: false,
      message: "schoolId is required when closingType is SCHOOL_CALENDAR",
    });
    return;
  }
  const checkInDate = new Date(checkIn);
  const now         = new Date();
  if (checkInDate <= now) {
    res.status(400).json({
      success: false,
      message: "Check in date must be in the future",
    });
    return;
  }
  if (fixedEndDate && new Date(fixedEndDate) <= checkInDate) {
    res.status(400).json({
      success: false,
      message: "fixedEndDate must be after checkIn date",
    });
    return;
  }
  try {
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        listingType: "HOSTEL",
        listingStatus: "AVAILABLE",
        deletedAt: null,
        isArchived: false,
      },
    });
    if (!property) {
      res.status(404).json({
        success: false,
        message: "Hostel not found or not available for booking",
      });
      return;
    }
    if (property.managerClerkId === studentClerkId) {
      res.status(400).json({
        success: false,
        message: "You cannot book your own hostel",
      });
      return;
    }

    // Same-hostel conflicting booking - a student may hold at most one
    // active booking per hostel at a time. Fast-path here for a friendly
    // early message; the authoritative, race-safe re-check happens again
    // inside the transaction below.
    const existingBooking = await prisma.semesterPlan.findFirst({
      where: {
        propertyId,
        studentClerkId,
        status: { in: ["PENDING_APPROVAL", "AWAITING_PAYMENT", "ACTIVE", "EXTENDED", "EXPIRING"] },
      },
    });
    if (existingBooking) {
      res.status(400).json({
        success: false,
        message: "You already have an active booking at this hostel",
      });
      return;
    }
        const bed = await prisma.bed.findFirst({
      where: {
        id:   bedId,
        room: { propertyId, isActive: true },
      },
      include: { room: true },
    });
    if (!bed) {
      res.status(404).json({
        success: false,
        message: "Bed not found for this hostel",
      });
      return;
    }

    // Fast-path check for the common case (no race in progress).
    // The transaction below performs the real, atomic safety check -
    // this just gives a friendly early message most of the time.
    // Room gender eligibility - self-declared at booking time, never
    // stored on the profile. Only enforced when the room actually has
    // a gender restriction (MIXED or unset rooms accept anyone).
    if (bed.room.gender === "MALE" || bed.room.gender === "FEMALE") {
      if (!bookingGender) {
        res.status(400).json({
          success: false,
          message: `This room is for ${bed.room.gender.toLowerCase()} students only. Please confirm your gender to book.`,
        });
        return;
      }
      if (bookingGender !== bed.room.gender) {
        res.status(400).json({
          success: false,
          message: `This room is for ${bed.room.gender.toLowerCase()} students only`,
        });
        return;
      }
    }
    if (bed.status !== "AVAILABLE") {
      res.status(400).json({
        success: false,
        message: `This bed is currently ${bed.status.toLowerCase()} and cannot be booked`,
      });
      return;
    }

    if (closingType === "SCHOOL_CALENDAR" && schoolId) {
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
      });
      if (!school) {
        res.status(404).json({
          success: false,
          message: "School not found",
        });
        return;
      }
    }

    class BookingTxError extends Error {
      statusCode: number;
      constructor(statusCode: number, message: string) {
        super(message);
        this.statusCode = statusCode;
      }
    }

    let result: { booking: any };
    try {
      result = await prisma.$transaction(async (tx) => {
        // Atomic reservation: only succeeds if the bed is still AVAILABLE
        // at this exact moment. count === 0 means someone else won the race.
        const reserveResult = await tx.bed.updateMany({
          where: { id: bedId, status: "AVAILABLE" },
          data:  { status: "RESERVED" },
        });
        if (reserveResult.count === 0) {
          throw new BookingTxError(409, "This bed was just booked by someone else. Please choose another bed.");
        }

        // Every check below runs AFTER the bed has already been claimed.
        // Each one THROWS on failure (never returns a value) so that any
        // failure here causes Prisma to roll back the whole transaction,
        // including the bed claim above - the bed and the booking are one
        // indivisible operation. A plain `return { error }` here would let
        // the transaction commit anyway, silently stranding the bed in
        // RESERVED with no booking behind it.

        // Resolve the applicable price fresh, INSIDE this same transaction,
        // at the latest possible moment before the write commits - closes
        // the gap where a price change landing between the initial read and
        // this write could otherwise apply a momentarily-stale price.
        // Room-specific price wins over the property default when both
        // qualify; among applicable versions in one scope, the newest wins.
        const priceNow = new Date();
        const priceRows = await tx.paymentStructure.findMany({
          where: {
            propertyId,
            AND: [
              { OR: [{ roomId: bed.room.id }, { roomId: null }] },
              { effectiveFrom: { lte: priceNow } },
              { OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: priceNow } }] },
            ],
          },
        });
        const resolvedPrice = priceRows.sort((a, b) => {
          const aScope = a.roomId === bed.room.id ? 0 : 1;
          const bScope = b.roomId === bed.room.id ? 0 : 1;
          if (aScope !== bScope) return aScope - bScope;
          return b.effectiveFrom.getTime() - a.effectiveFrom.getTime();
        })[0];

        if (!resolvedPrice) {
          throw new BookingTxError(400, "This hostel does not have active pricing configured");
        }

        // Authoritative re-check, INSIDE the transaction, closing the race
        // where two requests for different beds at the same hostel by the
        // same student could otherwise both pass the fast-path check above.
        const conflictCheck = await tx.semesterPlan.findFirst({
          where: {
            propertyId,
            studentClerkId,
            status: { in: ["PENDING_APPROVAL", "AWAITING_PAYMENT", "ACTIVE", "EXTENDED", "EXPIRING"] },
          },
        });
        if (conflictCheck) {
          throw new BookingTxError(400, "You already have an active booking at this hostel");
        }

        const newBooking = await tx.semesterPlan.create({
          data: {
            propertyId,
            bedId,
            studentClerkId,
            semesterName,
            checkIn: checkInDate,
            closingType: closingType as ClosingType,
            fixedEndDate: fixedEndDate ? new Date(fixedEndDate) : null,
            schoolId: schoolId ?? null,
            roomNumber: bed.room.roomNumber,
            amountPaid: resolvedPrice.price,
            paymentStructureId: resolvedPrice.id,
            reference: generateHostelReference(),
            status: HostelBookingStatus.PENDING_APPROVAL,
          },
        });

        await tx.bed.update({
          where: { id: bedId },
          data:  { currentBookingId: newBooking.id },
        });

        await tx.bedStatusHistory.create({
          data: {
            bedId:       bedId,
            bookingId:       newBooking.id,
            bookingReference: newBooking.reference,
            oldStatus:   "AVAILABLE",
            newStatus:   "RESERVED",
            action:      "HOSTEL_BOOKING_CREATED",
            performedBy: studentClerkId,
          },
        });

        return { booking: newBooking };
      });
    } catch (txError: any) {
      if (txError instanceof BookingTxError) {
        res.status(txError.statusCode).json({ success: false, message: txError.message });
        return;
      }
      throw txError;
    }

    await logUserEvent({
      userClerkId: studentClerkId,
      action:      "HOSTEL_BOOKING_CREATED",
      target:      `SemesterPlan #${result.booking.id} - Property #${propertyId}`,
      details:     `Semester: ${semesterName}. Bed: ${bed.room.roomNumber}/${bed.bedNumber}. Type: ${closingType}. Status: PENDING_APPROVAL`,
    });

    res.status(201).json({
      success: true,
      message: "Booking submitted - awaiting manager approval",
      data:    result.booking,
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.createSemesterBooking]", {
      propertyId,
      bedId,
      studentClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET STUDENT BOOKINGS
//  GET /api/hostels/my
//
//  Returns all hostel bookings for the logged-in student.
//  Includes school info for SCHOOL_CALENDAR bookings.
//  Ordered by check in date — most recent first.
// ─────────────────────────────────────────────────────────────────────────────
export const getStudentBookings = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const studentClerkId = requireAuth(req, res);
  if (!studentClerkId) return;

  try {
    const bookings = await prisma.semesterPlan.findMany({
      where:   { studentClerkId },
      include: {
        property: {
          select: {
            id:       true,
            name:     true,
            location: { select: { city: true, region: true } },
          },
        },
        bed: {
          select: {
            id:        true,
            bedNumber: true,
            room: { select: { id: true, roomNumber: true, block: true, floor: true, capacity: true } },
          },
        },
        school: {
          select: {
            id:       true,
            name:     true,
            location: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Bookings retrieved successfully",
      data:    bookings,
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.getStudentBookings]", {
      studentClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET HOSTEL BOOKINGS — MANAGER
//  GET /api/hostels/property/:propertyId
//
//  Returns all bookings for a specific hostel.
//  Only the manager who owns the hostel can view.
//  Groups bookings by room number for dashboard display.
// ─────────────────────────────────────────────────────────────────────────────
// -----------------------------------------------------------------------------
//  GET HOSTEL BOOKINGS - PAGINATED, SEARCHABLE - MANAGER
//  GET /api/hostels/:propertyId/bookings-search
//
//  Dedicated, separate endpoint for the manager "All Bookings" table at
//  real scale (search + status filter + pagination happen server-side).
//  Deliberately kept separate from getHostelBookings below, which still
//  serves stats/room-grouping unchanged for the rest of the page.
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
//  GET STUDENT BOOKING HISTORY - MANAGER
//  GET /api/hostels/:propertyId/students/:studentClerkId/history
//
//  A student's FULL booking history at THIS hostel - every semester,
//  past and present - so a manager can click one name and see everything,
//  rather than hunting across a huge paginated table. This is the detail
//  view the "All Bookings" table's rows link into.
// -----------------------------------------------------------------------------
export const getBookingPayments = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const studentClerkId = requireAuth(req, res);
  if (!studentClerkId) return;

  const bookingId = Number(req.params.bookingId);
  if (!bookingId) {
    res.status(400).json({ success: false, message: "Invalid booking ID" });
    return;
  }

  try {
    const booking = await prisma.semesterPlan.findUnique({
      where:  { id: bookingId },
      select: { id: true, studentClerkId: true },
    });

    if (!booking) {
      res.status(404).json({ success: false, message: "Booking not found" });
      return;
    }

    if (booking.studentClerkId !== studentClerkId) {
      res.status(403).json({ success: false, message: "You do not have permission to view this booking's payments" });
      return;
    }

    const payments = await prisma.payment.findMany({
      where:   { semesterPlanId: bookingId },
      orderBy: { createdAt: "desc" },
      select: {
        id:                true,
        amountDue:         true,
        amountPaid:        true,
        dueDate:           true,
        paymentDate:       true,
        paymentStatus:     true,
        paystackReference: true,
        createdAt:         true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Payments retrieved successfully",
      data:    payments,
    });
  } catch (error) {
    console.error("[hostelControllers.getBookingPayments]", {
      studentClerkId,
      bookingId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Failed to retrieve payments" });
  }
};
export const getStudentBookingHistory = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const managerClerkId = requireAuth(req, res);
  if (!managerClerkId) return;

  const propertyId = getNumericParam(req.params.propertyId, "propertyId", res);
  if (!propertyId) return;

  const studentClerkId = req.params.studentClerkId;
  if (!studentClerkId) {
    res.status(400).json({ success: false, message: "studentClerkId is required" });
    return;
  }

  try {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, managerClerkId, deletedAt: null },
    });
    if (!property) {
      res.status(404).json({ success: false, message: "Hostel not found or you do not have permission" });
      return;
    }

    const student = await prisma.user.findUnique({
      where:  { clerkId: studentClerkId },
      select: { clerkId: true, name: true, email: true, phoneNumber: true },
    });

    const bookings = await prisma.semesterPlan.findMany({
      where:   { propertyId, studentClerkId },
      include: { bed: { select: { id: true, bedNumber: true } } },
      orderBy: { checkIn: "desc" },
    });

    res.status(200).json({
      success: true,
      message: "Student booking history retrieved",
      data: {
        student: student ?? { clerkId: studentClerkId, name: "Unknown student", email: null, phoneNumber: null },
        bookings,
      },
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.getStudentBookingHistory]", {
      propertyId,
      studentClerkId,
      managerClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
export const getHostelBookingsPaginated = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const managerClerkId = requireAuth(req, res);
  if (!managerClerkId) return;

  const propertyId = getNumericParam(req.params.propertyId, "propertyId", res);
  if (!propertyId) return;

  const search = ((req.query.search as string) || "").trim();
  const status = (req.query.status as string) || "";
  const page   = Math.max(1, Number(req.query.page) || 1);
  const limit  = Math.min(50, Number(req.query.limit) || 20);
  const skip   = (page - 1) * limit;

  try {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, managerClerkId, deletedAt: null },
    });
    if (!property) {
      res.status(404).json({ success: false, message: "Hostel not found or you do not have permission" });
      return;
    }

    const where: any = { propertyId };
    if (status && status !== "ALL") {
      where.status = status;
    }

    if (search) {
      const matchingUsers = await prisma.user.findMany({
        where:  { name: { contains: search, mode: "insensitive" } },
        select: { clerkId: true },
      });
      const matchingIds = matchingUsers.map((u) => u.clerkId);
      where.OR = [
        { reference: { contains: search, mode: "insensitive" } },
        { studentClerkId: { in: matchingIds } },
      ];
    }

    const [bookings, total] = await Promise.all([
      prisma.semesterPlan.findMany({
        where,
        include: { bed: { select: { id: true, bedNumber: true } } },
        orderBy: { checkIn: "desc" },
        skip,
        take: limit,
      }),
      prisma.semesterPlan.count({ where }),
    ]);

    const uniqueIds = Array.from(new Set(bookings.map((b) => b.studentClerkId)));
    const students = await prisma.user.findMany({
      where:  { clerkId: { in: uniqueIds } },
      select: { clerkId: true, name: true, email: true },
    });
    const userMap = new Map(students.map((u) => [u.clerkId, u]));
    const enrichedBookings = bookings.map((b) => ({
      ...b,
      studentName:  userMap.get(b.studentClerkId)?.name  ?? "Unknown student",
      studentEmail: userMap.get(b.studentClerkId)?.email ?? null,
    }));

    res.status(200).json({
      success: true,
      message: "Bookings retrieved",
      data: {
        bookings: enrichedBookings,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.getHostelBookingsPaginated]", {
      propertyId,
      managerClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
export const getHostelBookings = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const managerClerkId = requireAuth(req, res);
  if (!managerClerkId) return;

  const propertyId = getNumericParam(req.params.propertyId, "propertyId", res);
  if (!propertyId) return;

  try {
    // Authorization — manager must own this hostel
    const property = await prisma.property.findFirst({
      where: {
        id:            propertyId,
        managerClerkId,
        deletedAt:     null,
      },
    });

    if (!property) {
      res.status(404).json({
        success: false,
        message: "Hostel not found or you do not have permission",
      });
      return;
    }

    const bookings = await prisma.semesterPlan.findMany({
      where:   { propertyId },
      include: {
        school: {
          select: { id: true, name: true },
        },
        bed: { select: { id: true, bedNumber: true } },
      },
      orderBy: { checkIn: "desc" },
    });

    // Group by room number for easy dashboard display
    type BookingWithSchool = typeof bookings[number];
    const studentClerkIds = Array.from(new Set(bookings.map((b) => b.studentClerkId)));
    const students = await prisma.user.findMany({
      where:  { clerkId: { in: studentClerkIds } },
      select: { clerkId: true, name: true, email: true },
    });
    const userMap = new Map(students.map((u) => [u.clerkId, u]));
    const enrichedBookings = bookings.map((b) => ({
      ...b,
      studentName:  userMap.get(b.studentClerkId)?.name  ?? "Unknown student",
      studentEmail: userMap.get(b.studentClerkId)?.email ?? null,
    }));

    const byRoom = enrichedBookings.reduce<Record<string, any>>((acc, b) => {
      const room = b.roomNumber ?? "Unassigned";
      acc[room]  = acc[room] ?? [];
      acc[room].push(b);
      return acc;
    }, {});

    const totalOccupied = enrichedBookings.filter(b =>
      b.status === HostelBookingStatus.ACTIVE   ||
      b.status === HostelBookingStatus.EXPIRING ||
      b.status === HostelBookingStatus.EXTENDED
    ).length;

    res.status(200).json({
      success: true,
      message: "Hostel bookings retrieved successfully",
      data: {
        bookings: enrichedBookings,
        byRoom,
        totalOccupied,
      },
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.getHostelBookings]", {
      propertyId,
      managerClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  CHECKOUT STUDENT
//  PUT /api/hostels/:bookingId/checkout
//
//  Manager records when a student has left the hostel.
//  Sets actualEndDate and marks booking as COMPLETED.
//  Two-step authorization — booking found first then property ownership checked.
//  Cannot checkout a booking that is already COMPLETED or EXPIRED.
// ─────────────────────────────────────────────────────────────────────────────
export const checkoutStudent = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const managerClerkId = requireAuth(req, res);
  if (!managerClerkId) return;
  const bookingId = getNumericParam(req.params.bookingId, "bookingId", res);
  if (!bookingId) return;
  const parsed = checkoutStudentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors:  formatZodErrors(parsed.error.issues),
    });
    return;
  }
  const { actualEndDate } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.semesterPlan.findUnique({
        where: { id: bookingId },
      });
      if (!booking) {
        return { error: 404 as const, message: "Booking not found" };
      }

      const property = await tx.property.findFirst({
        where: {
          id: booking.propertyId,
          managerClerkId,
          deletedAt: null,
        },
      });
      if (!property) {
        return { error: 403 as const, message: "You do not have permission to manage this booking" };
      }

      if (
        booking.status === HostelBookingStatus.COMPLETED ||
        booking.status === HostelBookingStatus.EXPIRED
      ) {
        return { error: 400 as const, message: `Cannot checkout a booking with status: ${booking.status}` };
      }

      const updatedBooking = await transitionBooking(tx, {
        bookingId: bookingId,
        toStatus: "COMPLETED",
        actorClerkId: managerClerkId,
        actorRole: "MANAGER",
        extraData: { actualEndDate: new Date(actualEndDate) },
      });

      let bedReleased = false;
      const originalBedStatus = booking.bedId ? (await tx.bed.findUnique({ where: { id: booking.bedId } }))?.status : null;
      if (booking.bedId) {
        await tx.bed.update({
          where: { id: booking.bedId },
          data: { status: "AVAILABLE", currentBookingId: null },
        });
        bedReleased = true;
        await tx.bedStatusHistory.create({
          data: {
            bedId:       booking.bedId,

            bookingId:       booking.id,
            bookingReference: booking.reference,
            oldStatus:   originalBedStatus ?? "OCCUPIED",
            newStatus:   "AVAILABLE",
            action:      "HOSTEL_STUDENT_CHECKOUT",
            performedBy: managerClerkId,
          },
        });
      }

      return { booking: updatedBooking, bedReleased };
    });

    if ("error" in result) {
      res.status(result.error).json({ success: false, message: result.message });
      return;
    }

    await logUserEvent({
      userClerkId: managerClerkId,
      action:  "HOSTEL_STUDENT_CHECKOUT",
      target:  `SemesterPlan #${bookingId}`,
      details: result.bedReleased
        ? `Student checked out. Actual end: ${actualEndDate}. Property #${result.booking.propertyId}. Bed released.`
        : `Student checked out. Actual end: ${actualEndDate}. Property #${result.booking.propertyId}. No bed associated - release step skipped.`,
    });

    await recordEvent({
      eventType:      "CHECK_OUT_COMPLETED",
      entityType:     "SemesterPlan",
      entityId:       bookingId,
      idempotencyKey: `CHECK_OUT_COMPLETED:${bookingId}`,
      payload: {
        userClerkId: result.booking.studentClerkId,
        bookingId,
        actionUrl: `/tenants/bookings/${bookingId}`,
      },
    });
    void runNotificationProcessorOnce();

    res.status(200).json({
      success: true,
      message: "Student checked out successfully",
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.checkoutStudent]", {
      bookingId,
      managerClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  EXTEND STAY
//  PUT /api/hostels/:bookingId/extend
//
//  Manager extends a student stay beyond the original end date.
//  Used when a student stays past the semester closing date.
//  New end date must be in the future.
//  Cannot extend COMPLETED or EXPIRED bookings.
//  Two-step authorization — booking first then property ownership.
// ─────────────────────────────────────────────────────────────────────────────
export const extendStay = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const managerClerkId = requireAuth(req, res);
  if (!managerClerkId) return;

  const bookingId = getNumericParam(req.params.bookingId, "bookingId", res);
  if (!bookingId) return;

  const parsed = extendStaySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors:  formatZodErrors(parsed.error.issues),
    });
    return;
  }

  const { newEndDate } = parsed.data;

  try {
    // Step 1 — find the booking
    const booking = await prisma.semesterPlan.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      res.status(404).json({
        success: false,
        message: "Booking not found",
      });
      return;
    }

    // Step 2 — verify manager owns the hostel
    const property = await prisma.property.findFirst({
      where: {
        id:            booking.propertyId,
        managerClerkId,
        deletedAt:     null,
      },
    });

    if (!property) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to manage this booking",
      });
      return;
    }

    // Status guard — cannot extend completed or expired bookings
    if (
      booking.status === HostelBookingStatus.COMPLETED ||
      booking.status === HostelBookingStatus.EXPIRED
    ) {
      res.status(400).json({
        success: false,
        message: "Cannot extend a completed or expired booking",
      });
      return;
    }

    const newEnd = new Date(newEndDate);

    // New end date must be in the future
    if (newEnd <= new Date()) {
      res.status(400).json({
        success: false,
        message: "New end date must be in the future",
      });
      return;
    }

    await prisma.semesterPlan.update({
      where: { id: bookingId },
      data: {
        fixedEndDate: newEnd,
        status:       HostelBookingStatus.EXTENDED,
      },
    });

    await logSystemEvent({
      action:  "HOSTEL_STAY_EXTENDED",
      target:  `SemesterPlan #${bookingId}`,
      details: `Extended to ${newEndDate} by manager ${managerClerkId}. Property #${booking.propertyId}`,
    });

    res.status(200).json({
      success: true,
      message: "Stay extended successfully",
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.extendStay]", {
      bookingId,
      managerClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET ROOM AVAILABILITY
//  GET /api/hostels/:propertyId/availability
//
//  Returns occupied rooms and active bookings for a hostel.
//  Public endpoint — no auth required for viewing availability.
//  Used by prospective students browsing available rooms.
// ─────────────────────────────────────────────────────────────────────────────
export const getRoomAvailability = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const propertyId = getNumericParam(req.params.propertyId, "propertyId", res);
  if (!propertyId) return;

  try {
    const property = await prisma.property.findFirst({
      where: {
        id:          propertyId,
        listingType: "HOSTEL",
        deletedAt:   null,
        isArchived:  false,
      },
    });

    if (!property) {
      res.status(404).json({
        success: false,
        message: "Hostel not found",
      });
      return;
    }

    const activeBookings = await prisma.semesterPlan.findMany({
      where: {
        propertyId,
        status: {
          in: [
            HostelBookingStatus.ACTIVE,
            HostelBookingStatus.EXPIRING,
            HostelBookingStatus.EXTENDED,
          ],
        },
      },
      select: {
        roomNumber:   true,
        semesterName: true,
        status:       true,
        checkIn:      true,
        fixedEndDate: true,
      },
    });

    const occupiedRooms = activeBookings
      .filter(b  => b.roomNumber !== null)
      .map(b     => b.roomNumber as string);

    res.status(200).json({
      success: true,
      message: "Room availability retrieved",
      data: {
        propertyId,
        occupiedRooms,
        totalOccupied: occupiedRooms.length,
        activeBookings,
      },
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.getRoomAvailability]", {
      propertyId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET ALL HOSTEL BOOKINGS — ADMIN
//  GET /api/hostels/admin/all
//
//  Returns all hostel bookings platform wide — Derek only.
//  Paginated — prevents memory overload as platform scales.
//  Both queries run in parallel — faster response time.
// ─────────────────────────────────────────────────────────────────────────────
export const getAllHostelBookings = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const adminClerkId = await requireAdminAuth(req, res);
  if (!adminClerkId) return;

  const page  = Math.max(1,  Number(req.query.page)  || 1);
  const limit = Math.min(50, Number(req.query.limit)  || 20);
  const skip  = (page - 1) * limit;

  try {
    const [bookings, total] = await Promise.all([
      prisma.semesterPlan.findMany({
        skip,
        take: limit,
        include: {
          school: {
            select: { id: true, name: true },
          },
        },
        orderBy: { checkIn: "desc" },
      }),
      prisma.semesterPlan.count(),
    ]);

    res.status(200).json({
      success: true,
      message: "All hostel bookings retrieved",
      data: {
        bookings,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.getAllHostelBookings]", {
      adminClerkId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// -----------------------------------------------------------------------------
//  GET HOSTELS NEAR CAMPUS - PUBLIC (read-only)
//  GET /api/hostels/near-campus/:campusId
//
//  Real, backend-authoritative distance from a real campus to every real
//  AskDerek hostel listing. Never fabricates a distance - a hostel with
//  no real coordinates gets distanceKm: null, never a fake number.
//  Summary-level only, matching Discovery != Detail - never loads rooms
//  or beds here. Price reuses the exact same Step 8 resolution already
//  proven in getProperties - never a second pricing calculation.
// -----------------------------------------------------------------------------
export const getHostelsNearCampus = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const campusId = Number(req.params.campusId);
  if (isNaN(campusId) || campusId <= 0) {
    res.status(400).json({ success: false, message: "Invalid campusId" });
    return;
  }

  try {
    const campusCheck: any[] = await prisma.$queryRawUnsafe(`SELECT id, name, coordinates IS NOT NULL as "hasCoordinates" FROM "Campus" WHERE id = $1 AND "isActive" = true`, campusId);
    if (campusCheck.length === 0) {
      res.status(404).json({ success: false, message: "Campus not found" });
      return;
    }

    const hostels: any[] = await prisma.$queryRawUnsafe(`SELECT p.id, p.name, p."photoUrls", l.city, l.region, CASE WHEN l.coordinates IS NOT NULL AND c.coordinates IS NOT NULL AND NOT (ST_X(l.coordinates::geometry) = 0 AND ST_Y(l.coordinates::geometry) = 0) AND NOT (ST_X(c.coordinates::geometry) = 0 AND ST_Y(c.coordinates::geometry) = 0) THEN ST_Distance(c.coordinates::geography, l.coordinates::geography) / 1000 ELSE NULL END as "distanceKm" FROM "Property" p JOIN "Location" l ON p."locationId" = l.id CROSS JOIN "Campus" c WHERE c.id = $1 AND p."listingType" = 'HOSTEL' AND p."isArchived" = false AND p."deletedAt" IS NULL ORDER BY "distanceKm" ASC NULLS LAST`, campusId);

    const hostelIds = hostels.map((h) => h.id);
    if (hostelIds.length > 0) {
      const priceNow = new Date();
      const priceRows = await prisma.paymentStructure.findMany({
        where: {
          propertyId: { in: hostelIds },
          roomId: null,
          effectiveFrom: { lte: priceNow },
          OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: priceNow } }],
        },
        orderBy: { effectiveFrom: "desc" },
      });
      const priceByProperty = new Map<number, number>();
      for (const row of priceRows) {
        if (!priceByProperty.has(row.propertyId)) {
          priceByProperty.set(row.propertyId, row.price);
        }
      }
      for (const h of hostels) {
        h.currentHostelPrice = priceByProperty.get(h.id) ?? null;
      }
    }

    res.status(200).json({
      success: true,
      message: `${hostels.length} hostel(s) found near ${campusCheck[0].name}`,
      data: hostels,
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.getHostelsNearCampus]", {
      campusId,
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// -----------------------------------------------------------------------------
//  DISCOVER HOSTELS - PUBLIC (read-only)
//  GET /api/hostels/discover
//
//  Real backend search, filters, sorting and pagination - summary-level
//  only, matching Discovery != Detail. Price is resolved via a LATERAL
//  join to the exact same Step 8 PaymentStructure logic, so filtering,
//  sorting and pagination on price all stay correct together in one
//  query - never a separate in-memory pass that could paginate wrong.
// -----------------------------------------------------------------------------
export const discoverHostels = async (req: Request, res: Response<ApiResponse>): Promise<void> => {
  try {
    const { search, priceMin, priceMax, gender, capacityMin, sort } = req.query;
    const page  = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 12);
    const offset = (page - 1) * limit;

    const conditions: string[] = [
      `p."listingType" = 'HOSTEL'`,
      `p."isArchived" = false`,
      `p."deletedAt" IS NULL`,
      `p.status = 'Approved'`,
    ];
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(p.name ILIKE $${paramIndex} OR l.city ILIKE $${paramIndex} OR l.area ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (gender && gender !== "any") {
      conditions.push(`EXISTS (SELECT 1 FROM "Room" r WHERE r."propertyId" = p.id AND (r.gender = $${paramIndex}::"RoomGender" OR r.gender = 'MIXED'))`);
      params.push(gender);
      paramIndex++;
    }
    if (capacityMin) {
      conditions.push(`EXISTS (SELECT 1 FROM "Room" r WHERE r."propertyId" = p.id AND r.capacity >= $${paramIndex})`);
      params.push(Number(capacityMin));
      paramIndex++;
    }
    if (priceMin) {
      conditions.push(`price.price >= $${paramIndex}`);
      params.push(Number(priceMin));
      paramIndex++;
    }
    if (priceMax) {
      conditions.push(`price.price <= $${paramIndex}`);
      params.push(Number(priceMax));
      paramIndex++;
    }

    const whereClause = conditions.join(" AND ");

    let orderBy = `p."postedDate" DESC`;
    if (sort === "price_asc")  orderBy = `price.price ASC NULLS LAST`;
    if (sort === "price_desc") orderBy = `price.price DESC NULLS LAST`;

    const dataQuery = `
      SELECT p.id, p.name, p."photoUrls", l.city, l.region, l.area, price.price as "currentHostelPrice"
      FROM "Property" p
      JOIN "Location" l ON p."locationId" = l.id
      LEFT JOIN LATERAL (
        SELECT ps.price FROM "PaymentStructure" ps
        WHERE ps."propertyId" = p.id AND ps."roomId" IS NULL
          AND ps."effectiveFrom" <= NOW()
          AND (ps."effectiveUntil" IS NULL OR ps."effectiveUntil" > NOW())
        ORDER BY ps."effectiveFrom" DESC LIMIT 1
      ) price ON true
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const dataParams = [...params, limit, offset];

    const countQuery = `
      SELECT COUNT(*)::int as total
      FROM "Property" p
      JOIN "Location" l ON p."locationId" = l.id
      LEFT JOIN LATERAL (
        SELECT ps.price FROM "PaymentStructure" ps
        WHERE ps."propertyId" = p.id AND ps."roomId" IS NULL
          AND ps."effectiveFrom" <= NOW()
          AND (ps."effectiveUntil" IS NULL OR ps."effectiveUntil" > NOW())
        ORDER BY ps."effectiveFrom" DESC LIMIT 1
      ) price ON true
      WHERE ${whereClause}
    `;

    const [hostels, countResult] = await Promise.all([
      prisma.$queryRawUnsafe(dataQuery, ...dataParams),
      prisma.$queryRawUnsafe(countQuery, ...params),
    ]);

    const total = (countResult as any[])[0]?.total ?? 0;

    res.status(200).json({
      success: true,
      message: `${total} hostel(s) found`,
      data: {
        hostels,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    if (error instanceof CentralBookingTxError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    console.error("[hostelControllers.discoverHostels]", {
      error: error instanceof Error ? error.message : error,
    });
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

