// ─────────────────────────────────────────────────────────────────────────────
//  hostelRoutes.ts
//
//  Hostel booking routes for AskDerek.
//
//  Four access levels:
//    Student  — creates bookings and views their own
//    Manager  — manages rooms, beds, bookings, checkout, extensions
//    Admin    — views all hostel bookings platform wide
//    Public   — room availability only
//
//  ROUTE ORDER IS CRITICAL:
//    Static routes must come BEFORE dynamic routes (/:id, /:bookingId,
//    /:roomId, /:bedId) to prevent Express matching static path
//    segments as param values.
//
//  getRoomAvailability is public — no requireAuth needed.
//  All other routes require Clerk authentication.
//  clerkMiddleware() registered globally in index.ts.
//  Role and ownership checks enforced inside each controller.
// ─────────────────────────────────────────────────────────────────────────────

import { Router }      from "express";
import rateLimit       from "express-rate-limit";
import { requireAuth } from "@clerk/express";
import {
  createSemesterBooking,
  cancelBooking,
  getBookingTimeline,
  initializeHostelPayment,
  getStudentBookings,
  getHostelOccupancy,
  getHostelAttentionCenter,
  getBookingPayments,
  getHostelBookings,
  getHostelBookingsPaginated,
  getStudentBookingHistory,
  checkoutStudent,
  extendStay,
  getRoomAvailability,
  getAllHostelBookings,
  addRoom,
  addPaymentStructure,
  getPropertyPricing,
  bulkAddRooms,
  bulkPreviewCapacity,
  bulkApplyCapacity,
  getHostelRooms,
  getPublicHostelRooms,
  getHostelsNearCampus,
  discoverHostels,
  updateRoom,
  updateHostelProfile,
  deleteRoom,
  updateRoomCapacity,
  updateBedStatus,
  getBedTransferInfo,
  transferBed,
  recordCheckIn,
  getNoShowCandidates,
  markNoShow,
  retireBed,
  getBedStatusHistory,
  getManagerActivityLog,
  approveBooking,
  rejectBooking,
  getHostelStatistics,
} from "../controllers/hostelControllers";

const router = Router();

// ── RATE LIMITERS ─────────────────────────────────────────────────────────────

// Booking creation — max 10 per 15 minutes per IP
// Prevents booking spam on hostel listings
const createBookingLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { success: false, message: "Too many booking attempts. Please slow down." },
});

// General authenticated read and update routes
const generalLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             100,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { success: false, message: "Too many requests. Please slow down." },
});

// Public availability route — slightly stricter to prevent scraping
const publicLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             60,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { success: false, message: "Too many requests. Please slow down." },
});

// Admin view routes
const adminLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             50,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { success: false, message: "Too many requests. Please slow down." },
});

// Room/bed management — moderate limit, managers won't hit this in normal use
const roomManagementLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             60,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { success: false, message: "Too many requests. Please slow down." },
});

// ── STATIC ROUTES FIRST ───────────────────────────────────────────────────────
// All static and named routes registered before dynamic /:id routes.
// Express matches routes top to bottom — order is critical here.

// Student views all their own hostel bookings
router.get("/my",                         requireAuth(), generalLimiter,       getStudentBookings);
router.get("/:propertyId/occupancy", requireAuth(), generalLimiter, getHostelOccupancy);
router.get("/:propertyId/attention", requireAuth(), generalLimiter, getHostelAttentionCenter);
router.get("/bookings/:bookingId/payments", requireAuth(), generalLimiter, getBookingPayments);

// Admin views all hostel bookings platform wide — paginated
router.get("/admin/all",                  requireAuth(), adminLimiter,         getAllHostelBookings);

// Manager views all bookings for their specific hostel property
router.get("/property/:propertyId",       requireAuth(), generalLimiter,       getHostelBookings);

// Manager searches/paginates bookings for a hostel (dedicated table endpoint)
router.get("/:propertyId/bookings-search", requireAuth(), generalLimiter, getHostelBookingsPaginated);

// Manager views a student's full booking history at this hostel
router.get("/:propertyId/students/:studentClerkId/history", requireAuth(), generalLimiter, getStudentBookingHistory);

// Public — room availability for a hostel
// No requireAuth — prospective students browse before signing up
router.get("/availability/:propertyId",   publicLimiter,                       getRoomAvailability);

// Student creates a new semester or monthly hostel booking
router.post("/book",                      requireAuth(), createBookingLimiter, createSemesterBooking);

// Student initializes Paystack payment for an awaiting-payment booking
router.post("/bookings/:bookingId/pay", requireAuth(), createBookingLimiter, initializeHostelPayment);

// ── ROOM MANAGEMENT — MANAGER ─────────────────────────────────────────────────
// Registered before /:bookingId routes below — /:propertyId/rooms and
// /:propertyId/statistics are distinct static-ish paths under a property.

// Manager adds a single room (with beds auto-created)
router.post("/:propertyId/rooms",          requireAuth(), roomManagementLimiter, addRoom);
router.post("/:propertyId/pricing", requireAuth(), roomManagementLimiter, addPaymentStructure);
router.get("/:propertyId/pricing", requireAuth(), roomManagementLimiter, getPropertyPricing);

// Manager bulk-adds a range of rooms at once
router.post("/:propertyId/rooms/bulk",     requireAuth(), roomManagementLimiter, bulkAddRooms);

// Manager previews a bulk capacity change before applying it (read-only)
router.post("/:propertyId/rooms/capacity/bulk-preview", requireAuth(), roomManagementLimiter, bulkPreviewCapacity);

// Manager applies a bulk capacity change to a confirmed list of rooms
router.post("/:propertyId/rooms/capacity/bulk-apply",    requireAuth(), roomManagementLimiter, bulkApplyCapacity);

// Manager views full room/bed inventory for their hostel
router.get("/:propertyId/rooms",           requireAuth(), generalLimiter,       getHostelRooms);

// Public � students view available rooms/beds before booking
// No requireAuth � matches getRoomAvailability's public pattern
router.get("/:propertyId/public-rooms", publicLimiter, getPublicHostelRooms);

// Public - students browsing by university/campus
router.get("/near-campus/:campusId", publicLimiter, getHostelsNearCampus);

// Public - general discovery with search/filters/sort/pagination
router.get("/discover", publicLimiter, discoverHostels);

// Manager views operational statistics for their hostel
router.get("/:propertyId/statistics",      requireAuth(), generalLimiter,       getHostelStatistics);

// Manager updates hostel profile fields (emergency contact, rules)
router.put("/:propertyId/profile",         requireAuth(), roomManagementLimiter, updateHostelProfile);

// Manager edits a specific room
router.put("/rooms/:roomId",               requireAuth(), roomManagementLimiter, updateRoom);

// Manager deletes a specific room (blocked if beds are occupied/reserved)
router.delete("/rooms/:roomId",            requireAuth(), roomManagementLimiter, deleteRoom);

// Manager increases or decreases a room's bed capacity
router.put("/rooms/:roomId/capacity",      requireAuth(), roomManagementLimiter, updateRoomCapacity);

// Manager marks a bed under maintenance or back to available
router.put("/beds/:bedId/status",          requireAuth(), roomManagementLimiter, updateBedStatus);

// Manager gets student name/location for an occupied bed (before transfer)
router.get("/beds/:bedId/transfer-info",  requireAuth(), roomManagementLimiter, getBedTransferInfo);

// Manager transfers a student from one bed to another
router.post("/bed-transfers",             requireAuth(), roomManagementLimiter, transferBed);

// Manager records a student's check-in (separate fact from approval)
router.put("/bookings/:bookingId/check-in", requireAuth(), roomManagementLimiter, recordCheckIn);

// Manager views bookings whose check-in date passed with no check-in recorded
router.get("/:propertyId/no-show-candidates", requireAuth(), roomManagementLimiter, getNoShowCandidates);

// Manager marks a booking as a no-show (deliberate decision, never automatic)
router.put("/bookings/:bookingId/no-show", requireAuth(), roomManagementLimiter, markNoShow);

// Manager permanently retires a bed (never deleted, kept for history)
router.put("/beds/:bedId/retire", requireAuth(), roomManagementLimiter, retireBed);

// Manager views a single bed's full recorded history
router.get("/beds/:bedId/history", requireAuth(), roomManagementLimiter, getBedStatusHistory);

// Manager views their own hostel activity log
router.get("/:propertyId/activity", requireAuth(), roomManagementLimiter, getManagerActivityLog);

// ── BOOKING APPROVAL — MANAGER ────────────────────────────────────────────────

// Manager approves a pending booking
router.put("/bookings/:bookingId/approve", requireAuth(), generalLimiter,       approveBooking);

// Manager rejects a pending booking
router.put("/bookings/:bookingId/reject",  requireAuth(), generalLimiter,       rejectBooking);

// Student, manager, or admin cancels a booking (policy-gated by status/role)
router.put("/bookings/:bookingId/cancel", requireAuth(), generalLimiter, cancelBooking);

// Student, manager, or admin views a booking's real transition timeline
router.get("/bookings/:bookingId/timeline", requireAuth(), generalLimiter, getBookingTimeline);

// ── DYNAMIC ROUTES AFTER ─────────────────────────────────────────────────────
// All /:bookingId routes registered after all static/named routes.
// Express will only reach these if no earlier route matched first.

// Manager records student checkout — sets actualEndDate
router.put("/:bookingId/checkout",        requireAuth(), generalLimiter,       checkoutStudent);

// Manager extends student stay beyond original end date
router.put("/:bookingId/extend",          requireAuth(), generalLimiter,       extendStay);

export default router;
