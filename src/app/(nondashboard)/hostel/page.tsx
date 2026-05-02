"use client";

import { useState, useMemo }          from "react";
import { useParams, useRouter }        from "next/navigation";
import {
  useGetPropertiesQuery,
  useGetPropertyQuery,
  useGetAllSchoolsQuery,
  useCreateSemesterBookingMutation,
  useVerifyReceiptQuery,
} from "@/state/api";
import { useUser }              from "@clerk/nextjs";
import HostelRoomCard           from "@/components/HostelRoomCard";
import SchoolSemesterCard       from "@/components/SchoolSemesterCard";
import ListingTypeBadge         from "@/components/ListingTypeBadge";
import Image                    from "next/image";
import {
  Search, MapPin, Home, GraduationCap,
  ArrowLeft, CheckCircle, Loader2,
  ShieldCheck, XCircle, AlertCircle,
  Calendar, RefreshCw,
} from "lucide-react";
import type { HostelRoom } from "@/components/HostelRoomCard";
import type { School }     from "@/state/api";

// ─────────────────────────────────────────────────────────────────────────────
//  HOSTEL LISTING PAGE  —  /hostel
// ─────────────────────────────────────────────────────────────────────────────

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-2xl ${className}`} />
);

const formatGHS = (n?: number) =>
  n != null ? `GHS ${n.toLocaleString("en-GH", { minimumFractionDigits: 0 })}` : "—";

export default function HostelDetailPage() {
  const params     = useParams();
  const router     = useRouter();
  const { user }   = useUser();
  const propertyId = Number(params.id);

  const { data: property, isLoading } = useGetPropertyQuery(propertyId, { skip: !propertyId });
  const { data: schoolsRaw }          = useGetAllSchoolsQuery();
  const schools: School[]             = Array.isArray(schoolsRaw) ? schoolsRaw : (schoolsRaw as any)?.data ?? [];

  const [createSemesterBooking] = useCreateSemesterBookingMutation();

  const [selectedRoom,   setSelectedRoom]   = useState<HostelRoom | null>(null);
  const [semesterName,   setSemesterName]   = useState("");
  const [checkIn,        setCheckIn]        = useState("");
  const [closingType,    setClosingType]    = useState<"FIXED" | "SCHOOL_CALENDAR" | "OPEN_ENDED">("SCHOOL_CALENDAR");
  const [selectedSchool, setSelectedSchool] = useState<number | null>(null);
  const [isBooking,      setIsBooking]      = useState(false);
  const [booked,         setBooked]         = useState(false);

  const p: any = property;

  const rooms: HostelRoom[] = useMemo(() => {
    if (!p) return [];
    return (p.rooms ?? []).map((r: any) => ({
      roomNumber:        r.roomNumber ?? r.number ?? `R${r.id}`,
      type:              r.type ?? "SINGLE",
      pricePerSemester:  r.pricePerSemester ?? p.pricePerMonth,
      floor:             r.floor,
      amenities:         r.amenities ?? [],
    }));
  }, [p]);

  const availableRooms = rooms.filter((r) => !(p?.bookings ?? []).find((b: any) => b.roomNumber === r.roomNumber && b.status === "ACTIVE"));

  const handleBook = async () => {
    if (!user) { router.push("/sign-in"); return; }
    if (!selectedRoom || !semesterName || !checkIn) return;
    setIsBooking(true);
    try {
      await createSemesterBooking({
        propertyId,
        semesterName,
        checkIn,
        closingType,
        roomNumber: selectedRoom.roomNumber,
        schoolId:   selectedSchool ?? undefined,
      });
      setBooked(true);
    } catch {
      // handled by withToast
    } finally {
      setIsBooking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-72" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      </div>
    );
  }

  if (!p) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-lg font-bold text-gray-900">Hostel not found</p>
          <button onClick={() => router.push("/hostel")} className="mt-4 px-5 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-xl hover:bg-orange-700">
            Back to hostels
          </button>
        </div>
      </div>
    );
  }

  if (booked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center max-w-sm w-full shadow-sm">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Room Booked!</h2>
          <p className="text-sm text-gray-500 mb-6">
            Your hostel room at {p.name} has been confirmed.
          </p>
          <button onClick={() => router.push("/tenants/bookings")} className="w-full py-3 bg-orange-600 text-white text-sm font-bold rounded-xl hover:bg-orange-700 transition-colors">
            View My Bookings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button onClick={() => router.push("/hostel")} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to hostels
        </button>

        {/* Photo */}
        <div className="relative h-64 bg-gray-100 rounded-2xl overflow-hidden mb-6">
          {p.photoUrls?.[0] ? (
            <Image src={p.photoUrls[0]} alt={p.name} fill className="object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <GraduationCap className="w-16 h-16 text-gray-300" />
            </div>
          )}
          <div className="absolute top-4 left-4">
            <ListingTypeBadge type="HOSTEL" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rooms */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h1 className="text-xl font-bold text-gray-900 mb-2">{p.name}</h1>
              <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
                <MapPin className="w-4 h-4" />
                {p.location?.city}, {p.location?.region}
              </div>
              {p.description && <p className="text-sm text-gray-600">{p.description}</p>}
            </div>

            {rooms.length > 0 ? (
              <div>
                <h2 className="text-base font-bold text-gray-900 mb-4">
                  Available Rooms ({availableRooms.length} of {rooms.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {rooms.map((room) => {
                    const isAvailable = availableRooms.some((r) => r.roomNumber === room.roomNumber);
                    return (
                      <HostelRoomCard
                        key={room.roomNumber}
                        room={room}
                        isAvailable={isAvailable}
                        isSelected={selectedRoom?.roomNumber === room.roomNumber}
                        onBook={(r) => setSelectedRoom(r)}
                      />
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
                <GraduationCap className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-amber-800">Contact hostel directly to select a room</p>
              </div>
            )}
          </div>

          {/* Booking form */}
          <div className="space-y-4">
            {selectedRoom && (
              <div className="bg-white rounded-2xl border border-orange-200 p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1">Booking Room {selectedRoom.roomNumber}</h3>
                  <p className="text-xs text-gray-400">{formatGHS(selectedRoom.pricePerSemester)} per semester</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Semester Name</label>
                  <input
                    type="text"
                    placeholder="e.g. First Semester 2026"
                    value={semesterName}
                    onChange={(e) => setSemesterName(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Check-in Date</label>
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Closing Type</label>
                  <select
                    value={closingType}
                    onChange={(e) => setClosingType(e.target.value as any)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  >
                    <option value="SCHOOL_CALENDAR">School Calendar (auto)</option>
                    <option value="FIXED">Fixed End Date</option>
                    <option value="OPEN_ENDED">Open Ended</option>
                  </select>
                </div>

                {closingType === "SCHOOL_CALENDAR" && schools.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Your School</label>
                    <select
                      value={selectedSchool ?? ""}
                      onChange={(e) => setSelectedSchool(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    >
                      <option value="">Select school</option>
                      {schools.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  onClick={handleBook}
                  disabled={isBooking || !semesterName || !checkIn}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-40"
                >
                  {isBooking
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Booking...</>
                    : <><GraduationCap className="w-4 h-4" /> Book Room</>
                  }
                </button>
              </div>
            )}

            {!selectedRoom && rooms.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
                <p className="text-sm font-semibold text-amber-800">Select a room to continue booking</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  VERIFY RECEIPT PAGE  —  /verify/[reference]
// ─────────────────────────────────────────────────────────────────────────────