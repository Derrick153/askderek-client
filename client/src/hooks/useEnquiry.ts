// ─────────────────────────────────────────────────────────────────────────────
//  useEnquiry.ts
//
//  Central hook for all enquiry actions on AskDerek.
//
//  Three hooks exported:
//    useBuyerEnquiry   — tenant/buyer facing pages
//    useManagerEnquiry — manager/landlord facing pages
//    useAdminEnquiry   — admin platform wide view
// ─────────────────────────────────────────────────────────────────────────────

import {
  useCreateEnquiryMutation,
  useGetUserEnquiriesQuery,
  useGetManagerEnquiriesQuery,
  useMarkEnquiryAsReadMutation,
  useRespondToEnquiryMutation,
  useUpdateEnquiryStatusMutation,
  useRecordDealMutation,
  useArchiveEnquiryMutation,
  useGetAllEnquiriesAdminQuery,
  type Enquiry,
  type EnquiryType,
  type EnquiryStatus,
  useGetAllBookingsAdminQuery,
} from "@/state/api";

// Valid status transitions — enforced on frontend before hitting backend
const VALID_TRANSITIONS: Record<EnquiryStatus, EnquiryStatus[]> = {
  NEW:         ["CONTACTED", "LOST"],
  CONTACTED:   ["NEGOTIATING", "LOST"],
  NEGOTIATING: ["AGREED", "LOST"],
  AGREED:      ["COMPLETED", "LOST"],
  COMPLETED:   [],
  LOST:        [],
};

// ── BUYER HOOK ────────────────────────────────────────────────────────────────

export const useBuyerEnquiry = () => {
  const { data: enquiries, isLoading, refetch } = useGetUserEnquiriesQuery();

  const [createEnquiry,  { isLoading: isCreating  }] = useCreateEnquiryMutation();
  const [archiveEnquiry, { isLoading: isArchiving }] = useArchiveEnquiryMutation();

  const handleCreate = async (data: {
    propertyId:    number;
    message:       string;
    enquiryType:   EnquiryType;
    offeredPrice?: number;
  }): Promise<{ success: boolean; data?: Enquiry; error?: string }> => {
    try {
      const result = await createEnquiry(data).unwrap();
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error?.message ?? "Failed to send enquiry" };
    }
  };

  const handleArchive = async (
    enquiryId: number
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await archiveEnquiry(enquiryId).unwrap();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  };

  const activeEnquiries = enquiries?.filter(
    (e: Enquiry) => !e.isArchived
  ) ?? [];

  const archivedEnquiries = enquiries?.filter(
    (e: Enquiry) => e.isArchived
  ) ?? [];

  const newEnquiries = activeEnquiries.filter(
    (e: Enquiry) => e.status === "NEW"
  );

  const inProgressEnquiries = activeEnquiries.filter(
    (e: Enquiry) =>
      e.status === "CONTACTED" ||
      e.status === "NEGOTIATING"
  );

  const agreedEnquiries = activeEnquiries.filter(
    (e: Enquiry) => e.status === "AGREED"
  );

  const completedEnquiries = activeEnquiries.filter(
    (e: Enquiry) => e.status === "COMPLETED"
  );

  return {
    enquiries:           enquiries    ?? [],
    activeEnquiries,
    archivedEnquiries,
    newEnquiries,
    inProgressEnquiries,
    agreedEnquiries,
    completedEnquiries,
    isLoading,
    handleCreate,
    handleArchive,
    isCreating,
    isArchiving,
    refetch,
  };
};

// ── MANAGER HOOK ──────────────────────────────────────────────────────────────

export const useManagerEnquiry = () => {
  const { data: enquiries, isLoading, refetch } = useGetManagerEnquiriesQuery();

  const [markAsRead,     { isLoading: isMarkingRead    }] = useMarkEnquiryAsReadMutation();
  const [respond,        { isLoading: isResponding     }] = useRespondToEnquiryMutation();
  const [updateStatus,   { isLoading: isUpdatingStatus }] = useUpdateEnquiryStatusMutation();
  const [recordDeal,     { isLoading: isRecordingDeal  }] = useRecordDealMutation();
  const [archiveEnquiry, { isLoading: isArchiving      }] = useArchiveEnquiryMutation();

  const handleMarkAsRead = async (
    enquiryId: number
  ): Promise<{ success: boolean }> => {
    try {
      await markAsRead(enquiryId).unwrap();
      return { success: true };
    } catch {
      return { success: false };
    }
  };

  const handleRespond = async (
    enquiryId: number,
    response:  string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await respond({ enquiryId, response }).unwrap();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  };

  // Validates transition before hitting backend
  const handleUpdateStatus = async (
    enquiryId:     number,
    currentStatus: EnquiryStatus,
    newStatus:     EnquiryStatus
  ): Promise<{ success: boolean; error?: string }> => {
    const validNext = VALID_TRANSITIONS[currentStatus];
    if (!validNext.includes(newStatus)) {
      return {
        success: false,
        error:   `Cannot move from ${currentStatus} to ${newStatus}`,
      };
    }
    try {
      await updateStatus({ enquiryId, status: newStatus }).unwrap();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  };

  const handleRecordDeal = async (data: {
    enquiryId:   number;
    agreedPrice: number;
    notes?:      string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      await recordDeal(data).unwrap();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  };

  const handleArchive = async (
    enquiryId: number
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await archiveEnquiry(enquiryId).unwrap();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  };

  const unreadCount = enquiries?.filter(
    (e: Enquiry) => !e.isRead && !e.isArchived
  ).length ?? 0;

  const activeEnquiries = enquiries?.filter(
    (e: Enquiry) => !e.isArchived
  ) ?? [];

  const pendingResponse = activeEnquiries.filter(
    (e: Enquiry) => e.status === "NEW" || e.status === "CONTACTED"
  );

  const inNegotiation = activeEnquiries.filter(
    (e: Enquiry) => e.status === "NEGOTIATING"
  );

  const dealsMade = activeEnquiries.filter(
    (e: Enquiry) =>
      e.status === "AGREED" ||
      e.status === "COMPLETED"
  );

  // Rounded to 2 decimal places — avoids floating point errors
  const totalCommission = Math.round(
    dealsMade.reduce(
      (sum: number, e: Enquiry) => sum + (e.commissionDue ?? 0),
      0
    ) * 100
  ) / 100;

  return {
    enquiries:       enquiries ?? [],
    activeEnquiries,
    pendingResponse,
    inNegotiation,
    dealsMade,
    unreadCount,
    totalCommission,
    isLoading,
    handleMarkAsRead,
    handleRespond,
    handleUpdateStatus,
    handleRecordDeal,
    handleArchive,
    isMarkingRead,
    isResponding,
    isUpdatingStatus,
    isRecordingDeal,
    isArchiving,
    refetch,
  };
};

// ── ADMIN HOOK ────────────────────────────────────────────────────────────────

// ── ADMIN HOOK ────────────────────────────────────────────────────────────────
export const useAdminEnquiry = (params?: { page?: number; limit?: number }) => {
  const { data, isLoading, refetch } = useGetAllEnquiriesAdminQuery(params ?? {});

  const raw = data as any;

  return {
    enquiries:  raw?.enquiries  ?? raw?.data ?? [],
    pagination: raw?.pagination ?? null,
    isLoading,
    refetch,
  };
};