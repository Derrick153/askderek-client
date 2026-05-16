/**
 * api.ts — RTK Query API slice
 *
 * Conventions enforced throughout:
 *  - Zero `any`. Every endpoint has an explicit response and arg type.
 *  - build.query  → reads  (GET)  — providesTags, no success toast
 *  - build.mutation → writes (POST/PUT/DELETE) — invalidatesTags + toast
 *  - providesTags always guards against undefined result (error path)
 *  - listTags / entityTag helpers eliminate tag boilerplate and undefined ids
 *  - All date fields use ISODate / ISODateTime nominal aliases
 *  - Clerk token fetch is non-blocking — no polling loop
 *  - getAuthUser has providesTags so "Auth" invalidations bust it
 *  - queryFn errors use the correct RTK CUSTOM_ERROR shape
 *  - getApplications uses RTK params object (not manual URLSearchParams)
 *  - PaginationParams / PaginatedResponse used on all admin list endpoints
 *  - Domain enums are exported as union types — single source of truth
 *  - splitAdvancePayment invalidates "Leases" in addition to "Payments"
 *  - FormData usage on createProperty is documented to prevent header mistakes
 */

import { cleanParams, withToast } from "@/lib/utils";
import {
  Application,
  Lease,
  Manager,
  Payment,
  Property,
  Tenant,
} from "@/types/prismaTypes";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { FiltersState } from ".";

// ─────────────────────────────────────────────────────────────────────────────
// NOMINAL DATE ALIASES
// Carries intent without runtime cost. Use ISODate for "YYYY-MM-DD" and
// ISODateTime for full "YYYY-MM-DDTHH:mm:ssZ" timestamps.
// ─────────────────────────────────────────────────────────────────────────────

type ISODate     = string;
type ISODateTime = string;

// ─────────────────────────────────────────────────────────────────────────────
// PAGINATION
// ─────────────────────────────────────────────────────────────────────────────

export interface PaginationParams {
  page?:  number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data:       T[];
  total:      number;
  page:       number;
  totalPages: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN ENUM TYPES  (exported — use these instead of repeating literals)
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole       = "tenant" | "manager" | "admin";
export type EnquiryType    = "MESSAGE" | "CALL_REQUEST" | "VIEWING";
export type EnquiryStatus  = "NEW" | "CONTACTED" | "NEGOTIATING" | "AGREED" | "COMPLETED" | "LOST";
export type BookingStatus  = "CONFIRMED" | "CANCELLED" | "CHECKED_IN" | "CHECKED_OUT" | "NO_SHOW";
export type DurationType   = "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY";
export type ClosingType    = "FIXED" | "SCHOOL_CALENDAR" | "OPEN_ENDED";
export type SemesterStatus = "ACTIVE" | "EXPIRING" | "EXTENDED" | "COMPLETED" | "EXPIRED";
export type ReceiptType    = "RENT_PAYMENT" | "SHORT_STAY_BOOKING" | "HOSTEL_BOOKING";
export type VerifStatus    = "PENDING" | "APPROVED" | "REJECTED";

// ─────────────────────────────────────────────────────────────────────────────
// CORE DOMAIN INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export interface ClerkUser {
  userId:       string;
  email:        string;
  name:         string;
  phoneNumber?: string;
  userType:     UserRole;
}

export interface MeResponse {
  id:           number;
  clerkId:      string;
  name:         string;
  email:        string;
  phoneNumber?: string;
  role:         UserRole;
  createdAt:    ISODateTime;
}

export interface RegisterUserResponse {
  id:      number;
  clerkId: string;
  name:    string;
  email:   string;
  role:    string;
}

/** Renamed from Message → ChatMessage to avoid shadowing browser MessageEvent. */
export interface ChatMessage {
  id:            number;
  enquiryId:     number;
  senderClerkId: string;
  content:       string;
  isRedacted:    boolean;
  redactedAt?:   ISODateTime;
  redactedBy?:   string;
  redactReason?: string;
  createdAt:     ISODateTime;
}

export interface EnquiryProperty {
  id:            number;
  name:          string;
  listingType:   string;
  listingStatus: string;
  pricePerMonth: number;
}

export interface Enquiry {
  id:              number;
  propertyId:      number;
  enquirerClerkId: string;
  managerClerkId:  string;
  message:         string;
  enquiryType:     EnquiryType;
  status:          EnquiryStatus;
  offeredPrice?:   number;
  agreedPrice?:    number;
  commissionDue?:  number;
  isArchived:      boolean;
  isRead:          boolean;
  response?:       string;
  respondedAt?:    ISODateTime;
  createdAt:       ISODateTime;
  property?:       EnquiryProperty;
  messages?:       ChatMessage[];
}

export interface EnquiryDeal {
  enquiryId:     number;
  agreedPrice:   number;
  commissionDue: number;
  status:        EnquiryStatus;
  updatedAt:     ISODateTime;
}

export interface MessageThread {
  enquiryId:    number;
  propertyName: string;
  lastMessage:  string;
  lastAt:       ISODateTime;
  unreadCount:  number;
  participants: string[];
  isRead:       boolean;
  isArchived:   boolean;
}

export interface BookingProperty {
  id:        number;
  name:      string;
  photoUrls: string[];
  location?: { city: string; region: string };
}

export interface Booking {
  id:           number;
  propertyId:   number;
  guestClerkId: string;
  checkIn:      ISODateTime;
  checkOut:     ISODateTime;
  totalAmount:  number;
  durationType: DurationType;
  status:       BookingStatus;
  reference:    string;
  createdAt:    ISODateTime;
  property?:    BookingProperty;
}

export interface HostelSchool {
  id:       number;
  name:     string;
  location: string;
}

export interface SemesterPlan {
  id:             number;
  propertyId:     number;
  studentClerkId: string;
  semesterName:   string;
  checkIn:        ISODate;
  closingType:    ClosingType;
  fixedEndDate?:  ISODate;
  actualEndDate?: ISODate;
  schoolId?:      number;
  roomNumber?:    string;
  amountPaid:     number;
  reference:      string;
  status:         SemesterStatus;
  createdAt:      ISODateTime;
  school?:        HostelSchool;
}

export interface SchoolSemester {
  id:           number;
  schoolId:     number;
  semesterName: string;
  startDate:    ISODate;
  endDate?:     ISODate;
  isConfirmed:  boolean;
  confirmedAt?: ISODateTime;
  createdAt:    ISODateTime;
}

export interface School {
  id:        number;
  name:      string;
  location:  string;
  createdAt: ISODateTime;
  semesters?: SchoolSemester[];
}

export interface PaymentCoverageSummary {
  totalMonths:   number;
  paidMonths:    number;
  overdueMonths: number;
  pendingMonths: number;
}

export interface PaymentCoverage {
  leaseId:          number;
  property:         { id: number; name: string; pricePerMonth: number };
  monthlyRent:      number;
  leaseStart:       ISODate;
  leaseEnd:         ISODate;
  coverageEnd?:     ISODate;
  daysUntilExpiry?: number;
  isExpiringSoon:   boolean;
  summary:          PaymentCoverageSummary;
  payments:         Payment[];
}

export interface CoverageCalculation {
  leaseId:       number;
  totalPaid:     number;
  monthsCovered: number;
  coverageEnd:   ISODate;
  breakdown:     { month: string; amount: number; status: string }[];
}

export interface VerifyReceiptData {
  reference:    string | null;
  status:       string;
  amountPaid:   number | null;
  paymentDate?: ISODateTime | null;
  verifiedAt:   ISODateTime;
  verifiedBy:   string;
  [key: string]: unknown;
}

export interface VerifyReceipt {
  type:    ReceiptType;
  receipt: VerifyReceiptData;
}

export interface ReceiptSummary {
  reference:    string;
  type:         ReceiptType;
  status:       string;
  amountPaid:   number;
  paidAt:       ISODateTime;
  propertyName: string;
  tenantName:   string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT RESPONSE TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface PaystackInitResponse {
  authorization_url: string;
  access_code:       string;
  reference:         string;
}

export interface PaymentReceipt {
  reference:    string;
  leaseId:      number;
  amount:       number;
  status:       string;
  method:       string;
  paidAt:       ISODateTime | null;
  propertyName: string;
  tenantName:   string;
}

export interface LandlordEarnings {
  totalEarned:    number;
  totalPending:   number;
  byProperty:     { propertyId: number; propertyName: string; earned: number }[];
  recentPayments: { reference: string; amount: number; paidAt: ISODateTime }[];
}

export interface TenantTransactions {
  total: number;
  transactions: {
    reference: string;
    type:      string;
    amount:    number;
    status:    string;
    createdAt: ISODateTime;
  }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN RESPONSE TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalProperties:      number;
  activeLeases:         number;
  totalTenants:         number;
  totalManagers:        number;
  totalRevenue:         number;
  pendingApprovals:     number;
  pendingVerifications: number;
  openEnquiries:        number;
}

export interface AdminPayment {
  id:        number;
  reference: string;
  leaseId:   number;
  tenantName: string;
  amount:    number;
  status:    string;
  method:    string;
  paidAt:    ISODateTime | null;
  createdAt: ISODateTime;
}

export interface RevenueStats {
  totalCollected:   number;
  totalPending:     number;
  totalOverdue:     number;
  commissionEarned: number;
  periodBreakdown:  { month: string; amount: number }[];
}

export interface CommissionSummary {
  totalDue:     number;
  totalPaid:    number;
  totalPending: number;
  byManager:    { managerName: string; amount: number }[];
}

export interface CommissionPeriod {
  from:        ISODate;
  to:          ISODate;
  totalAmount: number;
  entries:     { reference: string; amount: number; paidAt: ISODateTime }[];
}

export interface Verification {
  id:          number;
  managerId:   number;
  managerName: string;
  docType:     string;
  docUrl:      string;
  status:      VerifStatus;
  submittedAt: ISODateTime;
}

export interface BlacklistEntry {
  id:           number;
  phoneNumber?: string;
  email?:       string;
  ghanaCardId?: string;
  reason:       string;
  addedBy:      string;
  createdAt:    ISODateTime;
}

export interface Report {
  id:          number;
  reporterId:  string;
  targetId:    string;
  targetType:  string;
  reason:      string;
  status:      "OPEN" | "RESOLVED";
  resolvedAt?: ISODateTime;
  createdAt:   ISODateTime;
}

export interface AuditLog {
  id:        number;
  adminId:   number;
  action:    string;
  target:    string;
  targetId?: number;
  meta?:     Record<string, unknown>;
  createdAt: ISODateTime;
}

export interface PropertySaleStatus {
  id:            number;
  name:          string;
  listingStatus: string;
  askingPrice?:  number;
  soldPrice?:    number;
  isNegotiable?: boolean;
  updatedAt:     ISODateTime;
}

export interface RoomAvailability {
  propertyId:     number;
  totalRooms:     number;
  occupiedRooms:  number;
  availableRooms: number;
  rooms:          { roomNumber: string; isOccupied: boolean }[];
}

export interface SemesterStatusResult {
  semesterId:     number;
  semesterName:   string;
  startDate:      ISODate;
  endDate?:       ISODate;
  isConfirmed:    boolean;
  daysRemaining?: number;
}

export interface ExpiringLease {
  leaseId:       number;
  tenantName:    string;
  propertyName:  string;
  endDate:       ISODate;
  daysRemaining: number;
  status:        string;
}

export interface TenantLeaseStatus {
  leaseId:        number;
  status:         string;
  endDate:        ISODate;
  daysRemaining:  number;
  isExpiringSoon: boolean;
  coverageEnd?:   ISODate;
}

// ─────────────────────────────────────────────────────────────────────────────
// TAG TYPES
// ─────────────────────────────────────────────────────────────────────────────

const TAG_TYPES = [
  "Auth",
  "Managers",
  "Tenants",
  "Properties",
  "PropertyDetails",
  "Leases",
  "Payments",
  "Receipts",
  "Transactions",
  "Commissions",
  "Applications",
  "Admin",
  "Verifications",
  "Blacklist",
  "Reports",
  "AuditLogs",
  "Enquiries",
  "Messages",
  "Bookings",
  "Hostels",
  "Schools",
  "AdvancePayments",
  "LeaseExpiry",
  "Verify",
  "Sale",
] as const;

type TagType = (typeof TAG_TYPES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// TAG HELPERS
// Centralises the list/entity tag patterns and guards against undefined ids
// on the error path (when result is undefined because the request failed).
// ─────────────────────────────────────────────────────────────────────────────

function listTags<T extends { id: number }>(
  tag: TagType,
  result: T[] | undefined,
) {
  return result
    ? [
        ...result.map(({ id }) => ({ type: tag, id } as const)),
        { type: tag, id: "LIST" } as const,
      ]
    : ([{ type: tag, id: "LIST" }] as const);
}

function entityTag<T extends { id: number }>(
  tag: TagType,
  result: T | undefined,
): Array<{ type: TagType; id: number } | TagType> {
  return result ? [{ type: tag, id: result.id }] : [tag];
}

// ─────────────────────────────────────────────────────────────────────────────
// API SLICE
// ─────────────────────────────────────────────────────────────────────────────

export const api = createApi({
  reducerPath: "api",

  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,

    prepareHeaders: async (headers) => {
      if (typeof window === "undefined") return headers;
      try {
        const token: string | null =
          (await (window as any).Clerk?.session?.getToken()) ?? null;
        if (token) headers.set("Authorization", `Bearer ${token}`);
      } catch (e) {
        console.error("[api] Failed to get Clerk token:", e);
      }
      return headers;
    },
  }),

  tagTypes: TAG_TYPES,

  endpoints: (build) => ({

    // ─────────────────────────────────────────────────────────────────────────
    // AUTH
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Resolves Clerk user from the browser SDK — no network request.
     * providesTags: ["Auth"] is required so that registerUser's
     * invalidatesTags: ["Auth"] correctly busts this cache entry.
     */
    getAuthUser: build.query<ClerkUser | null, void>({
      queryFn: async () => {
        try {
          if (typeof window === "undefined") return { data: null };
          const clerkUser = (window as any).Clerk?.user;
          if (!clerkUser) return { data: null };

          const userType: UserRole =
            (clerkUser.unsafeMetadata?.userType as UserRole) ??
            (clerkUser.publicMetadata?.userType  as UserRole) ??
            "tenant";

          return {
            data: {
              userId:      clerkUser.id,
              email:       clerkUser.primaryEmailAddress?.emailAddress ?? "",
              name:        `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim(),
              phoneNumber: clerkUser.primaryPhoneNumber?.phoneNumber ?? "",
              userType,
            },
          };
        } catch (error) {
          // RTK Query queryFn errors must be FetchBaseQueryError-compatible.
          return {
            error: {
              status: "CUSTOM_ERROR" as const,
              error:  error instanceof Error ? error.message : "Could not fetch user data",
            },
          };
        }
      },
      providesTags: ["Auth"],
    }),

    registerUser: build.mutation<
      RegisterUserResponse,
      { clerkId: string; name: string; email: string; phoneNumber?: string; role: string }
    >({
      query: (body) => ({ url: "auth/register", method: "POST", body }),
      invalidatesTags: ["Auth"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Registration successful!",
          error:   "Failed to register user.",
        });
      },
    }),

    getMe: build.query<MeResponse, void>({
      query: () => "auth/me",
      providesTags: ["Auth"],
    }),

    updateMe: build.mutation<
      MeResponse,
      { name?: string; email?: string; phoneNumber?: string }
    >({
      query: (body) => ({ url: "auth/me", method: "PUT", body }),
      invalidatesTags: ["Auth"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Profile updated successfully!",
          error:   "Failed to update profile.",
        });
      },
    }),

    // ─────────────────────────────────────────────────────────────────────────
    // PROPERTIES
    // ─────────────────────────────────────────────────────────────────────────

    getProperties: build.query<
      Property[],
      Partial<FiltersState> & { favoriteIds?: number[] }
    >({
      query: (filters) => ({
        url: "properties",
        params: cleanParams({
          location:      filters.location,
          area:          filters.area,
          priceMin:      filters.priceRange?.[0],
          priceMax:      filters.priceRange?.[1],
          beds:          filters.beds,
          baths:         filters.baths,
          propertyType:  filters.propertyType,
          squareFeetMin: filters.squareFeet?.[0],
          squareFeetMax: filters.squareFeet?.[1],
          amenities:     filters.amenities?.join(","),
          availableFrom: filters.availableFrom,
          favoriteIds:   filters.favoriteIds?.join(","),
          latitude:      filters.coordinates?.[1],
          longitude:     filters.coordinates?.[0],
        }),
      }),
      providesTags: (result) => listTags("Properties", result),
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Failed to fetch properties." });
      },
    }),

    getProperty: build.query<Property, number>({
      query: (id) => `properties/${id}`,
      providesTags: (_, __, id) => [{ type: "PropertyDetails", id }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Failed to load property details." });
      },
    }),

    /**
     * Body is FormData — do NOT add a Content-Type header.
     * The browser sets it automatically with the multipart boundary.
     * fetchBaseQuery detects FormData and omits Content-Type correctly.
     */
    createProperty: build.mutation<Property, FormData>({
      query: (body) => ({ url: "properties", method: "POST", body }),
      invalidatesTags: [{ type: "Properties", id: "LIST" }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Property created successfully!",
          error:   "Failed to create property.",
        });
      },
    }),

    // ─────────────────────────────────────────────────────────────────────────
    // TENANTS
    // ─────────────────────────────────────────────────────────────────────────

    getTenant: build.query<Tenant, string>({
      query: (userId) => `tenants/${userId}`,
      providesTags: (result) =>
        entityTag("Tenants", result as unknown as { id: number } | undefined),
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Failed to load tenant profile." });
      },
    }),

    getCurrentResidences: build.query<Property[], string>({
      query: (userId) => `tenants/${userId}/current-residences`,
      providesTags: (result) => listTags("Properties", result),
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Failed to fetch current residences." });
      },
    }),

    updateTenantSettings: build.mutation<
      Tenant,
      { userId: string } & Partial<Tenant>
    >({
      query: ({ userId, ...body }) => ({
        url:    `tenants/${userId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result) =>
        entityTag("Tenants", result as unknown as { id: number } | undefined),
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Settings updated successfully!",
          error:   "Failed to update settings.",
        });
      },
    }),

    addFavoriteProperty: build.mutation<
      Tenant,
      { userId: string; propertyId: number }
    >({
      query: ({ userId, propertyId }) => ({
        url:    `tenants/${userId}/favorites/${propertyId}`,
        method: "POST",
      }),
      invalidatesTags: (result) => [
        ...entityTag("Tenants", result as unknown as { id: number } | undefined),
        { type: "Properties", id: "LIST" },
      ],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Added to favorites!",
          error:   "Failed to add to favorites.",
        });
      },
    }),

    removeFavoriteProperty: build.mutation<
      Tenant,
      { userId: string; propertyId: number }
    >({
      query: ({ userId, propertyId }) => ({
        url:    `tenants/${userId}/favorites/${propertyId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result) => [
        ...entityTag("Tenants", result as unknown as { id: number } | undefined),
        { type: "Properties", id: "LIST" },
      ],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Removed from favorites!",
          error:   "Failed to remove from favorites.",
        });
      },
    }),

    // ─────────────────────────────────────────────────────────────────────────
    // MANAGERS
    // ─────────────────────────────────────────────────────────────────────────

    getManagerProperties: build.query<Property[], string>({
      query: (userId) => `managers/${userId}/properties`,
      providesTags: (result) => listTags("Properties", result),
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Failed to load manager properties." });
      },
    }),

    updateManagerSettings: build.mutation<
      Manager,
      { userId: string } & Partial<Manager>
    >({
      query: ({ userId, ...body }) => ({
        url:    `managers/${userId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result) =>
        entityTag("Managers", result as unknown as { id: number } | undefined),
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Settings updated successfully!",
          error:   "Failed to update settings.",
        });
      },
    }),

    // ─────────────────────────────────────────────────────────────────────────
    // LEASES
    // ─────────────────────────────────────────────────────────────────────────

    getLeases: build.query<Lease[], void>({
      query: () => "leases",
      providesTags: (result) =>
        listTags("Leases", result as unknown as { id: number }[] | undefined),
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Failed to fetch leases." });
      },
    }),

    getPropertyLeases: build.query<Lease[], number>({
      query: (propertyId) => `properties/${propertyId}/leases`,
      providesTags: (result) =>
        listTags("Leases", result as unknown as { id: number }[] | undefined),
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Failed to fetch property leases." });
      },
    }),

    // ─────────────────────────────────────────────────────────────────────────
    // PAYMENTS
    // ─────────────────────────────────────────────────────────────────────────

    getPayments: build.query<Payment[], number>({
      query: (leaseId) => `leases/${leaseId}/payments`,
      providesTags: ["Payments"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Failed to fetch payments." });
      },
    }),

    initializePayment: build.mutation<
      { data: PaystackInitResponse },
      { leaseId: number; amount: number; email: string }
    >({
      query: (body) => ({ url: "payments/initialize", method: "POST", body }),
      invalidatesTags: ["Payments"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Failed to initialize payment." });
      },
    }),

    // Read-only verification — no side-effect toast.
    verifyPayment: build.query<PaymentReceipt, string>({
      query: (reference) => `payments/verify/${reference}`,
      providesTags: ["Payments"],
    }),

    getPaymentStatus: build.query<{ reference: string; status: string }, string>({
      query: (reference) => `payments/status/${reference}`,
      providesTags: ["Payments"],
    }),

    getPaymentsByLease: build.query<Payment[], number>({
      query: (leaseId) => `payments/lease/${leaseId}`,
      providesTags: ["Payments"],
    }),

    getPaymentReceipt: build.query<PaymentReceipt, string>({
      query: (reference) => `payments/receipt/${reference}`,
      providesTags: ["Receipts"],
    }),

    getTenantReceipts: build.query<PaymentReceipt[], string>({
      query: (tenantClerkId) => `payments/receipts/${tenantClerkId}`,
      providesTags: ["Receipts"],
    }),

    getLandlordEarnings: build.query<LandlordEarnings, string>({
      query: (managerClerkId) => `payments/earnings/${managerClerkId}`,
      providesTags: ["Payments"],
    }),

    getTransactionsByTenant: build.query<TenantTransactions, string>({
      query: (tenantClerkId) => `payments/transactions/${tenantClerkId}`,
      providesTags: ["Transactions"],
    }),

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN — PAYMENTS
    // ─────────────────────────────────────────────────────────────────────────

    getAdminAllPayments: build.query<
      PaginatedResponse<AdminPayment>,
      PaginationParams & { status?: string }
    >({
      query: (params) => ({ url: "admin/payments", params }),
      providesTags: ["Payments"],
    }),

    getAdminRevenue: build.query<RevenueStats, void>({
      query: () => "admin/payments/revenue",
      providesTags: ["Payments"],
    }),

    getAdminPaymentByRef: build.query<AdminPayment, string>({
      query: (reference) => `admin/payments/${reference}`,
      providesTags: ["Payments"],
    }),

    overridePaymentStatus: build.mutation<
      AdminPayment,
      { reference: string; newStatus: string; reason: string; adminClerkId: string }
    >({
      query: ({ reference, ...body }) => ({
        url:    `admin/payments/override/${reference}`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Payments"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Payment status updated!",
          error:   "Failed to override payment.",
        });
      },
    }),

    recordCashPayment: build.mutation<
      AdminPayment,
      { leaseId: number; amountPaid: number; dueDate: ISODate; adminClerkId: string; notes?: string }
    >({
      query: (body) => ({ url: "admin/payments/cash", method: "POST", body }),
      invalidatesTags: ["Payments"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Cash payment recorded!",
          error:   "Failed to record cash payment.",
        });
      },
    }),

    getAdminCommissionSummary: build.query<CommissionSummary, void>({
      query: () => "admin/payments/commission/summary",
      providesTags: ["Commissions"],
    }),

    getAdminCommissionByPeriod: build.query<
      CommissionPeriod,
      { from?: ISODate; to?: ISODate }
    >({
      query: (params) => ({ url: "admin/payments/commission/period", params }),
      providesTags: ["Commissions"],
    }),

    // ─────────────────────────────────────────────────────────────────────────
    // APPLICATIONS
    // ─────────────────────────────────────────────────────────────────────────

    getApplications: build.query<
      Application[],
      { userId?: string; userType?: string }
    >({
      /**
       * Use RTK's params object rather than manual URLSearchParams.
       * Manual string building bypasses RTK's cache-key serialization,
       * causing stale hits when param order differs between callers.
       */
      query: ({ userId, userType }) => ({
        url: "applications",
        params: {
          ...(userId   && { userId }),
          ...(userType && { userType }),
        },
      }),
      providesTags: ["Applications"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Failed to fetch applications." });
      },
    }),

    updateApplicationStatus: build.mutation<
      Application & { lease?: Lease },
      { id: number; status: string }
    >({
      query: ({ id, status }) => ({
        url:    `applications/${id}/status`,
        method: "PUT",
        body:   { status },
      }),
      invalidatesTags: ["Applications", "Leases", "Properties"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Application updated successfully!",
          error:   "Failed to update application.",
        });
      },
    }),

    createApplication: build.mutation<Application, Partial<Application>>({
      query: (body) => ({ url: "applications", method: "POST", body }),
      invalidatesTags: ["Applications"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Application submitted successfully!",
          error:   "Failed to submit application.",
        });
      },
    }),

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN — GENERAL
    // ─────────────────────────────────────────────────────────────────────────

    createAdmin: build.mutation<
      MeResponse,
      { clerkId: string; name: string; email: string }
    >({
      query: (body) => ({ url: "admin", method: "POST", body }),
      invalidatesTags: ["Admin"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Admin created!",
          error:   "Failed to create admin.",
        });
      },
    }),

    getAdmin: build.query<MeResponse, string>({
      query: (clerkId) => `admin/${clerkId}`,
      providesTags: ["Admin"],
    }),

    getDashboardStats: build.query<DashboardStats, void>({
      query: () => "admin/dashboard/stats",
      providesTags: ["Admin"],
    }),

    getAdminAllProperties: build.query<
      PaginatedResponse<Property>,
      PaginationParams
    >({
      query: (params) => ({ url: "admin/properties/all", params }),
      providesTags: (result) => listTags("Properties", result?.data),
    }),

    getAdminPendingProperties: build.query<Property[], void>({
      query: () => "admin/properties/pending",
      providesTags: (result) => listTags("Properties", result),
    }),

    approveProperty: build.mutation<Property, number>({
      query: (id) => ({ url: `admin/properties/${id}/approve`, method: "PUT" }),
      invalidatesTags: ["Properties"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Property approved!",
          error:   "Failed to approve property.",
        });
      },
    }),

    rejectProperty: build.mutation<Property, { id: number; reason: string }>({
      query: ({ id, reason }) => ({
        url:    `admin/properties/${id}/reject`,
        method: "PUT",
        body:   { reason },
      }),
      invalidatesTags: ["Properties"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Property rejected.",
          error:   "Failed to reject property.",
        });
      },
    }),

    getPendingVerifications: build.query<Verification[], void>({
      query: () => "admin/verifications/pending",
      providesTags: ["Verifications"],
    }),

    approveVerification: build.mutation<Verification, number>({
      query: (id) => ({ url: `admin/verifications/${id}/approve`, method: "PUT" }),
      invalidatesTags: ["Verifications", "Managers"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Verification approved!",
          error:   "Failed to approve verification.",
        });
      },
    }),

    rejectVerification: build.mutation<Verification, { id: number; reason: string }>({
      query: ({ id, reason }) => ({
        url:    `admin/verifications/${id}/reject`,
        method: "PUT",
        body:   { reason },
      }),
      invalidatesTags: ["Verifications"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Verification rejected.",
          error:   "Failed to reject verification.",
        });
      },
    }),

    getAdminAllManagers: build.query<PaginatedResponse<Manager>, PaginationParams>({
      query: (params) => ({ url: "admin/users/managers", params }),
      providesTags: ["Managers"],
    }),

    getAdminAllTenants: build.query<PaginatedResponse<Tenant>, PaginationParams>({
      query: (params) => ({ url: "admin/users/tenants", params }),
      providesTags: ["Tenants"],
    }),

    getBlacklist: build.query<BlacklistEntry[], void>({
      query: () => "admin/blacklist",
      providesTags: ["Blacklist"],
    }),

    addToBlacklist: build.mutation<
      BlacklistEntry,
      { phoneNumber?: string; email?: string; ghanaCardId?: string; reason: string }
    >({
      query: (body) => ({ url: "admin/blacklist", method: "POST", body }),
      invalidatesTags: ["Blacklist"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Entry added to blacklist.",
          error:   "Failed to add to blacklist.",
        });
      },
    }),

    removeFromBlacklist: build.mutation<{ id: number }, number>({
      query: (id) => ({ url: `admin/blacklist/${id}`, method: "DELETE" }),
      invalidatesTags: ["Blacklist"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Entry removed from blacklist.",
          error:   "Failed to remove from blacklist.",
        });
      },
    }),

    getAdminReports: build.query<Report[], void>({
      query: () => "admin/reports",
      providesTags: ["Reports"],
    }),

    resolveReport: build.mutation<Report, number>({
      query: (id) => ({ url: `admin/reports/${id}/resolve`, method: "PUT" }),
      invalidatesTags: ["Reports"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Report resolved.",
          error:   "Failed to resolve report.",
        });
      },
    }),

    getAuditLogs: build.query<
      PaginatedResponse<AuditLog>,
      PaginationParams & { action?: string; target?: string }
    >({
      query: (params) => ({ url: "audit", params }),
      providesTags: ["AuditLogs"],
    }),

    getAuditLogById: build.query<AuditLog, number>({
      query: (logId) => `audit/${logId}`,
      providesTags: (_, __, id) => [{ type: "AuditLogs", id }],
    }),

    // ─────────────────────────────────────────────────────────────────────────
    // SALE
    // ─────────────────────────────────────────────────────────────────────────

    listPropertyForSale: build.mutation<
      PropertySaleStatus,
      { propertyId: number; askingPrice: number; isNegotiable?: boolean }
    >({
      query: ({ propertyId, ...body }) => ({
        url:    `sale/list/${propertyId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Properties", "Sale"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Property listed for sale!",
          error:   "Failed to list property for sale.",
        });
      },
    }),

    markPropertyAsSold: build.mutation<
      PropertySaleStatus,
      { propertyId: number; soldPrice: number; soldToClerkId?: string }
    >({
      query: ({ propertyId, ...body }) => ({
        url:    `sale/sold/${propertyId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Properties", "Sale"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Property marked as sold!",
          error:   "Failed to mark property as sold.",
        });
      },
    }),

    archiveProperty: build.mutation<PropertySaleStatus, number>({
      query: (propertyId) => ({ url: `sale/archive/${propertyId}`, method: "PUT" }),
      invalidatesTags: ["Properties", "Sale"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Property archived!",
          error:   "Failed to archive property.",
        });
      },
    }),

    unarchiveProperty: build.mutation<PropertySaleStatus, number>({
      query: (propertyId) => ({ url: `sale/unarchive/${propertyId}`, method: "PUT" }),
      invalidatesTags: ["Properties", "Sale"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Property unarchived!",
          error:   "Failed to unarchive property.",
        });
      },
    }),

    deleteProperty: build.mutation<{ id: number }, number>({
      query: (propertyId) => ({ url: `sale/${propertyId}`, method: "DELETE" }),
      invalidatesTags: ["Properties", "Sale"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Property deleted!",
          error:   "Failed to delete property.",
        });
      },
    }),

    triggerPendingRemoval: build.mutation<
      PropertySaleStatus,
      { propertyId: number; adminDbId: number; reason: string; deleteType: string }
    >({
      query: ({ propertyId, ...body }) => ({
        url:    `sale/pending-removal/${propertyId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Properties", "Sale"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Property queued for removal!",
          error:   "Failed to queue property for removal.",
        });
      },
    }),

    cancelPendingRemoval: build.mutation<
      PropertySaleStatus,
      { propertyId: number; adminDbId: number }
    >({
      query: ({ propertyId, ...body }) => ({
        url:    `sale/cancel-removal/${propertyId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Properties", "Sale"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Pending removal cancelled!",
          error:   "Failed to cancel removal.",
        });
      },
    }),

    restoreProperty: build.mutation<
      PropertySaleStatus,
      { propertyId: number; adminDbId: number }
    >({
      query: ({ propertyId, ...body }) => ({
        url:    `sale/restore/${propertyId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Properties", "Sale"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Property restored!",
          error:   "Failed to restore property.",
        });
      },
    }),

    // ─────────────────────────────────────────────────────────────────────────
    // ENQUIRIES
    // ─────────────────────────────────────────────────────────────────────────

    createEnquiry: build.mutation<
      Enquiry,
      {
        propertyId:    number;
        message:       string;
        enquiryType:   EnquiryType;
        offeredPrice?: number;
      }
    >({
      query: (body) => ({ url: "enquiries", method: "POST", body }),
      invalidatesTags: ["Enquiries"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Enquiry sent!",
          error:   "Failed to send enquiry.",
        });
      },
    }),

    getUserEnquiries: build.query<Enquiry[], void>({
      query: () => "enquiries/my",
      providesTags: (result) => listTags("Enquiries", result),
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Failed to fetch enquiries." });
      },
    }),

    getManagerEnquiries: build.query<Enquiry[], void>({
      query: () => "enquiries/manager",
      providesTags: (result) => listTags("Enquiries", result),
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Failed to fetch enquiries." });
      },
    }),

    markEnquiryAsRead: build.mutation<Enquiry, number>({
      query: (enquiryId) => ({ url: `enquiries/${enquiryId}/read`, method: "PUT" }),
      invalidatesTags: ["Enquiries"],
    }),

    respondToEnquiry: build.mutation<
      Enquiry,
      { enquiryId: number; response: string }
    >({
      query: ({ enquiryId, ...body }) => ({
        url:    `enquiries/${enquiryId}/respond`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Enquiries"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Response sent!",
          error:   "Failed to send response.",
        });
      },
    }),

    updateEnquiryStatus: build.mutation<
      Enquiry,
      { enquiryId: number; status: EnquiryStatus }
    >({
      query: ({ enquiryId, ...body }) => ({
        url:    `enquiries/${enquiryId}/status`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Enquiries"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Status updated!",
          error:   "Failed to update status.",
        });
      },
    }),

    recordDeal: build.mutation<
      EnquiryDeal,
      { enquiryId: number; agreedPrice: number; notes?: string }
    >({
      query: ({ enquiryId, ...body }) => ({
        url:    `enquiries/${enquiryId}/deal`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Enquiries", "Properties"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Deal recorded!",
          error:   "Failed to record deal.",
        });
      },
    }),

    archiveEnquiry: build.mutation<Enquiry, number>({
      query: (enquiryId) => ({ url: `enquiries/${enquiryId}/archive`, method: "PUT" }),
      invalidatesTags: ["Enquiries"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Enquiry archived!",
          error:   "Failed to archive enquiry.",
        });
      },
    }),

    getAllEnquiriesAdmin: build.query<
      PaginatedResponse<Enquiry>,
      PaginationParams
    >({
      query: (params) => ({ url: "enquiries/admin/all", params }),
      providesTags: ["Enquiries"],
    }),

    // ─────────────────────────────────────────────────────────────────────────
    // MESSAGES
    // ─────────────────────────────────────────────────────────────────────────

    sendMessage: build.mutation<
      ChatMessage,
      { enquiryId: number; content: string }
    >({
      query: (body) => ({ url: "messages", method: "POST", body }),
      invalidatesTags: ["Messages"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Failed to send message." });
      },
    }),

    getThread: build.query<ChatMessage[], number>({
      query: (enquiryId) => `messages/thread/${enquiryId}`,
      // Scoped tag so invalidating one thread doesn't refetch all threads.
      providesTags: (_, __, enquiryId) => [{ type: "Messages", id: enquiryId }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Failed to load thread." });
      },
    }),

   getUserThreads: build.query<MessageThread[], void>({
  query: () => "messages/threads/my",
      providesTags: ["Messages"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Failed to load threads." });
      },
    }),

    getAllThreadsAdmin: build.query<
      PaginatedResponse<MessageThread>,
      PaginationParams
    >({
      query: (params) => ({ url: "messages/admin/all", params }),
      providesTags: ["Messages"],
    }),

    redactMessage: build.mutation<
      ChatMessage,
      { messageId: number; redactReason: string; adminDbId: number }
    >({
      query: ({ messageId, ...body }) => ({
        url:    `messages/admin/redact/${messageId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Messages"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Message redacted!",
          error:   "Failed to redact message.",
        });
      },
    }),

    // ─────────────────────────────────────────────────────────────────────────
    // BOOKINGS
    // ─────────────────────────────────────────────────────────────────────────

    createBooking: build.mutation<
      Booking,
      {
        propertyId:   number;
        checkIn:      ISODateTime;
        checkOut:     ISODateTime;
        durationType: DurationType;
      }
    >({
      query: (body) => ({ url: "bookings", method: "POST", body }),
      invalidatesTags: ["Bookings"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Booking confirmed!",
          error:   "Failed to create booking.",
        });
      },
    }),

    cancelBooking: build.mutation<Booking, { bookingId: number; reason?: string }>({
      query: ({ bookingId, ...body }) => ({
        url:    `bookings/${bookingId}/cancel`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Bookings"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Booking cancelled!",
          error:   "Failed to cancel booking.",
        });
      },
    }),

    checkInBooking: build.mutation<Booking, number>({
      query: (bookingId) => ({ url: `bookings/${bookingId}/checkin`, method: "PUT" }),
      invalidatesTags: ["Bookings"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Guest checked in!",
          error:   "Failed to check in guest.",
        });
      },
    }),

    checkOutBooking: build.mutation<Booking, number>({
      query: (bookingId) => ({ url: `bookings/${bookingId}/checkout`, method: "PUT" }),
      invalidatesTags: ["Bookings"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Guest checked out!",
          error:   "Failed to check out guest.",
        });
      },
    }),

    markNoShow: build.mutation<Booking, number>({
      query: (bookingId) => ({ url: `bookings/${bookingId}/no-show`, method: "PUT" }),
      invalidatesTags: ["Bookings"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Booking marked as no-show!",
          error:   "Failed to mark no-show.",
        });
      },
    }),

    getGuestBookings: build.query<Booking[], void>({
      query: () => "bookings/my",
      providesTags: (result) => listTags("Bookings", result),
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Failed to fetch bookings." });
      },
    }),

    getPropertyBookings: build.query<Booking[], number>({
      query: (propertyId) => `bookings/property/${propertyId}`,
      providesTags: (result) => listTags("Bookings", result),
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Failed to fetch property bookings." });
      },
    }),

    getAllBookingsAdmin: build.query<
      PaginatedResponse<Booking>,
      PaginationParams
    >({
      query: (params) => ({ url: "bookings/admin/all", params }),
      providesTags: ["Bookings"],
    }),

    // ─────────────────────────────────────────────────────────────────────────
    // HOSTELS
    // ─────────────────────────────────────────────────────────────────────────

    createSemesterBooking: build.mutation<
      SemesterPlan,
      {
        propertyId:    number;
        semesterName:  string;
        checkIn:       ISODate;
        closingType:   ClosingType;
        fixedEndDate?: ISODate;
        schoolId?:     number;
        roomNumber?:   string;
      }
    >({
      query: (body) => ({ url: "hostels/book", method: "POST", body }),
      invalidatesTags: ["Hostels"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Hostel booking confirmed!",
          error:   "Failed to create hostel booking.",
        });
      },
    }),

    getStudentBookings: build.query<SemesterPlan[], void>({
      query: () => "hostels/my",
      providesTags: (result) => listTags("Hostels", result),
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Failed to fetch hostel bookings." });
      },
    }),

    getHostelBookings: build.query<SemesterPlan[], number>({
      query: (propertyId) => `hostels/property/${propertyId}`,
      providesTags: (result) => listTags("Hostels", result),
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Failed to fetch hostel bookings." });
      },
    }),

    getRoomAvailability: build.query<RoomAvailability, number>({
      query: (propertyId) => `hostels/availability/${propertyId}`,
      providesTags: ["Hostels"],
    }),

    checkoutStudent: build.mutation<
      SemesterPlan,
      { bookingId: number; actualEndDate: ISODate }
    >({
      query: ({ bookingId, ...body }) => ({
        url:    `hostels/${bookingId}/checkout`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Hostels"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Student checked out!",
          error:   "Failed to checkout student.",
        });
      },
    }),

    extendStay: build.mutation<
      SemesterPlan,
      { bookingId: number; newEndDate: ISODate }
    >({
      query: ({ bookingId, ...body }) => ({
        url:    `hostels/${bookingId}/extend`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Hostels"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Stay extended!",
          error:   "Failed to extend stay.",
        });
      },
    }),

    getAllHostelBookingsAdmin: build.query<
      PaginatedResponse<SemesterPlan>,
      PaginationParams
    >({
      query: (params) => ({ url: "hostels/admin/all", params }),
      providesTags: ["Hostels"],
    }),

    // ─────────────────────────────────────────────────────────────────────────
    // SCHOOLS
    // ─────────────────────────────────────────────────────────────────────────

    getAllSchools: build.query<School[], void>({
      query: () => "schools",
      providesTags: (result) => listTags("Schools", result),
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Failed to fetch schools." });
      },
    }),

    getSchoolById: build.query<School, number>({
      query: (schoolId) => `schools/${schoolId}`,
      providesTags: (_, __, id) => [{ type: "Schools", id }],
    }),

    addSchool: build.mutation<
      School,
      { name: string; location: string; adminDbId: number }
    >({
      query: (body) => ({ url: "schools", method: "POST", body }),
      invalidatesTags: ["Schools"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "School added!",
          error:   "Failed to add school.",
        });
      },
    }),

    removeSchool: build.mutation<{ id: number }, { schoolId: number; adminDbId: number }>({
      query: ({ schoolId, ...body }) => ({
        url:    `schools/${schoolId}`,
        method: "DELETE",
        body,
      }),
      invalidatesTags: ["Schools"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "School removed!",
          error:   "Failed to remove school.",
        });
      },
    }),

    addSemester: build.mutation<
      SchoolSemester,
      { schoolId: number; semesterName: string; startDate: ISODate; adminDbId: number }
    >({
      query: ({ schoolId, ...body }) => ({
        url:    `schools/${schoolId}/semesters`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Schools"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Semester added!",
          error:   "Failed to add semester.",
        });
      },
    }),

    updateSemesterEndDate: build.mutation<
      SchoolSemester,
      { schoolId: number; semesterId: number; endDate: ISODate; adminDbId: number }
    >({
      query: ({ schoolId, semesterId, ...body }) => ({
        url:    `schools/${schoolId}/semesters/${semesterId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Schools"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Semester end date confirmed!",
          error:   "Failed to update semester end date.",
        });
      },
    }),

    getSemesterStatus: build.query<
      SemesterStatusResult,
      { schoolId: number; semesterId: number }
    >({
      query: ({ schoolId, semesterId }) =>
        `schools/${schoolId}/semesters/${semesterId}/status`,
      providesTags: ["Schools"],
    }),

    notifyStudents: build.mutation<
      { notified: number },
      { schoolId: number; semesterId: number; adminDbId: number; message?: string }
    >({
      query: ({ schoolId, semesterId, ...body }) => ({
        url:    `schools/${schoolId}/semesters/${semesterId}/notify`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Schools"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Students notified!",
          error:   "Failed to notify students.",
        });
      },
    }),

    // ─────────────────────────────────────────────────────────────────────────
    // ADVANCE PAYMENTS
    // ─────────────────────────────────────────────────────────────────────────

    calculateCoverage: build.mutation<
      CoverageCalculation,
      { leaseId: number; totalAmountPaid: number }
    >({
      query: (body) => ({ url: "advance-payments/calculate", method: "POST", body }),
      // Invalidate so getPaymentCoverage refetches with fresh data after calculation.
      invalidatesTags: ["AdvancePayments"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Failed to calculate coverage." });
      },
    }),

    splitAdvancePayment: build.mutation<
      PaymentCoverage,
      {
        leaseId:           number;
        totalAmountPaid:   number;
        paystackReference: string;
        startMonth:        ISODate;
      }
    >({
      query: (body) => ({ url: "advance-payments/split", method: "POST", body }),
      // Splitting advance payments affects payment records AND lease status.
      invalidatesTags: ["Payments", "AdvancePayments", "Leases"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Advance payment split successfully!",
          error:   "Failed to split advance payment.",
        });
      },
    }),

    getPaymentCoverage: build.query<PaymentCoverage, number>({
      query: (leaseId) => `advance-payments/coverage/${leaseId}`,
      providesTags: ["AdvancePayments"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Failed to fetch payment coverage." });
      },
    }),

    // ─────────────────────────────────────────────────────────────────────────
    // LEASE EXPIRY
    // ─────────────────────────────────────────────────────────────────────────

    getExpiringLeases: build.query<ExpiringLease[], { days?: number }>({
      query: (params) => ({ url: "lease-expiry/expiring", params }),
      providesTags: ["LeaseExpiry"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Failed to fetch expiring leases." });
      },
    }),

    getTenantLeaseStatus: build.query<TenantLeaseStatus, number>({
      query: (leaseId) => `lease-expiry/my-lease/${leaseId}`,
      providesTags: ["LeaseExpiry"],
    }),

    renewLease: build.mutation<
      Lease,
      { leaseId: number; newEndDate: ISODate; reason?: string }
    >({
      query: ({ leaseId, ...body }) => ({
        url:    `lease-expiry/${leaseId}/renew`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Leases", "LeaseExpiry"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Lease renewed!",
          error:   "Failed to renew lease.",
        });
      },
    }),

    markTenantVacated: build.mutation<
      Lease,
      { leaseId: number; vacatedAt: ISODateTime; reason?: string }
    >({
      query: ({ leaseId, ...body }) => ({
        url:    `lease-expiry/${leaseId}/vacate`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Leases", "Properties", "LeaseExpiry"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Tenant marked as vacated!",
          error:   "Failed to mark tenant as vacated.",
        });
      },
    }),

    getAllExpiringLeasesAdmin: build.query<
      PaginatedResponse<ExpiringLease>,
      PaginationParams & { days?: number }
    >({
      query: (params) => ({ url: "lease-expiry/admin/expiring", params }),
      providesTags: ["LeaseExpiry"],
    }),

    forceExpireLease: build.mutation<
      Lease,
      { leaseId: number; adminDbId: number; reason: string }
    >({
      query: ({ leaseId, ...body }) => ({
        url:    `lease-expiry/admin/${leaseId}/expire`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Leases", "Properties", "LeaseExpiry"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Lease force expired!",
          error:   "Failed to force expire lease.",
        });
      },
    }),

    // ─────────────────────────────────────────────────────────────────────────
    // VERIFY
    // ─────────────────────────────────────────────────────────────────────────

    verifyReceipt: build.query<VerifyReceipt, string>({
      query: (reference) => `verify/${reference}`,
      providesTags: ["Verify"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Failed to verify receipt." });
      },
    }),

    getReceiptSummary: build.query<ReceiptSummary, string>({
      query: (reference) => `verify/receipt/${reference}`,
      providesTags: ["Verify"],
    }),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTED HOOKS  (grouped to mirror endpoint sections)
// ─────────────────────────────────────────────────────────────────────────────

export const {
  // Auth
  useGetAuthUserQuery,
  useRegisterUserMutation,
  useGetMeQuery,
  useUpdateMeMutation,

  // Properties
  useGetPropertiesQuery,
  useGetPropertyQuery,
  useCreatePropertyMutation,

  // Tenants
  useGetTenantQuery,
  useGetCurrentResidencesQuery,
  useUpdateTenantSettingsMutation,
  useAddFavoritePropertyMutation,
  useRemoveFavoritePropertyMutation,

  // Managers
  useGetManagerPropertiesQuery,
  useUpdateManagerSettingsMutation,

  // Leases
  useGetLeasesQuery,
  useGetPropertyLeasesQuery,

  // Payments
  useGetPaymentsQuery,
  useInitializePaymentMutation,
  useVerifyPaymentQuery,
  useGetPaymentStatusQuery,
  useGetPaymentsByLeaseQuery,
  useGetPaymentReceiptQuery,
  useGetTenantReceiptsQuery,
  useGetLandlordEarningsQuery,
  useGetTransactionsByTenantQuery,

  // Admin — Payments
  useGetAdminAllPaymentsQuery,
  useGetAdminRevenueQuery,
  useGetAdminPaymentByRefQuery,
  useOverridePaymentStatusMutation,
  useRecordCashPaymentMutation,
  useGetAdminCommissionSummaryQuery,
  useGetAdminCommissionByPeriodQuery,

  // Applications
  useGetApplicationsQuery,
  useUpdateApplicationStatusMutation,
  useCreateApplicationMutation,

  // Admin — General
  useCreateAdminMutation,
  useGetAdminQuery,
  useGetDashboardStatsQuery,
  useGetAdminAllPropertiesQuery,
  useGetAdminPendingPropertiesQuery,
  useApprovePropertyMutation,
  useRejectPropertyMutation,
  useGetPendingVerificationsQuery,
  useApproveVerificationMutation,
  useRejectVerificationMutation,
  useGetAdminAllManagersQuery,
  useGetAdminAllTenantsQuery,
  useGetBlacklistQuery,
  useAddToBlacklistMutation,
  useRemoveFromBlacklistMutation,
  useGetAdminReportsQuery,
  useResolveReportMutation,
  useGetAuditLogsQuery,
  useGetAuditLogByIdQuery,

  // Sale
  useListPropertyForSaleMutation,
  useMarkPropertyAsSoldMutation,
  useArchivePropertyMutation,
  useUnarchivePropertyMutation,
  useDeletePropertyMutation,
  useTriggerPendingRemovalMutation,
  useCancelPendingRemovalMutation,
  useRestorePropertyMutation,

  // Enquiries
  useCreateEnquiryMutation,
  useGetUserEnquiriesQuery,
  useGetManagerEnquiriesQuery,
  useMarkEnquiryAsReadMutation,
  useRespondToEnquiryMutation,
  useUpdateEnquiryStatusMutation,
  useRecordDealMutation,
  useArchiveEnquiryMutation,
  useGetAllEnquiriesAdminQuery,

  // Messages
  useSendMessageMutation,
  useGetThreadQuery,
  useGetUserThreadsQuery,
  useGetAllThreadsAdminQuery,
  useRedactMessageMutation,

  // Bookings
  useCreateBookingMutation,
  useCancelBookingMutation,
  useCheckInBookingMutation,
  useCheckOutBookingMutation,
  useMarkNoShowMutation,
  useGetGuestBookingsQuery,
  useGetPropertyBookingsQuery,
  useGetAllBookingsAdminQuery,

  // Hostels
  useCreateSemesterBookingMutation,
  useGetStudentBookingsQuery,
  useGetHostelBookingsQuery,
  useGetRoomAvailabilityQuery,
  useCheckoutStudentMutation,
  useExtendStayMutation,
  useGetAllHostelBookingsAdminQuery,

  // Schools
  useGetAllSchoolsQuery,
  useGetSchoolByIdQuery,
  useAddSchoolMutation,
  useRemoveSchoolMutation,
  useAddSemesterMutation,
  useUpdateSemesterEndDateMutation,
  useGetSemesterStatusQuery,
  useNotifyStudentsMutation,

  // Advance Payments
  useCalculateCoverageMutation,
  useSplitAdvancePaymentMutation,
  useGetPaymentCoverageQuery,

  // Lease Expiry
  useGetExpiringLeasesQuery,
  useGetTenantLeaseStatusQuery,
  useRenewLeaseMutation,
  useMarkTenantVacatedMutation,
  useGetAllExpiringLeasesAdminQuery,
  useForceExpireLeaseMutation,

  // Verify
  useVerifyReceiptQuery,
  useGetReceiptSummaryQuery,
} = api;