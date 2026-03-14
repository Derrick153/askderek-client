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

// ── CLERK USER TYPE ────────────────────────────────────────
export interface ClerkUser {
  userId: string;
  email: string;
  name: string;
  phoneNumber?: string;
  userType: "tenant" | "manager";
}

export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    prepareHeaders: async (headers) => headers,
  }),
  tagTypes: [
    "Managers",
    "Tenants",
    "Properties",
    "PropertyDetails",
    "Leases",
    "Payments",
    "Applications",
    "Admin",
    "Verifications",
    "Blacklist",
    "Reports",
    "AuditLogs",
  ],
  endpoints: (build) => ({

    // ── AUTH ───────────────────────────────────────────────
    getAuthUser: build.query<ClerkUser | null, void>({
      queryFn: async () => {
        try {
          const clerkUser = (window as any).Clerk?.user;
          if (!clerkUser) return { data: null };

          const userType =
            (clerkUser.publicMetadata?.userType as "tenant" | "manager") ||
            "tenant";

          const user: ClerkUser = {
            userId: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress || "",
            name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim(),
            phoneNumber: clerkUser.primaryPhoneNumber?.phoneNumber || "",
            userType,
          };

          return { data: user };
        } catch (error: any) {
          return { error: error?.message || "Could not fetch user data" };
        }
      },
    }),

    // ── PROPERTIES ─────────────────────────────────────────
    getProperties: build.query<
      Property[],
      Partial<FiltersState> & { favoriteIds?: number[] }
    >({
      query: (filters) => {
        const params = cleanParams({
          location: filters.location,
          area: filters.area,
          priceMin: filters.priceRange?.[0],
          priceMax: filters.priceRange?.[1],
          beds: filters.beds,
          baths: filters.baths,
          propertyType: filters.propertyType,
          squareFeetMin: filters.squareFeet?.[0],
          squareFeetMax: filters.squareFeet?.[1],
          amenities: filters.amenities?.join(","),
          availableFrom: filters.availableFrom,
          favoriteIds: filters.favoriteIds?.join(","),
          latitude: filters.coordinates?.[1],
          longitude: filters.coordinates?.[0],
        });
        return { url: "properties", params };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Properties" as const, id })),
              { type: "Properties", id: "LIST" },
            ]
          : [{ type: "Properties", id: "LIST" }],
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

    createProperty: build.mutation<Property, FormData>({
      query: (newProperty) => ({
        url: "properties",
        method: "POST",
        body: newProperty,
      }),
      invalidatesTags: [{ type: "Properties", id: "LIST" }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Property created successfully!",
          error: "Failed to create property.",
        });
      },
    }),

    // ── TENANTS ────────────────────────────────────────────
    getTenant: build.query<Tenant, string>({
      query: (userId) => `tenants/${userId}`,
      providesTags: (result) => [{ type: "Tenants", id: result?.id }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Failed to load tenant profile." });
      },
    }),

    getCurrentResidences: build.query<Property[], string>({
      query: (userId) => `tenants/${userId}/current-residences`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Properties" as const, id })),
              { type: "Properties", id: "LIST" },
            ]
          : [{ type: "Properties", id: "LIST" }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Failed to fetch current residences." });
      },
    }),

    updateTenantSettings: build.mutation<
      Tenant,
      { userId: string } & Partial<Tenant>
    >({
      query: ({ userId, ...updatedTenant }) => ({
        url: `tenants/${userId}`,
        method: "PUT",
        body: updatedTenant,
      }),
      invalidatesTags: (result) => [{ type: "Tenants", id: result?.id }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Settings updated successfully!",
          error: "Failed to update settings.",
        });
      },
    }),

    addFavoriteProperty: build.mutation<
      Tenant,
      { userId: string; propertyId: number }
    >({
      query: ({ userId, propertyId }) => ({
        url: `tenants/${userId}/favorites/${propertyId}`,
        method: "POST",
      }),
      invalidatesTags: (result) => [
        { type: "Tenants", id: result?.id },
        { type: "Properties", id: "LIST" },
      ],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { success: "Added to favorites!", error: "Failed to add to favorites." });
      },
    }),

    removeFavoriteProperty: build.mutation<
      Tenant,
      { userId: string; propertyId: number }
    >({
      query: ({ userId, propertyId }) => ({
        url: `tenants/${userId}/favorites/${propertyId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result) => [
        { type: "Tenants", id: result?.id },
        { type: "Properties", id: "LIST" },
      ],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { success: "Removed from favorites!", error: "Failed to remove from favorites." });
      },
    }),

    // ── MANAGERS ───────────────────────────────────────────
    getManagerProperties: build.query<Property[], string>({
      query: (userId) => `managers/${userId}/properties`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Properties" as const, id })),
              { type: "Properties", id: "LIST" },
            ]
          : [{ type: "Properties", id: "LIST" }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Failed to load manager properties." });
      },
    }),

    updateManagerSettings: build.mutation<
      Manager,
      { userId: string } & Partial<Manager>
    >({
      query: ({ userId, ...updatedManager }) => ({
        url: `managers/${userId}`,
        method: "PUT",
        body: updatedManager,
      }),
      invalidatesTags: (result) => [{ type: "Managers", id: result?.id }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { success: "Settings updated successfully!", error: "Failed to update settings." });
      },
    }),

    // ── LEASES & PAYMENTS ──────────────────────────────────
    getLeases: build.query<Lease[], void>({
      query: () => "leases",
      providesTags: ["Leases"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Failed to fetch leases." });
      },
    }),

    getPropertyLeases: build.query<Lease[], number>({
      query: (propertyId) => `properties/${propertyId}/leases`,
      providesTags: ["Leases"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Failed to fetch property leases." });
      },
    }),

    getPayments: build.query<Payment[], number>({
      query: (leaseId) => `leases/${leaseId}/payments`,
      providesTags: ["Payments"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Failed to fetch payments." });
      },
    }),

    initializePayment: build.mutation<
      { data: { authorization_url: string; access_code: string; reference: string } },
      { leaseId: number; amount: number; email: string }
    >({
      query: (data) => ({
        url: "payments/initialize",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Payments"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Failed to initialize payment." });
      },
    }),

    verifyPayment: build.query<any, string>({
      query: (reference) => `payments/verify/${reference}`,
      providesTags: ["Payments"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { success: "Payment verified successfully!", error: "Failed to verify payment." });
      },
    }),

    // ── APPLICATIONS ───────────────────────────────────────
    getApplications: build.query<
      Application[],
      { userId?: string; userType?: string }
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params.userId) queryParams.append("userId", params.userId);
        if (params.userType) queryParams.append("userType", params.userType);
        return `applications?${queryParams.toString()}`;
      },
      providesTags: ["Applications"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { error: "Failed to fetch applications." });
      },
    }),

    updateApplicationStatus: build.mutation<
      Application & { lease?: Lease },
      { id: number; status: string }
    >({
      query: ({ id, status }) => ({ url: `applications/${id}/status`, method: "PUT", body: { status } }),
      invalidatesTags: ["Applications", "Leases", "Properties"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { success: "Application updated successfully!", error: "Failed to update application." });
      },
    }),

    createApplication: build.mutation<Application, Partial<Application>>({
      query: (body) => ({ url: "applications", method: "POST", body }),
      invalidatesTags: ["Applications"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, { success: "Application submitted successfully!", error: "Failed to submit application." });
      },
    }),

    // ── ADMIN ──────────────────────────────────────────────
    createAdmin: build.mutation<any, { clerkId: string; name: string; email: string }>({
      query: (body) => ({ url: "admin", method: "POST", body }),
      invalidatesTags: ["Admin"],
    }),

    getAdmin: build.query<any, string>({
      query: (clerkId) => `admin/${clerkId}`,
      providesTags: ["Admin"],
    }),

    getDashboardStats: build.query<any, void>({
      query: () => "admin/dashboard/stats",
      providesTags: ["Admin"],
    }),

    // ── PROPERTY MODERATION ────────────────────────────────
    getAdminAllProperties: build.query<any, void>({
      query: () => "admin/properties/all",
      providesTags: ["Properties"],
    }),

    getAdminPendingProperties: build.query<any, void>({
      query: () => "admin/properties/pending",
      providesTags: ["Properties"],
    }),

    approveProperty: build.mutation<any, number>({
      query: (id) => ({ url: `admin/properties/${id}/approve`, method: "PUT" }),
      invalidatesTags: ["Properties"],
    }),

    rejectProperty: build.mutation<any, { id: number; reason: string }>({
      query: ({ id, reason }) => ({ url: `admin/properties/${id}/reject`, method: "PUT", body: { reason } }),
      invalidatesTags: ["Properties"],
    }),

    // ── LANDLORD VERIFICATION ──────────────────────────────
    getPendingVerifications: build.query<any, void>({
      query: () => "admin/verifications/pending",
      providesTags: ["Verifications"],
    }),

    approveVerification: build.mutation<any, number>({
      query: (id) => ({ url: `admin/verifications/${id}/approve`, method: "PUT" }),
      invalidatesTags: ["Verifications", "Managers"],
    }),

    rejectVerification: build.mutation<any, { id: number; reason: string }>({
      query: ({ id, reason }) => ({ url: `admin/verifications/${id}/reject`, method: "PUT", body: { reason } }),
      invalidatesTags: ["Verifications"],
    }),

    // ── USER MANAGEMENT ────────────────────────────────────
    getAdminAllManagers: build.query<any, void>({
      query: () => "admin/users/managers",
      providesTags: ["Managers"],
    }),

    getAdminAllTenants: build.query<any, void>({
      query: () => "admin/users/tenants",
      providesTags: ["Tenants"],
    }),

    // ── BLACKLIST ──────────────────────────────────────────
    getBlacklist: build.query<any, void>({
      query: () => "admin/blacklist",
      providesTags: ["Blacklist"],
    }),

    addToBlacklist: build.mutation<any, { phoneNumber?: string; email?: string; ghanaCardId?: string; reason: string }>({
      query: (body) => ({ url: "admin/blacklist", method: "POST", body }),
      invalidatesTags: ["Blacklist"],
    }),

    removeFromBlacklist: build.mutation<any, number>({
      query: (id) => ({ url: `admin/blacklist/${id}`, method: "DELETE" }),
      invalidatesTags: ["Blacklist"],
    }),

    // ── REPORTS ────────────────────────────────────────────
    getAdminReports: build.query<any, void>({
      query: () => "admin/reports",
      providesTags: ["Reports"],
    }),

    resolveReport: build.mutation<any, number>({
      query: (id) => ({ url: `admin/reports/${id}/resolve`, method: "PUT" }),
      invalidatesTags: ["Reports"],
    }),

    // ── AUDIT LOGS ─────────────────────────────────────────
    getAuditLogs: build.query<any, void>({
      query: () => "admin/audit-logs",
      providesTags: ["AuditLogs"],
    }),
  }),
});

export const {
  useGetAuthUserQuery,
  useGetPropertiesQuery,
  useGetPropertyQuery,
  useCreatePropertyMutation,
  useGetTenantQuery,
  useGetCurrentResidencesQuery,
  useUpdateTenantSettingsMutation,
  useAddFavoritePropertyMutation,
  useRemoveFavoritePropertyMutation,
  useGetManagerPropertiesQuery,
  useUpdateManagerSettingsMutation,
  useGetLeasesQuery,
  useGetPropertyLeasesQuery,
  useGetPaymentsQuery,
  useInitializePaymentMutation,
  useVerifyPaymentQuery,
  useGetApplicationsQuery,
  useUpdateApplicationStatusMutation,
  useCreateApplicationMutation,
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
} = api;