"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useGetPropertyQuery,
  useGetPublicHostelRoomsQuery,
  useGetAllSchoolsQuery,
  useCreateSemesterBookingMutation,
} from "@/state/api";
import { useUser } from "@clerk/nextjs";
import ListingTypeBadge from "@/components/ListingTypeBadge";
import Image from "next/image";
import {
  MapPin, Home, GraduationCap, ArrowLeft, CheckCircle,
  Loader2, Calendar, Clock,
  Phone, ListChecks,
} from "lucide-react";
import type { Room, Bed, RoomGender } from "@/types/prismaTypes";
import type { School } from "@/state/api";

// ─────────────────────────────────────────────────────────────────────────────
//  HOSTEL DETAIL & BOOKING PAGE  —  /hostel/[id]
//
//  Student flow: view hostel → filter rooms by gender → pick a specific
//  available bed → review summary → confirm → booking goes to
//  PENDING_APPROVAL, awaiting manager approval.
// ─────────────────────────────────────────────────────────────────────────────

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-2xl ${className}`} />
);

const formatGHS = (n?: number | null) =>
  n != null ? `GHS ${n.toLocaleString("en-GH", { minimumFractionDigits: 0 })}` : "—";

const GENDER_FILTERS: { value: RoomGender | "ALL"; label: string }[] = [
  { value: "ALL",    label: "All Rooms" },
  { value: "MALE",   label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "MIXED",  label: "Mixed" },
];

export default function HostelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const propertyId = Number(params.id);

  const { data: property, isLoading: loadingProperty } = useGetPropertyQuery(propertyId, { skip: !propertyId });
  const { data: roomsData, isLoading: loadingRooms } = useGetPublicHostelRoomsQuery(propertyId, { skip: !propertyId });
  const { data: schoolsRaw } = useGetAllSchoolsQuery();
  const schools: School[] = Array.isArray(schoolsRaw) ? schoolsRaw : (schoolsRaw as any)?.data ?? [];

  const [createSemesterBooking, { isLoading: isBooking }] = useCreateSemesterBookingMutation();

  const [genderFilter, setGenderFilter] = useState<RoomGender | "ALL">("ALL");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const [semesterName, setSemesterName] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [step, setStep] = useState<"browse" | "review" | "done">("browse");

  const rooms = roomsData?.rooms ?? [];

  const filteredRooms = useMemo(() => {
    if (genderFilter === "ALL") return rooms;
    return rooms.filter((r) => !r.gender || r.gender === genderFilter);
  }, [rooms, genderFilter]);

  const isLoading = loadingProperty || loadingRooms;

  const handleSelectBed = (room: any, bed: any) => {
    setSelectedRoom(room);
    setSelectedBed(bed);
    setStep("review");
  };

  const handleConfirmBooking = async () => {
    if (!user) { router.push("/sign-in"); return; }
    if (!selectedBed || !semesterName || !checkIn) return;

    const result = await createSemesterBooking({
      propertyId,
      bedId: selectedBed.id,
      semesterName,
      checkIn: new Date(checkIn).toISOString(),
      closingType: selectedSchoolId ? "SCHOOL_CALENDAR" : "OPEN_ENDED",
      schoolId: selectedSchoolId ?? undefined,
    });

    if (!("error" in result)) { setStep("done"); } else { alert(JSON.stringify(result.error, null, 2)); }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-72" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Home className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-lg font-bold text-gray-900">Hostel not found</p>
          <button onClick={() => router.push("/hostel")} className="mt-4 px-5 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-xl hover:bg-orange-700">
            Back to listings
          </button>
        </div>
      </div>
    );
  }

  const p = property as any;

  if (step === "done") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center max-w-sm w-full shadow-sm">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Booking Submitted!</h2>
          <p className="text-sm text-gray-500 mb-6">
            Your request for {p.name} — Room {selectedRoom?.roomNumber}, Bed {selectedBed?.bedNumber} is awaiting manager approval.
            You'll be notified once it's confirmed.
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
        <button
          onClick={() => (step === "review" ? setStep("browse") : router.push("/hostel"))}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === "review" ? "Back to rooms" : "Back to listings"}
        </button>

        {/* Photos + basic info — shown on both steps */}
        <div className="relative h-64 bg-gray-100 rounded-2xl overflow-hidden mb-5">
          {p.photoUrls?.[0] ? (
            <Image src={p.photoUrls[0]} alt={p.name} fill className="object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Home className="w-16 h-16 text-gray-300" />
            </div>
          )}
          <div className="absolute top-4 left-4">
            <ListingTypeBadge type="HOSTEL" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5">
          <h1 className="text-xl font-bold text-gray-900 mb-2">{p.name}</h1>
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <MapPin className="w-4 h-4" />
            {p.location?.address ?? p.location?.city}, {p.location?.region}
          </div>
        </div>

        {(p.emergencyContactName || p.emergencyContactPhone || p.rules) && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5 space-y-4">
            {(p.emergencyContactName || p.emergencyContactPhone) && (
              <div>
                <h3 className="flex items-center gap-1.5 text-sm font-bold text-gray-900 mb-1">
                  <Phone className="w-4 h-4" /> Emergency Contact
                </h3>
                <p className="text-sm text-gray-600">
                  {p.emergencyContactName}
                  {p.emergencyContactName && p.emergencyContactPhone ? " - " : ""}
                  {p.emergencyContactPhone}
                </p>
              </div>
            )}
            {p.rules && (
              <div>
                <h3 className="flex items-center gap-1.5 text-sm font-bold text-gray-900 mb-1">
                  <ListChecks className="w-4 h-4" /> Hostel Rules
                </h3>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-0.5">
                  {p.rules.split("\n").filter((line: string) => line.trim()).map((line: string, i: number) => (
                    <li key={i}>{line.trim()}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        {step === "browse" && (
          <>
            {/* Gender filter */}
            <div className="flex gap-2 mb-4">
              {GENDER_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setGenderFilter(f.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    genderFilter === f.value
                      ? "bg-orange-600 text-white"
                      : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Rooms with available beds */}
            {filteredRooms.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
                <GraduationCap className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-900 mb-1">No rooms available</h3>
                <p className="text-sm text-gray-500">Try a different filter, or check back later.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRooms.map((room) => {
                  const availableBeds = (room.beds ?? []).filter((b) => b.status === "AVAILABLE");
                  return (
                    <div key={room.id} className="bg-white rounded-2xl border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">Room {room.roomNumber}</span>
                          {room.gender && (
                            <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-600">
                              {room.gender}
                            </span>
                          )}
                          {room.floor && <span className="text-xs text-gray-400">Floor {room.floor}</span>}
                        </div>
                        {room.semesterPrice != null && (
                          <span className="text-sm font-bold text-orange-600">
                            {formatGHS(room.semesterPrice)}/semester
                          </span>
                        )}
                      </div>
                      {availableBeds.length === 0 ? (
                        <p className="text-xs text-gray-400">No beds currently available in this room.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {availableBeds.map((bed) => (
                            <button
                              key={bed.id}
                              onClick={() => handleSelectBed(room, bed)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Bed {bed.bedNumber}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {step === "review" && selectedRoom && selectedBed && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5">
            <h3 className="text-sm font-bold text-gray-900">Confirm Your Booking</h3>

            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-1">
              <p><span className="font-semibold">Room:</span> {selectedRoom.roomNumber}{selectedRoom.block ? ` (Block ${selectedRoom.block})` : ""}</p>
              <p><span className="font-semibold">Bed:</span> {selectedBed.bedNumber}</p>
              {selectedRoom.semesterPrice != null && (
                <p><span className="font-semibold">Price:</span> {formatGHS(selectedRoom.semesterPrice)}/semester</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Semester Name</label>
              <input
                value={semesterName}
                onChange={(e) => setSemesterName(e.target.value)}
                placeholder="e.g. 2026/2027 Semester 1"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Check-in Date</label>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            {schools.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">
                  School (optional — links your stay to the school's semester calendar)
                </label>
                <select
                  value={selectedSchoolId ?? ""}
                  onChange={(e) => setSelectedSchoolId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  <option value="">No school linked</option>
                  {schools.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            <p className="text-xs text-gray-400">
              Your booking will be sent to the hostel manager for approval before it's confirmed.
            </p>

            <button
              onClick={handleConfirmBooking}
              disabled={isBooking || !semesterName || !checkIn}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-40"
            >
              {isBooking
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                : <><Calendar className="w-4 h-4" /> Submit Booking Request</>
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

