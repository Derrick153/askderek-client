"use client";

import { useState, useMemo }           from "react";
import { useUser }                      from "@clerk/nextjs";
import {
  useGetManagerPropertiesQuery,
  useGetHostelBookingsQuery,
  useCheckoutStudentMutation,
} from "@/state/api";
import HostelRoomCard from "@/components/HostelRoomCard";
import { GraduationCap, Users, DoorOpen, RefreshCw, Building2 } from "lucide-react";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

export default function ManagerHostelPage() {
  const { user } = useUser();
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);

  const { data: propertiesRaw, isLoading: loadingProps } =
    useGetManagerPropertiesQuery(user?.id ?? "", { skip: !user?.id });

  const properties: any[] = useMemo(() => {
    if (!propertiesRaw) return [];
    if (Array.isArray(propertiesRaw)) return propertiesRaw;
    return (propertiesRaw as any).data ?? [];
  }, [propertiesRaw]);

  const hostelProperties = properties.filter(
    (p: any) => p.propertyType === "HOSTEL" || p.listingType === "HOSTEL"
  );

  const activePropertyId = selectedPropertyId ?? hostelProperties[0]?.id ?? null;

  const { data: bookingsRaw, isLoading: loadingBookings, refetch } =
    useGetHostelBookingsQuery(activePropertyId!, { skip: !activePropertyId });

  const [checkoutStudent] = useCheckoutStudentMutation();

  const bookings: any[] = useMemo(() => {
    if (!bookingsRaw) return [];
    if (Array.isArray(bookingsRaw)) return bookingsRaw;
    return (bookingsRaw as any).bookings ?? (bookingsRaw as any).data ?? [];
  }, [bookingsRaw]);

  const activeBookings  = bookings.filter((b: any) => b.status === "ACTIVE" || b.status === "EXPIRING");
  const availableRooms  = (bookingsRaw as any)?.availableRooms ?? 0;
  const totalRooms      = (bookingsRaw as any)?.totalRooms ?? 0;
  const occupiedRooms   = totalRooms - availableRooms;
  const isLoading       = loadingProps || loadingBookings;

  const handleCheckout = async (bookingId: number) => {
    await checkoutStudent({ bookingId, actualEndDate: new Date().toISOString() });
    refetch();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hostel Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">Room occupancy and student management</p>
          </div>
          <button onClick={() => refetch()} className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {hostelProperties.length > 1 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <select
              value={activePropertyId ?? ""}
              onChange={(e) => setSelectedPropertyId(Number(e.target.value))}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            >
              {hostelProperties.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        {hostelProperties.length === 0 && !isLoading ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <GraduationCap className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">No hostel properties</h3>
            <p className="text-sm text-gray-500">List a hostel property to start managing students.</p>
          </div>
        ) : activePropertyId && (
          <>
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: Building2, label: "Total Rooms",  value: totalRooms,    bg: "bg-gray-50",     text: "text-gray-600"    },
                { icon: Users,     label: "Occupied",     value: occupiedRooms, bg: "bg-rose-50",     text: "text-rose-600"    },
                { icon: DoorOpen,  label: "Available",    value: availableRooms, bg: "bg-emerald-50", text: "text-emerald-600" },
              ].map(({ icon: Icon, label, value, bg, text }) => (
                <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5">
                  <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                    <Icon className={`w-5 h-5 ${text}`} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {totalRooms > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-gray-900">Occupancy Rate</p>
                  <p className="text-sm font-bold text-orange-600">
                    {Math.round((occupiedRooms / totalRooms) * 100)}%
                  </p>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all"
                    style={{ width: `${(occupiedRooms / totalRooms) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-44" />)}
              </div>
            ) : activeBookings.length > 0 ? (
              <div>
                <h2 className="text-base font-bold text-gray-900 mb-4">Active Students ({activeBookings.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeBookings.map((booking: any) => (
                    <HostelRoomCard
                      key={booking.id}
                      room={{
                        roomNumber:       booking.roomNumber ?? `#${booking.id}`,
                        type:             "SINGLE",
                        pricePerSemester: booking.amountPaid,
                        occupantName:     booking.studentName ?? booking.studentClerkId,
                        occupantClerkId:  booking.studentClerkId,
                      }}
                      isAvailable={false}
                      showOccupant
                      onManage={() => handleCheckout(booking.id)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <GraduationCap className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-700">No active students</p>
                <p className="text-xs text-gray-400 mt-1">Student bookings will appear here</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}