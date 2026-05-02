// ─────────────────────────────────────────────────────────────────────────────
//  useBooking.ts
//
//  Central hook for all short stay booking actions on AskDerek.
//
//  Three hooks exported:
//    useGuestBooking   — tenant/guest facing pages
//    useManagerBooking — manager/host facing pages
//    useAdminBooking   — admin platform wide view
// ─────────────────────────────────────────────────────────────────────────────

import {
  useCreateBookingMutation,
  useCancelBookingMutation,
  useCheckInBookingMutation,
  useCheckOutBookingMutation,
  useMarkNoShowMutation,
  useGetGuestBookingsQuery,
  useGetPropertyBookingsQuery,
  useGetAllBookingsAdminQuery,
  type Booking,
  type DurationType,
} from "@/state/api";

// ── GUEST HOOK ────────────────────────────────────────────────────────────────

export const useGuestBooking = () => {
  const { data: bookings, isLoading, refetch } = useGetGuestBookingsQuery();

  const [createBooking, { isLoading: isCreating   }] = useCreateBookingMutation();
  const [cancelBooking, { isLoading: isCancelling }] = useCancelBookingMutation();

  const handleCreate = async (data: {
    propertyId:   number;
    checkIn:      string;
    checkOut:     string;
    durationType: DurationType;
  }): Promise<{ success: boolean; data?: Booking; error?: string }> => {
    try {
      const result = await createBooking(data).unwrap();
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error?.message ?? "Failed to create booking" };
    }
  };

  const handleCancel = async (
    bookingId: number,
    reason?:   string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await cancelBooking({ bookingId, reason }).unwrap();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message ?? "Failed to cancel booking" };
    }
  };

  const now       = new Date();
  const todayStr  = now.toISOString().split("T")[0];

  const upcomingBookings = bookings?.filter(
    (b: Booking) =>
      new Date(b.checkIn).toISOString().split("T")[0] >= todayStr &&
      b.status === "CONFIRMED"
  ) ?? [];

  const pastBookings = bookings?.filter(
    (b: Booking) =>
      b.status === "CHECKED_OUT" ||
      b.status === "CANCELLED"   ||
      b.status === "NO_SHOW"
  ) ?? [];

  const activeBooking = bookings?.find(
    (b: Booking) => b.status === "CHECKED_IN"
  ) ?? null;

  return {
    bookings:         bookings ?? [],
    upcomingBookings,
    pastBookings,
    activeBooking,
    isLoading,
    handleCreate,
    handleCancel,
    isCreating,
    isCancelling,
    refetch,
  };
};

// ── MANAGER HOOK ──────────────────────────────────────────────────────────────
// propertyId is optional — pass it to filter to a specific property

export const useManagerBooking = (propertyId?: number) => {
  const {
    data:      bookings,
    isLoading,
    refetch,
  } = useGetPropertyBookingsQuery(propertyId!, {
    skip: !propertyId,
  });

  const [checkIn,    { isLoading: isCheckingIn    }] = useCheckInBookingMutation();
  const [checkOut,   { isLoading: isCheckingOut   }] = useCheckOutBookingMutation();
  const [markNoShow, { isLoading: isMarkingNoShow }] = useMarkNoShowMutation();

  const handleCheckIn = async (
    bookingId: number
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await checkIn(bookingId).unwrap();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  };

  const handleCheckOut = async (
    bookingId: number
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await checkOut(bookingId).unwrap();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  };

  const handleMarkNoShow = async (
    bookingId: number
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await markNoShow(bookingId).unwrap();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  };

  // Use ISO date string comparison to avoid timezone issues
  const todayStr = new Date().toISOString().split("T")[0];

  const todayArrivals = bookings?.filter((b: Booking) => {
    const checkInStr = new Date(b.checkIn).toISOString().split("T")[0];
    return checkInStr === todayStr && b.status === "CONFIRMED";
  }) ?? [];

  const todayDepartures = bookings?.filter((b: Booking) => {
    const checkOutStr = new Date(b.checkOut).toISOString().split("T")[0];
    return checkOutStr === todayStr && b.status === "CHECKED_IN";
  }) ?? [];

  const currentGuests = bookings?.filter(
    (b: Booking) => b.status === "CHECKED_IN"
  ) ?? [];

  return {
    bookings:        bookings ?? [],
    todayArrivals,
    todayDepartures,
    currentGuests,
    isLoading,
    handleCheckIn,
    handleCheckOut,
    handleMarkNoShow,
    isCheckingIn,
    isCheckingOut,
    isMarkingNoShow,
    refetch,
  };
};

// ── ADMIN HOOK ────────────────────────────────────────────────────────────────

export const useAdminBooking = (params?: { page?: number; limit?: number }) => {
  const { data, isLoading, refetch } = useGetAllBookingsAdminQuery(params ?? {});

  const raw = data as any;

  return {
    bookings:   raw?.bookings   ?? raw?.data ?? [],
    pagination: raw?.pagination ?? null,
    isLoading,
    refetch,
  };
};