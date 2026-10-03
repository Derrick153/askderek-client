"use client";

import { useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  useGetManagerPropertiesQuery,
  useGetHostelRoomsQuery,
  useGetHostelStatisticsQuery,
  useGetHostelAttentionCenterQuery,
  useGetHostelBookingsQuery,
  useGetHostelBookingsPaginatedQuery,
  useGetStudentBookingHistoryQuery,
  useAddRoomMutation,
  useDeleteRoomMutation,
  useUpdateRoomCapacityMutation,
  useBulkPreviewCapacityMutation,
  useBulkApplyCapacityMutation,
  useAddPaymentStructureMutation,
  useGetPropertyPricingQuery,
  useBulkAddRoomsMutation,
  useUpdateHostelProfileMutation,
  useUpdateBedStatusMutation,
  useApproveBookingMutation,
  useRejectBookingMutation,
  useGetBedTransferInfoQuery,
  useTransferBedMutation,
  useRecordCheckInMutation,
  useCheckoutStudentMutation,
  useGetBookingTimelineQuery,
  useGetManagerActivityLogQuery,
  useGetHostelNoShowCandidatesQuery,
  useMarkHostelNoShowMutation,
  useRetireBedMutation,
  useUpdateRoomMutation,
  useGetBedStatusHistoryQuery,
  HostelBookingStatus,
} from "@/state/api";
import type { Room, Bed, RoomGender, BedStatus } from "@/types/prismaTypes";
import {
  Building2,
  DollarSign,
  Gauge,
  BedDouble,
  Wrench,
  Clock,
  CheckCircle2,
  Plus,
  Layers,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  GraduationCap,
  X,
  Wand2,
  AlertTriangle,
  Trash2,
  Loader2,
  Info,
  History,
  MoreHorizontal,
  Search,
  Lock,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED PRIMITIVES (matches existing light-theme Hostel page conventions)
// ─────────────────────────────────────────────────────────────────────────────

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

function StatCard({
  icon: Icon,
  label,
  value,
  bg,
  text,
}: {
  icon: any;
  label: string;
  value: string | number;
  bg: string;
  text: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${text}`} />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function GenderBadge({ gender }: { gender?: RoomGender | null }) {
  if (!gender) return null;
  const styles: Record<RoomGender, string> = {
    MALE: "bg-blue-50 text-blue-600",
    FEMALE: "bg-pink-50 text-pink-600",
    MIXED: "bg-purple-50 text-purple-600",
  };
  return (
    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${styles[gender]}`}>
      {gender}
    </span>
  );
}

const BED_STYLES: Record<BedStatus, { dot: string; chip: string; label: string }> = {
  AVAILABLE: { dot: "bg-emerald-500", chip: "bg-emerald-50 border-emerald-200 text-emerald-700", label: "Available" },
  RESERVED: { dot: "bg-orange-500", chip: "bg-orange-50 border-orange-200 text-orange-700", label: "Reserved" },
  OCCUPIED: { dot: "bg-rose-500", chip: "bg-rose-50 border-rose-200 text-rose-700", label: "Occupied" },
  MAINTENANCE: { dot: "bg-gray-400", chip: "bg-gray-100 border-gray-300 text-gray-500", label: "Maintenance" },
};

function BedChip({
  bed,
  onToggleMaintenance,
  isToggling,
  onTransferClick,
  onCheckInClick,
  onRetireClick,
  onHistoryClick,
}: {
  bed: Bed;
  onToggleMaintenance: (bed: Bed) => void;
  isToggling: boolean;
  onTransferClick: (bed: Bed) => void;
  onCheckInClick: (bed: Bed) => void;
  onRetireClick: (bed: Bed) => void;
  onHistoryClick: (bed: Bed) => void;
}) {
  const style = bed.isRetired
    ? { dot: "bg-slate-400", chip: "bg-slate-100 border-slate-300 border-dashed text-slate-500", label: "Retired" }
    : BED_STYLES[bed.status];
  const canToggle = !bed.isRetired && (bed.status === "AVAILABLE" || bed.status === "MAINTENANCE");

  return (
    <span className="inline-flex items-stretch rounded-lg overflow-hidden border">
      <button
        type="button"
        disabled={!canToggle || isToggling}
        onClick={() => canToggle && onToggleMaintenance(bed)}
        title={
          bed.isRetired
            ? "This bed is permanently retired and cannot be used"
            : canToggle
            ? bed.status === "AVAILABLE"
              ? "Move to maintenance"
              : "Return to available"
            : `Bed is ${style.label.toLowerCase()} - cannot toggle while booked`
        }
        className={`flex items-center gap-1.5 px-2.5 py-1.5 border-0 text-xs font-semibold transition-colors ${style.chip} ${
          canToggle ? "hover:opacity-80 cursor-pointer" : "cursor-not-allowed opacity-80"
        }`}
      >
        {bed.isRetired ? (
          <Lock className="w-3 h-3" />
        ) : (
          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        )}
        Bed {bed.bedNumber}
        <span className="opacity-60">- {style.label}</span>
      </button>
      {bed.status === "OCCUPIED" && (
        <>
        <button
          type="button"
          onClick={() => onTransferClick(bed)}
          title="Transfer this student to another bed"
          className={`flex items-center px-2 py-1.5 border-l border-gray-200 hover:opacity-80 cursor-pointer transition-colors ${style.chip}`}
        >
          <RefreshCw className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={() => onCheckInClick(bed)}
          title="Record check-in"
          className={`flex items-center px-2 py-1.5 border-l border-gray-200 hover:opacity-80 cursor-pointer transition-colors ${style.chip}`}
        >
          <CheckCircle2 className="w-3 h-3" />
        </button>
        </>
      )}
      {!bed.isRetired && (bed.status === "AVAILABLE" || bed.status === "MAINTENANCE") && (
        <button
          type="button"
          onClick={() => onRetireClick(bed)}
          title="Retire this bed permanently"
          className={`flex items-center px-2 py-1.5 border-l border-gray-200 hover:opacity-80 cursor-pointer transition-colors ${style.chip}`}
        >
          <Lock className="w-3 h-3" />
        </button>
      )}
          <button
        type="button"
        onClick={() => onHistoryClick(bed)}
        title="View bed history"
        className={`flex items-center px-2 py-1.5 border-l border-gray-200 hover:opacity-80 cursor-pointer transition-colors ${style.chip}`}
      >
        <Clock className="w-3 h-3" />
      </button>
    </span>
  );
}

// -----------------------------------------------------------------------------
// ROOM ROW (Inventory - grouped by block, expands to show beds)
// -----------------------------------------------------------------------------
function RoomRow({
  room,
  isExpanded,
  onToggleExpand,
  onToggleBedMaintenance,
  togglingBedId,
  onDeleteClick,
  onChangeCapacityClick,
  onToggleActiveClick,
  onTransferClick,
  onCheckInClick,
  onRetireClick,
  onHistoryClick,
}: {
  room: Room;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleBedMaintenance: (bed: Bed) => void;
  togglingBedId: number | null;
  onDeleteClick: () => void;
  onChangeCapacityClick: () => void;
  onToggleActiveClick: (room: Room) => void;
  onTransferClick: (bed: Bed) => void;
  onCheckInClick: (bed: Bed) => void;
  onRetireClick: (bed: Bed) => void;
  onHistoryClick: (bed: Bed) => void;
}) {
  const beds = room.beds ?? [];
  const counts = beds.reduce(
    (acc, b) => {
      acc[b.status] += 1;
      return acc;
    },
    { AVAILABLE: 0, RESERVED: 0, OCCUPIED: 0, MAINTENANCE: 0 } as Record<BedStatus, number>
  );

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between gap-4 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}
          <span className="font-bold text-gray-900 flex-shrink-0">Room {room.roomNumber}</span>
          <GenderBadge gender={room.gender} />
          {room.floor && <span className="text-xs text-gray-400 flex-shrink-0">Floor {room.floor}</span>}
          {!room.isActive && (
            <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-500 flex-shrink-0">
              Inactive
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 flex-shrink-0">
          <span>{counts.OCCUPIED}/{room.capacity} occupied</span>
          {room.semesterPrice != null && (
            <span className="font-semibold text-gray-700">
              GH₵{room.semesterPrice.toLocaleString()}/semester
            </span>
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100">
          {beds.length === 0 ? (
            <p className="text-xs text-gray-400 py-2">No beds recorded for this room.</p>
          ) : (
            <div className="flex flex-wrap gap-2 pt-3">
              {[...beds]
                .sort((a, b) => a.bedNumber.localeCompare(b.bedNumber))
                .map((bed) => (
                  <BedChip
                    key={bed.id}
                    bed={bed}
                    onToggleMaintenance={onToggleBedMaintenance}
                    isToggling={togglingBedId === bed.id}
                    onTransferClick={onTransferClick}
                    onCheckInClick={onCheckInClick}
                    onRetireClick={onRetireClick}
                  onHistoryClick={onHistoryClick}
                    />
                ))}
            </div>
          )}
          <div className="flex justify-end pt-3 mt-1 border-t border-gray-100">
            <button
              onClick={onDeleteClick}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Room
            </button>
            <button
              onClick={onChangeCapacityClick}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Layers className="w-3.5 h-3.5" /> Change Capacity
            </button>
            <button
              onClick={() => onToggleActiveClick(room)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              {room.isActive ? (
                <>
                  <Lock className="w-3.5 h-3.5" /> Close Room
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" /> Reopen Room
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADD ROOM MODAL
// ─────────────────────────────────────────────────────────────────────────────

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-gray-600 mb-1">{children}</label>;
}

const inputClass =
  "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500";

function AddRoomModal({ propertyId, onClose }: { propertyId: number; onClose: () => void }) {
  const [addRoom, { isLoading }] = useAddRoomMutation();
  const [form, setForm] = useState({
    roomNumber: "",
    block: "",
    floor: "",
    gender: "MIXED" as RoomGender,
    capacity: 2,
    semesterPrice: "" as string | number,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.roomNumber.trim() || !form.capacity) return;
    const result = await addRoom({
      propertyId,
      roomNumber: form.roomNumber.trim(),
      block: form.block.trim() || undefined,
      floor: form.floor.trim() || undefined,
      gender: form.gender,
      capacity: Number(form.capacity),
      semesterPrice: form.semesterPrice === "" ? undefined : Number(form.semesterPrice),
    });
    if (!("error" in result)) onClose();
  };

  return (
    <ModalShell title="Add Room" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FieldLabel>Room Number</FieldLabel>
          <input
            className={inputClass}
            placeholder="e.g. 101 or A101"
            value={form.roomNumber}
            onChange={(e) => setForm((f) => ({ ...f, roomNumber: e.target.value }))}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Block</FieldLabel>
            <input
              className={inputClass}
              placeholder="e.g. A"
              value={form.block}
              onChange={(e) => setForm((f) => ({ ...f, block: e.target.value }))}
            />
          </div>
          <div>
            <FieldLabel>Floor</FieldLabel>
            <input
              className={inputClass}
              placeholder="e.g. 1"
              value={form.floor}
              onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Gender</FieldLabel>
            <select
              className={inputClass}
              value={form.gender}
              onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as RoomGender }))}
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="MIXED">Mixed</option>
            </select>
          </div>
          <div>
            <FieldLabel>Capacity</FieldLabel>
            <input
              type="number"
              min={1}
              className={inputClass}
              value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
              required
            />
          </div>
        </div>
        <div>
          <FieldLabel>Semester Price (GH₵)</FieldLabel>
          <input
            type="number"
            min={0}
            className={inputClass}
            placeholder="Optional"
            value={form.semesterPrice}
            onChange={(e) => setForm((f) => ({ ...f, semesterPrice: e.target.value }))}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
        >
          {isLoading ? "Adding…" : "Add Room"}
        </button>
      </form>
    </ModalShell>
  );
}

function SetPricingModal({ propertyId, onClose }: { propertyId: number; onClose: () => void }) {
  const { data: pricingData, isLoading: loadingPricing } = useGetPropertyPricingQuery(propertyId);
  const { data: roomsData } = useGetHostelRoomsQuery(propertyId);
  const [addPaymentStructure, { isLoading: isSaving }] = useAddPaymentStructureMutation();

  const [showForm, setShowForm] = useState(false);
  const [price, setPrice] = useState<string | number>("");
  const [roomId, setRoomId] = useState<string>("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveUntil, setEffectiveUntil] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const rows = pricingData?.data ?? [];
  const rooms = roomsData?.rooms ?? [];

  const PRICING_STATUS_STYLES: Record<string, { chip: string; label: string }> = {
    ACTIVE:   { chip: "bg-emerald-50 border-emerald-200 text-emerald-700", label: "Active" },
    UPCOMING: { chip: "bg-blue-50 border-blue-200 text-blue-700", label: "Upcoming" },
    EXPIRED:  { chip: "bg-gray-100 border-gray-300 text-gray-500", label: "Expired" },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!price) return;
    setError(null);
    const body: any = { propertyId, price: Number(price) };
    if (roomId) body.roomId = Number(roomId);
    if (effectiveFrom) body.effectiveFrom = new Date(effectiveFrom).toISOString();
    if (effectiveUntil) body.effectiveUntil = new Date(effectiveUntil).toISOString();
    if (reason.trim()) body.reason = reason.trim();

    const result = await addPaymentStructure(body);
    if (!("error" in result)) {
      setShowForm(false);
      setPrice("");
      setRoomId("");
      setEffectiveFrom("");
      setEffectiveUntil("");
      setReason("");
    } else {
      const errData = (result.error as any)?.data;
      setError(errData?.message ?? "Failed to configure pricing.");
    }
  };

  return (
    <ModalShell title="Hostel Pricing" onClose={onClose}>
      {!showForm ? (
        <>
          {loadingPricing ? (
            <div className="space-y-2 mb-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : rows.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-8 text-center mb-4">
              <p className="text-sm text-gray-500">No pricing configured yet.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto mb-4">
              {rows.map((r: any) => {
                const style = PRICING_STATUS_STYLES[r.status] ?? PRICING_STATUS_STYLES.EXPIRED;
                return (
                  <div key={r.id} className="border border-gray-200 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {r.room?.roomNumber ? `Room ${r.room.roomNumber}` : "Property default"}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">GH{String.fromCharCode(8373)}{r.price.toLocaleString()}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(r.effectiveFrom).toLocaleDateString()}
                          {" - "}
                          {r.effectiveUntil ? new Date(r.effectiveUntil).toLocaleDateString() : "ongoing"}
                        </p>
                        {r.createdByName && <p className="text-xs text-gray-400 mt-0.5">Set by {r.createdByName}</p>}
                        {r.reason && <p className="text-xs text-gray-400 mt-0.5">Reason: {r.reason}</p>}
                      </div>
                      <span className={`flex-shrink-0 px-2 py-1 rounded-md text-xs font-semibold border ${style.chip}`}>
                        {style.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            Schedule New Price
          </button>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <FieldLabel>Price (GH{String.fromCharCode(8373)})</FieldLabel>
            <input
              type="number"
              min={0}
              className={inputClass}
              placeholder="e.g. 800"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div>
            <FieldLabel>Applies To</FieldLabel>
            <select className={inputClass} value={roomId} onChange={(e) => setRoomId(e.target.value)}>
              <option value="">Whole property (default)</option>
              {rooms.map((room: any) => (
                <option key={room.id} value={room.id}>Room {room.roomNumber}</option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Effective From (optional - defaults to now)</FieldLabel>
            <input
              type="date"
              className={inputClass}
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Effective Until (optional - leave blank for ongoing)</FieldLabel>
            <input
              type="date"
              className={inputClass}
              value={effectiveUntil}
              onChange={(e) => setEffectiveUntil(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Reason (optional)</FieldLabel>
            <input
              type="text"
              className={inputClass}
              placeholder="e.g. Semester 2 price increase"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          {effectiveFrom && new Date(effectiveFrom) > new Date() && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
              This price takes effect on {new Date(effectiveFrom).toLocaleDateString()}. Existing bookings keep their original price - this only applies to bookings made on or after that date.
            </div>
          )}
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">{error}</div>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-xl transition-colors"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BULK ADD MODAL (form → confirmation → result)
// ─────────────────────────────────────────────────────────────────────────────

// -----------------------------------------------------------------------
// EDIT HOSTEL PROFILE MODAL
// -----------------------------------------------------------------------
function EditHostelProfileModal({
  propertyId,
  initialData,
  onClose,
}: {
  propertyId: number;
  initialData: { emergencyContactName?: string; emergencyContactPhone?: string; rules?: string };
  onClose: () => void;
}) {
  const [updateHostelProfile, { isLoading }] = useUpdateHostelProfileMutation();
  const [form, setForm] = useState({
    emergencyContactName: initialData.emergencyContactName ?? "",
    emergencyContactPhone: initialData.emergencyContactPhone ?? "",
    rules: initialData.rules ?? "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await updateHostelProfile({
      propertyId,
      emergencyContactName: form.emergencyContactName.trim() || undefined,
      emergencyContactPhone: form.emergencyContactPhone.trim() || undefined,
      rules: form.rules.trim() || undefined,
    });
    if (!("error" in result)) onClose();
  };

  return (
    <ModalShell title="Hostel Profile" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FieldLabel>Emergency Contact Name</FieldLabel>
          <input
            className={inputClass}
            placeholder="e.g. Hostel Security"
            value={form.emergencyContactName}
            onChange={(e) => setForm((f) => ({ ...f, emergencyContactName: e.target.value }))}
          />
        </div>
        <div>
          <FieldLabel>Emergency Contact Phone</FieldLabel>
          <input
            className={inputClass}
            placeholder="e.g. 020 XXX XXXX"
            value={form.emergencyContactPhone}
            onChange={(e) => setForm((f) => ({ ...f, emergencyContactPhone: e.target.value }))}
          />
        </div>
        <div>
          <FieldLabel>Hostel Rules</FieldLabel>
          <textarea
            className={inputClass}
            rows={5}
            placeholder={"One rule per line, e.g.\nNo visitors after 9pm\nNo cooking in rooms"}
            value={form.rules}
            onChange={(e) => setForm((f) => ({ ...f, rules: e.target.value }))}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
        >
          {isLoading ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </ModalShell>
  );
}

function BulkCapacityModal({ propertyId, onClose }: { propertyId: number; onClose: () => void }) {
  const [bulkPreview, { isLoading: isPreviewing }] = useBulkPreviewCapacityMutation();
  const [bulkApply, { isLoading: isApplying }] = useBulkApplyCapacityMutation();
  const [step, setStep] = useState<"form" | "preview" | "result">("form");
  const [form, setForm] = useState({ startRoom: "", endRoom: "", capacity: 2 });
  const [preview, setPreview] = useState<any>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [applyResult, setApplyResult] = useState<any>(null);

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.startRoom.trim() || !form.endRoom.trim() || !form.capacity) return;
    const res = await bulkPreview({ propertyId, startRoom: form.startRoom.trim(), endRoom: form.endRoom.trim(), capacity: Number(form.capacity) });
    if ("data" in res && res.data) {
      setPreview(res.data.data);
      setSelected(new Set(res.data.data.results.filter((r: any) => r.status === "safe").map((r: any) => r.roomId)));
      setStep("preview");
    }
  };

  const toggleRoom = (roomId: number) => {
    setSelected((s) => { const next = new Set(s); next.has(roomId) ? next.delete(roomId) : next.add(roomId); return next; });
  };

  const handleApply = async () => {
    const res = await bulkApply({ propertyId, roomIds: [...selected], capacity: Number(form.capacity) });
    if ("data" in res && res.data) { setApplyResult(res.data.data); setStep("result"); }
  };

  return (
    <ModalShell title="Bulk Change Bed Spaces" onClose={onClose}>
      {step === "form" && (
        <form onSubmit={handlePreview} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><FieldLabel>Start Room</FieldLabel><input className={inputClass} placeholder="e.g. 101" value={form.startRoom} onChange={(e) => setForm((f) => ({ ...f, startRoom: e.target.value }))} required /></div>
            <div><FieldLabel>End Room</FieldLabel><input className={inputClass} placeholder="e.g. 120" value={form.endRoom} onChange={(e) => setForm((f) => ({ ...f, endRoom: e.target.value }))} required /></div>
          </div>
          <div><FieldLabel>New number of beds per room</FieldLabel><input type="number" min={1} max={10} className={inputClass} value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))} required /></div>
          <button type="submit" disabled={isPreviewing} className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors">
            {isPreviewing ? "Checking..." : "Preview Changes"}
          </button>
        </form>
      )}

      {step === "preview" && preview && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{preview.safeCount} of {preview.roomsFound} room(s) can be changed. Uncheck any you want to skip.</p>
          <div className="max-h-64 overflow-y-auto space-y-1.5">
            {preview.results.map((r: any) => (
              <div key={r.roomId} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${r.status === "blocked" ? "bg-rose-50 text-rose-700" : "bg-gray-50"}`}>
                {r.status === "safe" ? (
                  <input type="checkbox" checked={selected.has(r.roomId)} onChange={() => toggleRoom(r.roomId)} />
                ) : <span className="w-4" />}
                <span className="font-semibold">Room {r.roomNumber}</span>
                {r.status === "blocked" && <span className="text-xs">- blocked: {r.blockedReason?.map((b: any) => b.detail).join(", ")}</span>}
                {r.status === "noChange" && <span className="text-xs text-gray-400">- no change needed</span>}
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep("form")} className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-xl transition-colors">Back</button>
            <button onClick={handleApply} disabled={isApplying || selected.size === 0} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors">
              {isApplying ? "Applying..." : `Confirm - ${selected.size} Room(s)`}
            </button>
          </div>
        </div>
      )}

      {step === "result" && applyResult && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-700">
            <p className="font-bold">{applyResult.updatedCount} room(s) updated.</p>
            {applyResult.blockedCount > 0 && <p className="mt-1">{applyResult.blockedCount} skipped as blocked.</p>}
          </div>
          <button onClick={onClose} className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-2.5 rounded-xl transition-colors">Done</button>
        </div>
      )}
    </ModalShell>
  );
}

function BulkAddModal({ propertyId, onClose }: { propertyId: number; onClose: () => void }) {
  const [bulkAddRooms, { isLoading }] = useBulkAddRoomsMutation();
  const [step, setStep] = useState<"form" | "confirm" | "result">("form");
  const [form, setForm] = useState({
    startRoom: "",
    endRoom: "",
    block: "",
    floor: "",
    gender: "MIXED" as RoomGender,
    capacity: 2,
    semesterPrice: "" as string | number,
  });
  const [result, setResult] = useState<{ created: Room[]; skipped: string[] } | null>(null);

  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.startRoom.trim() || !form.endRoom.trim() || !form.capacity) return;
    setStep("confirm");
  };

  const handleConfirm = async () => {
    const res = await bulkAddRooms({
      propertyId,
      startRoom: form.startRoom.trim(),
      endRoom: form.endRoom.trim(),
      block: form.block.trim() || undefined,
      floor: form.floor.trim() || undefined,
      gender: form.gender,
      capacity: Number(form.capacity),
      semesterPrice: form.semesterPrice === "" ? undefined : Number(form.semesterPrice),
    });
    if ("data" in res && res.data) {
      setResult(res.data);
      setStep("result");
    }
  };

  return (
    <ModalShell title="Bulk Add Rooms" onClose={onClose}>
      {step === "form" && (
        <form onSubmit={handlePreview} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Start Room</FieldLabel>
              <input
                className={inputClass}
                placeholder="e.g. 101 or A101"
                value={form.startRoom}
                onChange={(e) => setForm((f) => ({ ...f, startRoom: e.target.value }))}
                required
              />
            </div>
            <div>
              <FieldLabel>End Room</FieldLabel>
              <input
                className={inputClass}
                placeholder="e.g. 120 or A120"
                value={form.endRoom}
                onChange={(e) => setForm((f) => ({ ...f, endRoom: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Block</FieldLabel>
              <input
                className={inputClass}
                placeholder="Optional"
                value={form.block}
                onChange={(e) => setForm((f) => ({ ...f, block: e.target.value }))}
              />
            </div>
            <div>
              <FieldLabel>Floor</FieldLabel>
              <input
                className={inputClass}
                placeholder="Optional"
                value={form.floor}
                onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Gender</FieldLabel>
              <select
                className={inputClass}
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as RoomGender }))}
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="MIXED">Mixed</option>
              </select>
            </div>
            <div>
              <FieldLabel>Capacity (beds/room)</FieldLabel>
              <input
                type="number"
                min={1}
                className={inputClass}
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
                required
              />
            </div>
          </div>
          <div>
            <FieldLabel>Semester Price (GH₵)</FieldLabel>
            <input
              type="number"
              min={0}
              className={inputClass}
              placeholder="Optional — applies to all rooms in range"
              value={form.semesterPrice}
              onChange={(e) => setForm((f) => ({ ...f, semesterPrice: e.target.value }))}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            Preview
          </button>
        </form>
      )}

      {step === "confirm" && (
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-gray-700">
            <p>
              You're about to create rooms <span className="font-bold">{form.startRoom}</span> through{" "}
              <span className="font-bold">{form.endRoom}</span>
              {form.block && (
                <>
                  {" "}
                  in block <span className="font-bold">{form.block}</span>
                </>
              )}
              , each with <span className="font-bold">{form.capacity}</span> beds.
            </p>
            <p className="mt-2 text-gray-500 text-xs">
              Rooms that already exist in this range will be skipped automatically — nothing existing will be overwritten.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep("form")}
              className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-xl transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
            >
              {isLoading ? "Creating…" : "Confirm & Create"}
            </button>
          </div>
        </div>
      )}

      {step === "result" && result && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-700">
            <p className="font-bold">{result.created.length} room(s) created.</p>
            {result.skipped.length > 0 && (
              <p className="mt-1 text-emerald-600">
                Skipped {result.skipped.length} already-existing room(s): {result.skipped.join(", ")}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </ModalShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PENDING APPROVAL ROW
// ─────────────────────────────────────────────────────────────────────────────

const ALL_BOOKING_STATUSES = [
  "ALL", "PENDING_APPROVAL", "AWAITING_PAYMENT", "ACTIVE", "EXTENDED",
  "EXPIRING", "CANCELLED", "REJECTED", "EXPIRED", "COMPLETED",
] as const;

const BOOKING_STATUS_LABEL: Record<string, string> = {
  ALL:               "All",
  PENDING_APPROVAL:  "Pending",
  AWAITING_PAYMENT:  "Awaiting Payment",
  ACTIVE:            "Active",
  EXTENDED:          "Active",
  EXPIRING:          "Expiring",
  CANCELLED:         "Cancelled",
  REJECTED:          "Rejected",
  EXPIRED:           "Expired",
  COMPLETED:         "Completed",
};

const BOOKING_STATUS_STYLE: Record<string, string> = {
  PENDING_APPROVAL:  "bg-amber-50 text-amber-700",
  AWAITING_PAYMENT:  "bg-orange-50 text-orange-700",
  ACTIVE:            "bg-emerald-50 text-emerald-700",
  EXTENDED:          "bg-emerald-50 text-emerald-700",
  EXPIRING:          "bg-amber-50 text-amber-700",
  CANCELLED:         "bg-rose-50 text-rose-700",
  REJECTED:          "bg-rose-50 text-rose-700",
  EXPIRED:           "bg-gray-100 text-gray-500",
  COMPLETED:         "bg-gray-100 text-gray-500",
};

const bookingActionFor = (status: string): string => {
  if (status === "PENDING_APPROVAL") return "Review below";
  if (status === "AWAITING_PAYMENT") return "Awaiting student payment";
  if (status === "ACTIVE" || status === "EXTENDED") return "Manage below";
  return "-";
};

function CheckoutModal({
  bookingId,
  reference,
  studentName,
  onClose,
}: {
  bookingId: number;
  reference: string;
  studentName: string;
  onClose: () => void;
}) {
  const [checkoutStudent, { isLoading }] = useCheckoutStudentMutation();
  const [actualEndDate, setActualEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "success">("form");

  const handleConfirm = async () => {
    setError(null);
    const result = await checkoutStudent({ bookingId, actualEndDate: new Date(actualEndDate + "T00:00:00").toISOString() });
    if ("error" in result) {
      const errData = (result.error as any)?.data;
      setError(errData?.message ?? "Checkout failed. Please try again.");
      return;
    }
    setStep("success");
  };

  return (
    <ModalShell title="Checkout Student" onClose={onClose}>
      {step === "form" ? (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-3 text-sm">
            <p className="font-bold text-gray-900">{studentName}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">{reference}</p>
          </div>
          <div>
            <FieldLabel>Actual Check-out Date</FieldLabel>
            <input
              type="date"
              className={inputClass}
              value={actualEndDate}
              onChange={(e) => setActualEndDate(e.target.value)}
            />
          </div>
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">{error}</div>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={handleConfirm}
              className="flex-1 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
            >
              {isLoading ? "Checking out..." : "Confirm Checkout"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center py-6">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-9 h-9 text-emerald-500" />
          </div>
          <p className="font-bold text-gray-900 text-lg">Checked out successfully</p>
          <p className="text-sm text-gray-500 mt-1">{studentName}</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </ModalShell>
  );
}
function ManagerBookingTimeline({ bookingId }: { bookingId: number }) {
  const { data, isLoading } = useGetBookingTimelineQuery(bookingId);
  const events = data?.events ?? [];

  if (isLoading) {
    return <p className="text-xs text-gray-400 py-2">Loading timeline...</p>;
  }
  if (events.length === 0) {
    return <p className="text-xs text-gray-400 py-2">No transitions recorded yet.</p>;
  }
  return (
    <div className="space-y-1.5 py-2 pl-2 border-l-2 border-gray-100">
      {events.map((e) => (
        <div key={e.id} className="text-xs">
          <span className="font-semibold text-gray-700">{e.toStatus}</span>
          <span className="text-gray-400"> - {new Date(e.createdAt).toLocaleString("en-GH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} - {e.actorName}</span>
          {e.reason && <p className="text-gray-500 mt-0.5">{e.reason}</p>}
        </div>
      ))}
    </div>
  );
}
function StudentHistoryModal({
  propertyId,
  studentClerkId,
  onClose,
}: {
  propertyId: number;
  studentClerkId: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useGetStudentBookingHistoryQuery({ propertyId, studentClerkId });
  const student = data?.student;
  const bookings = data?.bookings ?? [];
  const [expandedBookingId, setExpandedBookingId] = useState<number | null>(null);

  return (
    <ModalShell title={student?.name ?? "Student History"} onClose={onClose}>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : (
        <>
          {student && (
            <div className="bg-gray-50 rounded-xl p-3 mb-4 text-xs text-gray-600 space-y-0.5">
              {student.email && <p>{student.email}</p>}
              {student.phoneNumber && <p>{student.phoneNumber}</p>}
            </div>
          )}
          <p className="text-xs font-semibold text-gray-500 mb-2">
            {bookings.length} booking{bookings.length === 1 ? "" : "s"} at this hostel
          </p>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {bookings.map((b: any) => (
              <div key={b.id} className="border border-gray-200 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-gray-400">{b.reference?.slice(0, 14)}</span>
                  <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-semibold ${BOOKING_STATUS_STYLE[b.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                  </span>
                </div>
                <p className="text-sm text-gray-900">
                  {b.roomNumber ?? "-"}{b.bed?.bedNumber ? ` / ${b.bed.bedNumber}` : ""} - {b.semesterName}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">GHS {Number(b.amountPaid ?? 0).toLocaleString()}</p>
                <button
                  onClick={() => setExpandedBookingId(expandedBookingId === b.id ? null : b.id)}
                  className="text-xs font-semibold text-gray-400 hover:text-gray-600 mt-1"
                >
                  {expandedBookingId === b.id ? "Hide timeline" : "View timeline"}
                </button>
                {expandedBookingId === b.id && <ManagerBookingTimeline bookingId={b.id} />}
              </div>
            ))}
          </div>
        </>
      )}
    </ModalShell>
  );
}
function AllBookingsTable({ propertyId }: { propertyId: number }) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [selectedCheckoutBooking, setSelectedCheckoutBooking] = useState<any>(null);

  const { data, isLoading } = useGetHostelBookingsPaginatedQuery({
    propertyId,
    search: search || undefined,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    page,
    limit: 20,
  }, { skip: !propertyId });

  const bookings = data?.bookings ?? [];
  const pagination = data?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 1 };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-base font-bold text-gray-900">
          All Bookings {pagination.total > 0 && `(${pagination.total})`}
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search student or reference..."
              className="text-xs px-2.5 py-2 border border-gray-200 rounded-lg bg-white w-48"
            />
            <button type="submit" className="text-xs px-2.5 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">
              Search
            </button>
          </form>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="text-xs px-2.5 py-2 border border-gray-200 rounded-lg bg-white"
          >
            {ALL_BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>{BOOKING_STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">No bookings match this filter.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                  <th className="px-4 py-3 font-semibold">Booking</th>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Room / Bed</th>
                  <th className="px-4 py-3 font-semibold">Semester</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b: any) => (
                  <tr key={b.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{b.reference?.slice(0, 14)}</td>
                    <td className="px-4 py-3 font-medium">
                      <button
                        onClick={() => setSelectedStudent(b.studentClerkId)}
                        className="text-gray-900 hover:text-orange-600 hover:underline transition-colors text-left"
                      >
                        {b.studentName ?? "Unknown student"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {b.roomNumber ?? "-"}{b.bed?.bedNumber ? ` / ${b.bed.bedNumber}` : ""}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{b.semesterName}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">GHS {Number(b.amountPaid ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-semibold ${BOOKING_STATUS_STYLE[b.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {(b.status === "ACTIVE" || b.status === "EXTENDED") ? (
                        <button
                          onClick={() => setSelectedCheckoutBooking(b)}
                          className="text-gray-700 hover:text-gray-900 font-semibold hover:underline"
                        >
                          Checkout
                        </button>
                      ) : (
                        <span className="text-gray-400">{bookingActionFor(b.status)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-3">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-gray-500">Page {pagination.page} of {pagination.totalPages}</span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    
      {selectedStudent && (
        <StudentHistoryModal
          propertyId={propertyId}
          studentClerkId={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    
      {selectedCheckoutBooking && (
        <CheckoutModal
          bookingId={selectedCheckoutBooking.id}
          reference={selectedCheckoutBooking.reference}
          studentName={selectedCheckoutBooking.studentName ?? "Unknown student"}
          onClose={() => setSelectedCheckoutBooking(null)}
        />
      )}
    </div>
  );
}
function ApproveConfirmModal({
  booking,
  onClose,
  onConfirm,
  isLoading,
}: {
  booking: any;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  const submittedText = new Date(booking.createdAt).toLocaleString("en-GH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <ModalShell title="Approve Booking" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-xl p-4 space-y-2.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Student</span>
            <span className="font-semibold text-gray-900">{booking.studentName ?? "Unknown student"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Semester</span>
            <span className="font-semibold text-gray-900">{booking.semesterName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Room / Bed</span>
            <span className="font-semibold text-gray-900">
              {booking.roomNumber ?? "-"}{booking.bed?.bedNumber ? " / " + booking.bed.bedNumber : ""}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Price</span>
            <span className="font-semibold text-gray-900">GHS {Number(booking.amountPaid ?? 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Reference</span>
            <span className="font-mono text-xs text-gray-700">{booking.reference}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Submitted</span>
            <span className="text-gray-700">{submittedText}</span>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          The system will re-check availability, eligibility, booking conflicts, and pricing before approval.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            {isLoading ? "Approving..." : "Confirm Approval"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
function PendingApprovalRow({
  booking,
  onApprove,
  onReject,
  isBusy,
}: {
  booking: any;
  onApprove: () => void;
  onReject: () => void;
  isBusy: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border border-gray-200 rounded-xl bg-white">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {booking.studentName ?? "Unknown student"} {booking.roomNumber ? `— Room ${booking.roomNumber}` : ""}
        </p>
        <p className="text-xs text-gray-500">
          {booking.semesterName} · GH₵{Number(booking.amountPaid ?? 0).toLocaleString()}
        </p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={onReject}
          disabled={isBusy}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Reject
        </button>
        <button
          onClick={onApprove}
          disabled={isBusy}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 transition-colors"
        >
          Approve
        </button>
      </div>
    </div>
  );
}

const REJECTION_REASONS = [
  "Student not eligible",
  "Incorrect information",
  "Missing information",
  "Bed/room unavailable",
  "Hostel policy conflict",
  "Semester unavailable",
  "Duplicate/conflicting booking",
  "Other",
];

function RejectReasonModal({
  onClose,
  onConfirm,
  isLoading,
}: {
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading: boolean;
}) {
  const [selectedReason, setSelectedReason] = useState(REJECTION_REASONS[0]);
  const [otherText, setOtherText] = useState("");

  const isOther = selectedReason === "Other";
  const finalReason = isOther ? otherText.trim() : selectedReason;
  const canSubmit = isOther ? otherText.trim().length >= 5 : true;

  return (
    <ModalShell title="Reject Booking" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <FieldLabel>Reason</FieldLabel>
          <select
            className={inputClass}
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
          >
            {REJECTION_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {isOther && (
          <div>
            <FieldLabel>Explain (shown to the student)</FieldLabel>
            <textarea
              className={`${inputClass} min-h-[90px] resize-none`}
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder="Please explain why this booking is being rejected"
            />
          </div>
        )}

        <button
          onClick={() => canSubmit && onConfirm(finalReason)}
          disabled={!canSubmit || isLoading}
          className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
        >
          {isLoading ? "Rejecting..." : "Reject Booking"}
        </button>
      </div>
    </ModalShell>
  );
}
function CapacityChangeModal({ room, onClose }: { room: Room; onClose: () => void }) {
  const [updateRoomCapacity, { isLoading }] = useUpdateRoomCapacityMutation();
  const beds = room.beds ?? [];
  const [newCapacity, setNewCapacity] = useState(room.capacity);
  const [blockedInfo, setBlockedInfo] = useState<{ field: string; message: string }[] | null>(null);

  const sortedBeds = [...beds].sort((a, b) => a.bedNumber.localeCompare(b.bedNumber));
  const diff = newCapacity - room.capacity;

  let previewAdded: string[] = [];
  let previewRemoved: { bedNumber: string; status: BedStatus }[] = [];

  if (diff > 0) {
    const existingLabels = new Set(sortedBeds.map((b) => b.bedNumber));
    let code = 65;
    while (previewAdded.length < diff && code < 91) {
      const label = String.fromCharCode(code);
      if (!existingLabels.has(label)) previewAdded.push(label);
      code++;
    }
  } else if (diff < 0) {
    previewRemoved = sortedBeds.slice(newCapacity).map((b) => ({ bedNumber: b.bedNumber, status: b.status }));
  }

  const handleConfirm = async () => {
    setBlockedInfo(null);
    const result = await updateRoomCapacity({ roomId: room.id, capacity: newCapacity });
    if ("error" in result) {
      const errData = (result.error as any)?.data;
      if (errData?.errors) setBlockedInfo(errData.errors);
      return;
    }
    onClose();
  };

  return (
    <ModalShell title={`Room ${room.roomNumber} - Bed Spaces`} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <FieldLabel>Number of beds</FieldLabel>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setNewCapacity((c) => Math.max(1, c - 1))}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold">-</button>
            <span className="text-lg font-bold text-gray-900 w-8 text-center">{newCapacity}</span>
            <button type="button" onClick={() => setNewCapacity((c) => Math.min(10, c + 1))}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold">+</button>
          </div>
        </div>

        {diff === 0 && <p className="text-sm text-gray-500">No change - this room already has {room.capacity} bed(s).</p>}

        {diff > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700">
            <p className="font-semibold mb-1">This will add {diff} bed space{diff === 1 ? "" : "s"}:</p>
            <p>{previewAdded.map((l) => `+ Bed ${l}`).join(", ")}</p>
          </div>
        )}

        {diff < 0 && !blockedInfo && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
            <p className="font-semibold mb-1">This will remove {previewRemoved.length} bed space{previewRemoved.length === 1 ? "" : "s"}:</p>
            <ul className="space-y-0.5">
              {previewRemoved.map((b) => (
                <li key={b.bedNumber}>
                  - Bed {b.bedNumber} ({b.status === "AVAILABLE" || b.status === "MAINTENANCE" ? "empty" : b.status.toLowerCase()})
                  {(b.status === "OCCUPIED" || b.status === "RESERVED") && " - a student is booked here, this may be blocked"}
                </li>
              ))}
            </ul>
          </div>
        )}

        {blockedInfo && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">
            <p className="font-semibold mb-1">Cannot reduce capacity</p>
            <ul className="space-y-0.5">
              {blockedInfo.map((e, i) => <li key={i}>{e.field}: {e.message}</li>)}
            </ul>
            <p className="mt-2 text-xs">Move or check out the student(s) above before reducing capacity.</p>
          </div>
        )}

        <button type="submit" disabled={isLoading || diff === 0} onClick={handleConfirm}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors">
          {isLoading ? "Saving..." : diff === 0 ? "No changes to save" : diff > 0 ? "Confirm - Add Beds" : "Confirm - Remove Beds"}
        </button>
      </div>
    </ModalShell>
  );
}

function TransferModal({ bed, rooms, onClose }: { bed: Bed; rooms: Room[]; onClose: () => void }) {
  const { data: info, isLoading: loadingInfo } = useGetBedTransferInfoQuery(bed.id);
  const [transferBedMutation, { isLoading: isSubmitting }] = useTransferBedMutation();
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [targetRoomId, setTargetRoomId] = useState<number | "">("");
  const [targetBedId, setTargetBedId] = useState<number | "">("");
  const [reason, setReason] = useState("STUDENT_REQUEST");
  const [reasonNote, setReasonNote] = useState("");
  const [oldBedStatus, setOldBedStatus] = useState<"AVAILABLE" | "MAINTENANCE">("AVAILABLE");
  const [error, setError] = useState<string | null>(null);

  const roomsWithAvailableBeds = rooms.filter((r) => (r.beds ?? []).some((b) => b.status === "AVAILABLE"));
  const selectedRoom = rooms.find((r) => r.id === targetRoomId);
  const availableBedsInRoom = (selectedRoom?.beds ?? []).filter((b) => b.status === "AVAILABLE");
  const selectedBed = availableBedsInRoom.find((b) => b.id === targetBedId);

  const REASON_LABELS: Record<string, string> = {
    ROOM_MAINTENANCE: "Room Maintenance",
    STUDENT_REQUEST: "Student Request",
    OCCUPANCY_REBALANCING: "Occupancy Rebalancing",
    ACCESSIBILITY: "Accessibility",
    DISCIPLINARY: "Disciplinary",
    OTHER: "Other",
  };

  const canProceedToConfirm = targetBedId !== "" && (reason !== "OTHER" || reasonNote.trim().length > 0);

  const handleConfirm = async () => {
    if (!info || targetBedId === "") return;
    setError(null);
    const result = await transferBedMutation({
      bookingId: info.bookingId,
      targetBedId: targetBedId as number,
      reason,
      reasonNote: reason === "OTHER" ? reasonNote.trim() : undefined,
      oldBedStatus,
    });
    if ("error" in result) {
      const errData = (result.error as any)?.data;
      setError(errData?.message ?? "Transfer failed. Please try again.");
      return;
    }
    onClose();
  };

  if (loadingInfo || !info) {
    return (
      <ModalShell title="Transfer Student" onClose={onClose}>
        <p className="text-sm text-gray-500 py-8 text-center">Loading student info...</p>
      </ModalShell>
    );
  }

  return (
    <ModalShell title="Transfer Student" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-xl p-3 text-sm">
          <p className="font-bold text-gray-900">{info.studentName}</p>
          <p className="text-gray-500 mt-0.5">Currently: Room {info.currentRoomNumber} - Bed {info.currentBedNumber}</p>
        </div>

        {step === "form" && (
          <>
            <div>
              <FieldLabel>Transfer To - Room</FieldLabel>
              <select
                className={inputClass}
                value={targetRoomId}
                onChange={(e) => { setTargetRoomId(Number(e.target.value)); setTargetBedId(""); }}
              >
                <option value="">Select a room</option>
                {roomsWithAvailableBeds.map((r) => (
                  <option key={r.id} value={r.id}>Room {r.roomNumber}</option>
                ))}
              </select>
            </div>
            {targetRoomId !== "" && (
              <div>
                <FieldLabel>Transfer To - Bed</FieldLabel>
                <select
                  className={inputClass}
                  value={targetBedId}
                  onChange={(e) => setTargetBedId(Number(e.target.value))}
                >
                  <option value="">Select a bed</option>
                  {availableBedsInRoom.map((b) => (
                    <option key={b.id} value={b.id}>Bed {b.bedNumber}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <FieldLabel>Reason</FieldLabel>
              <select className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)}>
                {Object.entries(REASON_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            {reason === "OTHER" && (
              <div>
                <FieldLabel>Explanation</FieldLabel>
                <textarea
                  className={inputClass}
                  rows={3}
                  placeholder="Please explain the reason for this transfer"
                  value={reasonNote}
                  onChange={(e) => setReasonNote(e.target.value)}
                />
              </div>
            )}
            <div>
              <FieldLabel>Old Bed Will Become</FieldLabel>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 text-sm text-gray-700">
                  <input type="radio" checked={oldBedStatus === "AVAILABLE"} onChange={() => setOldBedStatus("AVAILABLE")} />
                  Available
                </label>
                <label className="flex items-center gap-1.5 text-sm text-gray-700">
                  <input type="radio" checked={oldBedStatus === "MAINTENANCE"} onChange={() => setOldBedStatus("MAINTENANCE")} />
                  Maintenance
                </label>
              </div>
            </div>
            <button
              type="button"
              disabled={!canProceedToConfirm}
              onClick={() => setStep("confirm")}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
            >
              Review Transfer
            </button>
          </>
        )}

        {step === "confirm" && selectedRoom && selectedBed && (
          <>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-gray-700 space-y-1">
              <p>Transfer <span className="font-bold">{info.studentName}</span>?</p>
              <p>From: <span className="font-semibold">Room {info.currentRoomNumber} - Bed {info.currentBedNumber}</span></p>
              <p>To: <span className="font-semibold">Room {selectedRoom.roomNumber} - Bed {selectedBed.bedNumber}</span></p>
              <p>Reason: <span className="font-semibold">{REASON_LABELS[reason]}</span>{reason === "OTHER" ? ` - ${reasonNote}` : ""}</p>
              <p>Old bed will be: <span className="font-semibold">{oldBedStatus === "AVAILABLE" ? "Available" : "Maintenance"}</span></p>
            </div>
            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">{error}</div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep("form")}
                className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-xl transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirm}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
              >
                {isSubmitting ? "Transferring..." : "Confirm Transfer"}
              </button>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
}

function CheckInModal({ bed, onClose }: { bed: Bed; onClose: () => void }) {
  const { data: info, isLoading: loadingInfo } = useGetBedTransferInfoQuery(bed.id);
  const [recordCheckIn, { isLoading: isSubmitting }] = useRecordCheckInMutation();
  const [step, setStep] = useState<"confirm" | "success" | "already">("confirm");
  const [error, setError] = useState<string | null>(null);
  const [resultTime, setResultTime] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!info) return;
    setError(null);
    const result = await recordCheckIn(info.bookingId);
    if ("error" in result) {
      const errData = (result.error as any)?.data;
      setError(errData?.message ?? "Check-in failed. Please try again.");
      return;
    }
    const data = (result as any).data?.data;
    setResultTime(data?.checkedInAt ?? new Date().toISOString());
    setStep(data?.message === "Already checked in" ? "already" : "success");
  };

  const formattedTime = resultTime
    ? new Date(resultTime).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
    : "";

  if (loadingInfo || !info) {
    return (
      <ModalShell title="Record Check-In" onClose={onClose}>
        <p className="text-sm text-gray-500 py-8 text-center">Loading student info...</p>
      </ModalShell>
    );
  }

  return (
    <ModalShell title="Record Check-In" onClose={onClose}>
      <div className="space-y-4">
        {(step === "confirm") && (
          <>
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-500" />
              </div>
              <p className="font-bold text-gray-900 text-lg">{info.studentName}</p>
              <p className="text-sm text-gray-500 mt-0.5">Room {info.currentRoomNumber} - Bed {info.currentBedNumber}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 text-center">
              Confirm this student has physically arrived and is checking in today.
            </div>
            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">{error}</div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirm}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
              >
                {isSubmitting ? "Recording..." : "Confirm Check-In"}
              </button>
            </div>
          </>
        )}

        {(step === "success" || step === "already") && (
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-9 h-9 text-emerald-500" />
            </div>
            <p className="font-bold text-gray-900 text-lg">
              {step === "already" ? "Already checked in" : "Checked in successfully"}
            </p>
            <p className="text-sm text-gray-500 mt-1">{info.studentName}</p>
            <p className="text-xs text-gray-400 mt-3">{formattedTime}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-2.5 rounded-xl transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

const ACTIVITY_META: Record<string, { icon: any; bg: string; iconColor: string; label: string }> = {
  HOSTEL_BED_STATUS_UPDATED:         { icon: Wrench,       bg: "bg-gray-100",   iconColor: "text-gray-500",    label: "Updated bed status" },
  HOSTEL_STUDENT_CHECKOUT:           { icon: CheckCircle2, bg: "bg-gray-100",   iconColor: "text-gray-500",    label: "Checked out a student" },
  HOSTEL_BOOKING_APPROVED:           { icon: CheckCircle2, bg: "bg-emerald-50", iconColor: "text-emerald-500", label: "Approved a booking" },
  HOSTEL_BOOKING_REJECTED:           { icon: X,            bg: "bg-rose-50",    iconColor: "text-rose-500",    label: "Rejected a booking" },
  HOSTEL_BED_TRANSFER:               { icon: RefreshCw,    bg: "bg-orange-50",  iconColor: "text-orange-500",  label: "Transferred a student" },
  HOSTEL_STUDENT_CHECKED_IN:         { icon: CheckCircle2, bg: "bg-emerald-50", iconColor: "text-emerald-500", label: "Recorded a check-in" },
  HOSTEL_BOOKING_NO_SHOW_MARKED:     { icon: AlertTriangle,bg: "bg-amber-50",   iconColor: "text-amber-500",   label: "Marked a no-show" },
  HOSTEL_BED_RETIRED:                { icon: Trash2,       bg: "bg-gray-100",   iconColor: "text-gray-500",    label: "Retired a bed" },
  HOSTEL_ROOM_CAPACITY_UPDATED:      { icon: Layers,       bg: "bg-gray-100",   iconColor: "text-gray-500",    label: "Changed room capacity" },
  HOSTEL_ROOM_CAPACITY_BULK_UPDATED: { icon: Layers,       bg: "bg-gray-100",   iconColor: "text-gray-500",    label: "Bulk changed room capacity" },
  HOSTEL_PROFILE_UPDATED:            { icon: Info,         bg: "bg-gray-100",   iconColor: "text-gray-500",    label: "Updated hostel profile" },
  HOSTEL_ROOM_ADDED:                 { icon: Plus,         bg: "bg-emerald-50", iconColor: "text-emerald-500", label: "Added a room" },
  HOSTEL_ROOMS_BULK_ADDED:           { icon: Wand2,        bg: "bg-emerald-50", iconColor: "text-emerald-500", label: "Bulk added rooms" },
  HOSTEL_ROOM_DELETED:               { icon: Trash2,       bg: "bg-rose-50",    iconColor: "text-rose-500",    label: "Deleted a room" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function ActivityLogModal({ propertyId, onClose }: { propertyId: number; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useGetManagerActivityLogQuery({ propertyId, page });
  const logs = data?.data?.logs ?? [];
  const pagination = data?.data?.pagination;

  return (
    <ModalShell title="Activity Log" onClose={onClose}>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center">
            <History className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No activity yet.</p>
          </div>
        ) : (
          logs.map((log: any) => {
            const meta = ACTIVITY_META[log.action] ?? { icon: Info, bg: "bg-gray-100", iconColor: "text-gray-500", label: log.action };
            const Icon = meta.icon;
            return (
              <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                  <Icon className={`w-4 h-4 ${meta.iconColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">{meta.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{timeAgo(log.createdAt)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
      {pagination && pagination.totalPages > page && (
        <button
          type="button"
          disabled={isFetching}
          onClick={() => setPage((p) => p + 1)}
          className="w-full mt-3 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-gray-700 font-semibold py-2.5 rounded-xl transition-colors text-sm"
        >
          {isFetching ? "Loading..." : "Load more"}
        </button>
      )}
    </ModalShell>
  );
}

function NoShowModal({ propertyId, onClose }: { propertyId: number; onClose: () => void }) {
  const { data, isLoading } = useGetHostelNoShowCandidatesQuery(propertyId);
  const [markNoShow, { isLoading: isMarking }] = useMarkHostelNoShowMutation();
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const candidates = data?.data ?? [];

  const daysOverdue = (checkIn: string) => {
    const diff = Date.now() - new Date(checkIn).getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  };

  const handleMark = async (bookingId: number) => {
    await markNoShow(bookingId);
    setConfirmingId(null);
  };

  return (
    <ModalShell title="No-Show Candidates" onClose={onClose}>
      <p className="text-sm text-gray-500 mb-4">Approved bookings past check-in with no arrival recorded.</p>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : candidates.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No overdue check-ins right now.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {candidates.map((c: any) => (
            <div key={c.bookingId} className="bg-white border border-gray-200 rounded-xl p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{c.studentName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Room {c.roomNumber}</p>
                  {c.studentPhone && <p className="text-xs text-gray-500">{c.studentPhone}</p>}
                  <p className="text-xs text-amber-600 mt-0.5">{daysOverdue(c.checkIn)} days overdue</p>
                </div>
                {confirmingId === c.bookingId ? (
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg text-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isMarking}
                      onClick={() => handleMark(c.bookingId)}
                      className="text-xs px-2.5 py-1.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-lg font-semibold"
                    >
                      Confirm
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingId(c.bookingId)}
                    className="text-xs px-2.5 py-1.5 border border-rose-200 text-rose-600 rounded-lg font-semibold flex-shrink-0"
                  >
                    Mark no-show
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

function RetireBedModal({ bed, onClose }: { bed: Bed; onClose: () => void }) {
  const [retireBed, { isLoading }] = useRetireBedMutation();
  const [reason, setReason] = useState("");
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);
    const result = await retireBed({ bedId: bed.id, reason: reason.trim() });
    if ("error" in result) {
      const errData = (result.error as any)?.data;
      setError(errData?.message ?? "Failed to retire bed. Please try again.");
      return;
    }
    onClose();
  };

  return (
    <ModalShell title="Retire Bed" onClose={onClose}>
      <div className="space-y-4">
        {step === "form" && (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
              Retiring Bed {bed.bedNumber} permanently takes it out of service. It cannot be booked again unless manually reversed later.
            </div>
            <div>
              <FieldLabel>Reason</FieldLabel>
              <textarea
                className={inputClass}
                rows={3}
                placeholder="e.g. Frame damaged, mattress unusable"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <button
              type="button"
              disabled={reason.trim().length === 0}
              onClick={() => setStep("confirm")}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
            >
              Review
            </button>
          </>
        )}

        {step === "confirm" && (
          <>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-gray-700 space-y-1">
              <p>Permanently retire <span className="font-bold">Bed {bed.bedNumber}</span>?</p>
              <p>Reason: <span className="font-semibold">{reason}</span></p>
              <p className="text-rose-600 text-xs mt-2">This bed will no longer be available for new bookings.</p>
            </div>
            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">{error}</div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep("form")}
                className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-xl transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleConfirm}
                className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
              >
                {isLoading ? "Retiring..." : "Retire Bed"}
              </button>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
}

function ToggleRoomActiveModal({ room, onClose }: { room: Room; onClose: () => void }) {
  const [updateRoom, { isLoading }] = useUpdateRoomMutation();
  const [error, setError] = useState<string | null>(null);
  const closing = room.isActive;

  const handleConfirm = async () => {
    setError(null);
    const result = await updateRoom({ roomId: room.id, isActive: !closing });
    if ("error" in result) {
      const errData = (result.error as any)?.data;
      setError(errData?.message ?? "Failed to update room. Please try again.");
      return;
    }
    onClose();
  };

  return (
    <ModalShell title={closing ? "Close Room" : "Reopen Room"} onClose={onClose}>
      <div className="space-y-4">
        <div className={`rounded-xl p-3 text-sm ${closing ? "bg-amber-50 border border-amber-200 text-amber-700" : "bg-emerald-50 border border-emerald-200 text-emerald-700"}`}>
          {closing
            ? `Closing Room ${room.roomNumber} hides it from students and blocks new bookings. It stays visible to you and can be reopened anytime.`
            : `Reopening Room ${room.roomNumber} makes it bookable by students again.`}
        </div>
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">{error}</div>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={handleConfirm}
            className={`flex-1 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors ${closing ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-500 hover:bg-emerald-600"}`}
          >
            {isLoading ? "Saving..." : closing ? "Close Room" : "Reopen Room"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

const HISTORY_ACTION_LABELS: Record<string, string> = {
  HOSTEL_BED_STATUS_UPDATED: "Status changed",
  HOSTEL_STUDENT_CHECKOUT: "Student checked out",
  HOSTEL_BOOKING_CREATED: "Booking created",
  HOSTEL_BOOKING_APPROVED: "Booking approved",
  HOSTEL_BOOKING_REJECTED: "Booking rejected",
  HOSTEL_BED_TRANSFER: "Transfer",
  HOSTEL_BED_RETIRED: "Retired",
};

function bedHistoryTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function BedHistoryModal({ bed, onClose }: { bed: Bed; onClose: () => void }) {
  const { data, isLoading } = useGetBedStatusHistoryQuery(bed.id);
  const entries = data?.data ?? [];

  return (
    <ModalShell title={`Bed ${bed.bedNumber} History`} onClose={onClose}>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-8 text-center">
          <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No history recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {entries.map((e: any) => (
            <div key={e.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-gray-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">{HISTORY_ACTION_LABELS[e.action] ?? e.action}</p>
                <p className="text-xs text-gray-500 mt-0.5">{e.oldStatus} - {e.newStatus}</p>
                <p className="text-xs text-gray-400 mt-0.5">{bedHistoryTimeAgo(e.createdAt)}</p>
                <p className="text-xs text-gray-500 mt-1">Actor: {e.actorName}</p>
                {e.reason && <p className="text-xs text-gray-500">Reason: {e.reason}</p>}
                {e.bookingReference && <p className="text-xs text-gray-500">Booking: {e.bookingReference}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

function DeleteRoomModal({
  roomId,
  roomNumber,
  blockingBedCount,
  onClose,
  onDeleted,
}: {
  roomId: number;
  roomNumber: string;
  blockingBedCount: number;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleteRoom, { isLoading }] = useDeleteRoomMutation();
  const canDelete = blockingBedCount === 0;

  const handleDelete = async () => {
    const result = await deleteRoom(roomId);
    if (!("error" in result)) onDeleted();
  };

  return (
    <ModalShell title="Delete Room" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-rose-700">
            <p className="font-semibold">Room {roomNumber} will be permanently deleted.</p>
            <p className="mt-1 text-rose-600">This cannot be undone. All beds in this room will be removed.</p>
          </div>
        </div>

        {!canDelete && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
            <p className="font-semibold">Cannot delete this room.</p>
            <p className="mt-1">
              {blockingBedCount} bed{blockingBedCount === 1 ? " is" : "s are"} currently occupied or reserved.
              A room can only be deleted once no beds are occupied or reserved � move affected beds to maintenance
              or wait until bookings end first.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!canDelete || isLoading}
            className="flex-1 flex items-center justify-center gap-1.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {isLoading ? "Deleting�" : "Delete Room"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function ManagerHostelPage() {
  const { user } = useUser();
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [expandedRooms, setExpandedRooms] = useState<Set<number>>(new Set());
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);
  const [capacityRoom, setCapacityRoom] = useState<Room | null>(null);
  const [transferBed, setTransferBed] = useState<Bed | null>(null);
  const [checkInBed, setCheckInBed] = useState<Bed | null>(null);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showNoShow, setShowNoShow] = useState(false);
  const [retireBedTarget, setRetireBedTarget] = useState<Bed | null>(null);
  const [toggleActiveRoom, setToggleActiveRoom] = useState<Room | null>(null);
  const [bedHistoryTarget, setBedHistoryTarget] = useState<Bed | null>(null);
  const [mobileDrillBlock, setMobileDrillBlock] = useState<string | null>(null);
  const [mobileDrillFloor, setMobileDrillFloor] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBlock, setFilterBlock] = useState("ALL");
  const [filterFloor, setFilterFloor] = useState("ALL");
  const [filterGender, setFilterGender] = useState("ALL");
  const [filterBedStatus, setFilterBedStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState("roomNumber");
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [showSetPricing, setShowSetPricing] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [showBulkCapacity, setShowBulkCapacity] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [togglingBedId, setTogglingBedId] = useState<number | null>(null);
  const [rejectingBookingId, setRejectingBookingId] = useState<number | null>(null);
  const [busyBookingId, setBusyBookingId] = useState<number | null>(null);
  const [confirmApproveBooking, setConfirmApproveBooking] = useState<any>(null);

  const { data: propertiesRaw, isLoading: loadingProps } = useGetManagerPropertiesQuery(user?.id ?? "", {
    skip: !user?.id,
  });

  const properties: any[] = useMemo(() => {
    if (!propertiesRaw) return [];
    if (Array.isArray(propertiesRaw)) return propertiesRaw;
    return (propertiesRaw as any).data ?? [];
  }, [propertiesRaw]);

  const hostelProperties = properties.filter(
    (p: any) => p.propertyType === "HOSTEL" || p.listingType === "HOSTEL"
  );
  const activePropertyId = selectedPropertyId ?? hostelProperties[0]?.id ?? null;
  const activeProperty = hostelProperties.find((p: any) => p.id === activePropertyId) ?? null;

  const { data: roomsData, isLoading: loadingRooms } = useGetHostelRoomsQuery(activePropertyId!, {
    skip: !activePropertyId,
  });
  const { data: attention } = useGetHostelAttentionCenterQuery(activePropertyId!, { skip: !activePropertyId });
  const { data: stats, isLoading: loadingStats, refetch: refetchStats } = useGetHostelStatisticsQuery(
    activePropertyId!,
    { skip: !activePropertyId }
  );
  const { data: bookingsRaw, isLoading: loadingBookings } = useGetHostelBookingsQuery(activePropertyId!, {
    skip: !activePropertyId,
  });

  const [updateBedStatus] = useUpdateBedStatusMutation();
  const [approveBooking] = useApproveBookingMutation();
  const [rejectBooking] = useRejectBookingMutation();

  const rooms: Room[] = roomsData?.rooms ?? [];
  const pendingBookings: any[] = (bookingsRaw ?? []).filter(
    (b: any) => b.status === ("PENDING_APPROVAL" as HostelBookingStatus)
  );

  const isLoading = loadingProps || loadingRooms || loadingStats;

  const filteredRooms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rooms.filter((room) => {
      if (q) {
        const matchesSearch =
          room.roomNumber?.toLowerCase().includes(q) ||
          room.block?.toLowerCase().includes(q) ||
          room.floor?.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      if (filterBlock !== "ALL" && (room.block?.trim() || "Unassigned") !== filterBlock) return false;
      if (filterFloor !== "ALL" && (room.floor?.trim() || "") !== filterFloor) return false;
      if (filterGender !== "ALL" && room.gender !== filterGender) return false;
      if (filterBedStatus !== "ALL") {
        const beds = room.beds ?? [];
        const hasMatch =
          filterBedStatus === "RETIRED" ? beds.some((b) => b.isRetired) :
          filterBedStatus === "MAINTENANCE" ? beds.some((b) => b.status === "MAINTENANCE" && !b.isRetired) :
          beds.some((b) => b.status === filterBedStatus);
        if (!hasMatch) return false;
      }
      return true;
    });
  }, [rooms, searchQuery, filterBlock, filterFloor, filterGender, filterBedStatus]);

  const uniqueBlocks = useMemo(() => {
    const blocks = new Set(rooms.map((r) => r.block?.trim() || "Unassigned"));
    return Array.from(blocks).sort();
  }, [rooms]);

  const uniqueFloors = useMemo(() => {
    const floors = new Set(rooms.map((r) => r.floor?.trim()).filter(Boolean) as string[]);
    return Array.from(floors).sort();
  }, [rooms]);

  const roomsByBlock = useMemo(() => {
    const groups = new Map<string, Room[]>();
    for (const room of filteredRooms) {
      const key = room.block?.trim() || "Unassigned";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(room);
    }
    const sortRooms = (a: Room, b: Room) => {
      if (sortBy === "occupancy") {
        const aOcc = (a.beds ?? []).filter((bed) => bed.status === "OCCUPIED").length;
        const bOcc = (b.beds ?? []).filter((bed) => bed.status === "OCCUPIED").length;
        return bOcc - aOcc;
      }
      if (sortBy === "price") {
        return (a.semesterPrice ?? 0) - (b.semesterPrice ?? 0);
      }
      return a.roomNumber.localeCompare(b.roomNumber);
    };
    const occupancyOf = (rms: Room[]) => {
      const beds = rms.flatMap((r) => r.beds ?? []);
      const occupied = beds.filter((b) => b.status === "OCCUPIED").length;
      return { total: beds.length, occupied, pct: beds.length ? Math.round((occupied / beds.length) * 100) : 0 };
    };
    const blockEntries = Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
    return blockEntries.map(([block, blockRooms]) => {
      const floorGroups = new Map<string, Room[]>();
      for (const room of blockRooms) {
        const fKey = room.floor?.trim() || "Unassigned";
        if (!floorGroups.has(fKey)) floorGroups.set(fKey, []);
        floorGroups.get(fKey)!.push(room);
      }
      const floors = Array.from(floorGroups.entries())
        .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
        .map(([floor, floorRooms]) => {
          const sorted = [...floorRooms].sort(sortRooms);
          return { floor, rooms: sorted, occupancy: occupancyOf(floorRooms) };
        });
      return { block, floors, occupancy: occupancyOf(blockRooms), roomCount: blockRooms.length };
    });
  }, [filteredRooms, sortBy]);

  const toggleRoom = (roomId: number) => {
    setExpandedRooms((prev) => {
      const next = new Set(prev);
      next.has(roomId) ? next.delete(roomId) : next.add(roomId);
      return next;
    });
  };

  const handleToggleBedMaintenance = async (bed: Bed) => {
    setTogglingBedId(bed.id);
    try {
      await updateBedStatus({
        bedId: bed.id,
        status: bed.status === "AVAILABLE" ? "MAINTENANCE" : "AVAILABLE",
      });
    } finally {
      setTogglingBedId(null);
    }
  };

  const handleApprove = async (bookingId: number) => {
    setBusyBookingId(bookingId);
    try {
      await approveBooking(bookingId);
    } finally {
      setBusyBookingId(null);
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (rejectingBookingId == null) return;
    setBusyBookingId(rejectingBookingId);
    try {
      await rejectBooking({ bookingId: rejectingBookingId, reason });
      setRejectingBookingId(null);
    } finally {
      setBusyBookingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hostel Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">Rooms, beds, and student approvals</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetchStats()}
              className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
            {activePropertyId && (
              <>
                <div className="hidden md:flex md:items-center md:gap-2">
                  <button
                    onClick={() => setShowBulkAdd(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Wand2 className="w-4 h-4" /> Bulk Add
                  </button>
                  <button
                    onClick={() => setShowBulkCapacity(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Layers className="w-4 h-4" /> Bulk Capacity
                  </button>
                  <button
                    onClick={() => setShowAddRoom(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 bg-orange-500 hover:bg-orange-600 rounded-xl text-sm font-semibold text-white transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Room
                  </button>
                  <button
                    onClick={() => setShowSetPricing(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <DollarSign className="w-4 h-4" /> Set Pricing
                  </button>
                  <button
                    onClick={() => setShowEditProfile(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Info className="w-4 h-4" /> Hostel Profile
                  </button>
                  <button
                    onClick={() => setShowActivityLog(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <History className="w-4 h-4" /> Activity
                  </button>
                  <button
                    onClick={() => setShowNoShow(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4" /> No-Show
                  </button>
                </div>
                <div className="flex md:hidden items-center gap-2 relative">
                  <button
                    onClick={() => setShowAddRoom(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 bg-orange-500 hover:bg-orange-600 rounded-xl text-sm font-semibold text-white transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Room
                  </button>
                  <button
                    onClick={() => setShowMobileMenu((v) => !v)}
                    className="flex items-center justify-center w-10 h-10 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex-shrink-0"
                  >
                    <MoreHorizontal className="w-4 h-4 text-gray-600" />
                  </button>
                  {showMobileMenu && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-lg py-1.5 z-50">
                      <button
                        onClick={() => { setShowBulkAdd(true); setShowMobileMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors text-left"
                      >
                        <Wand2 className="w-4 h-4 text-gray-400" /> Bulk Add
                      </button>
                      <button
                        onClick={() => { setShowBulkCapacity(true); setShowMobileMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors text-left"
                      >
                        <Layers className="w-4 h-4 text-gray-400" /> Bulk Capacity
                      </button>
                      <button
                        onClick={() => { setShowSetPricing(true); setShowMobileMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors text-left"
                      >
                        <DollarSign className="w-4 h-4 text-gray-400" /> Set Pricing
                      </button>
                      <button
                        onClick={() => { setShowEditProfile(true); setShowMobileMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors text-left"
                      >
                        <Info className="w-4 h-4 text-gray-400" /> Hostel Profile
                      </button>
                      <button
                        onClick={() => { setShowActivityLog(true); setShowMobileMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors text-left"
                      >
                        <History className="w-4 h-4 text-gray-400" /> Activity
                      </button>
                      <button
                        onClick={() => { setShowNoShow(true); setShowMobileMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors text-left"
                      >
                        <AlertTriangle className="w-4 h-4 text-gray-400" /> No-Show
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Property selector (only shown if manager has multiple hostels) */}
        {hostelProperties.length > 1 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <select
              value={activePropertyId ?? ""}
              onChange={(e) => setSelectedPropertyId(Number(e.target.value))}
              className={inputClass}
            >
              {hostelProperties.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Empty state — no hostel properties at all */}
        {hostelProperties.length === 0 && !loadingProps ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <GraduationCap className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">No hostel properties</h3>
            <p className="text-sm text-gray-500">List a hostel property to start managing rooms and beds.</p>
          </div>
        ) : activePropertyId ? (
          <>
            {/* Statistics */}
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(7)].map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Building2} label="Total Rooms" value={stats?.totalRooms ?? 0} bg="bg-gray-50" text="text-gray-600" />
                <StatCard
                  icon={DollarSign}
                  label="Revenue"
                  value={`GH₵${(stats?.totalRevenue ?? 0).toLocaleString()}`}
                  bg="bg-emerald-50"
                  text="text-emerald-600"
                />
                <StatCard icon={AlertTriangle} label="Outstanding" value={"GH" + String.fromCharCode(8373) + (stats?.outstandingAmount ?? 0).toLocaleString()} bg="bg-amber-50" text="text-amber-600" />
                <div onClick={() => { window.location.href = "/managers/hostel/occupancy?propertyId=" + activePropertyId; }} className="cursor-pointer"><StatCard icon={Gauge} label="Occupancy" value={`${Math.round(stats?.occupancyRate ?? 0)}%`} bg="bg-orange-50" text="text-orange-600" /></div>
                <StatCard icon={BedDouble} label="Available Beds" value={stats?.availableBeds ?? 0} bg="bg-emerald-50" text="text-emerald-600" />
                <StatCard icon={Wrench} label="Maintenance" value={stats?.maintenanceBeds ?? 0} bg="bg-gray-100" text="text-gray-500" />
                  <StatCard icon={Lock} label="Retired" value={stats?.retiredBeds ?? 0} bg="bg-slate-100" text="text-slate-500" />
                <StatCard icon={Clock} label="Pending Approvals" value={stats?.pendingApprovals ?? 0} bg="bg-amber-50" text="text-amber-600" />
                <StatCard icon={CheckCircle2} label="Confirmed" value={stats?.confirmedBookings ?? 0} bg="bg-blue-50" text="text-blue-600" />
              </div>
            )}

            {/* Pending Approvals */}
            {attention && (attention.upcomingCheckIns?.length > 0 || attention.upcomingCheckOuts?.length > 0 || attention.maintenanceBeds?.length > 0) && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
            <h2 className="text-base font-bold text-gray-900 mb-3">Needs Attention</h2>
            <div className="space-y-2">
              {attention.upcomingCheckIns?.map((item: any) => (
                <div key={"ci-" + item.bookingId} className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-lg text-sm">
                  <span className="text-blue-700 font-medium">{item.studentName} - Room {item.roomNumber}</span>
                  <span className="text-xs text-blue-500">Check-in soon</span>
                </div>
              ))}
              {attention.upcomingCheckOuts?.map((item: any) => (
                <div key={"co-" + item.bookingId} className="flex items-center justify-between px-3 py-2 bg-purple-50 rounded-lg text-sm">
                  <span className="text-purple-700 font-medium">{item.studentName} - Room {item.roomNumber}</span>
                  <span className="text-xs text-purple-500">Check-out soon</span>
                </div>
              ))}
              {attention.maintenanceBeds?.map((item: any) => (
                <div key={"mb-" + item.bedId} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm">
                  <span className="text-gray-700 font-medium">Room {item.roomNumber} - Bed {item.bedNumber}</span>
                  <span className="text-xs text-gray-500">Under maintenance</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
              <h2 className="text-base font-bold text-gray-900 mb-3">
                Pending Approvals {pendingBookings.length > 0 && `(${pendingBookings.length})`}
              </h2>
              {loadingBookings ? (
                <div className="space-y-2">
                  <Skeleton className="h-14" />
                  <Skeleton className="h-14" />
                </div>
              ) : pendingBookings.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                  <p className="text-sm text-gray-500">No bookings waiting for approval.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingBookings.map((booking) => (
                    <PendingApprovalRow
                      key={booking.id}
                      booking={booking}
                      isBusy={busyBookingId === booking.id}
                      onApprove={() => setConfirmApproveBooking(booking)}
                      onReject={() => setRejectingBookingId(booking.id)}
                    />
                  ))}
                </div>
              )}
            </div>
            <AllBookingsTable propertyId={activePropertyId!} />


            {/* Inventory — grouped by block */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-gray-900">Room Inventory</h2>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Available</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Reserved</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Occupied</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400" /> Maintenance</span>
                </div>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search room, block, floor..."
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                <select value={filterBlock} onChange={(e) => setFilterBlock(e.target.value)} className="text-xs px-2.5 py-2 border border-gray-200 rounded-lg bg-white flex-shrink-0">
                  <option value="ALL">All Blocks</option>
                  {uniqueBlocks.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
                <select value={filterFloor} onChange={(e) => setFilterFloor(e.target.value)} className="text-xs px-2.5 py-2 border border-gray-200 rounded-lg bg-white flex-shrink-0">
                  <option value="ALL">All Floors</option>
                  {uniqueFloors.map((f) => <option key={f} value={f}>Floor {f}</option>)}
                </select>
                <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)} className="text-xs px-2.5 py-2 border border-gray-200 rounded-lg bg-white flex-shrink-0">
                  <option value="ALL">All Genders</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="MIXED">Mixed</option>
                </select>
                <select value={filterBedStatus} onChange={(e) => setFilterBedStatus(e.target.value)} className="text-xs px-2.5 py-2 border border-gray-200 rounded-lg bg-white flex-shrink-0">
                  <option value="ALL">All Bed Status</option>
                  <option value="AVAILABLE">Available</option>
                  <option value="RESERVED">Reserved</option>
                  <option value="OCCUPIED">Occupied</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="RETIRED">Retired</option>
                </select>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="text-xs px-2.5 py-2 border border-gray-200 rounded-lg bg-white flex-shrink-0">
                  <option value="roomNumber">Sort: Room Number</option>
                  <option value="occupancy">Sort: Occupancy</option>
                  <option value="price">Sort: Price</option>
                </select>
              </div>

              <div className="hidden md:block">
                {loadingRooms ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : rooms.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
                  <Layers className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-gray-900 mb-1">You haven't added any rooms yet.</h3>
                  <p className="text-sm text-gray-500 mb-4">Add a single room, or bulk add a whole block at once.</p>
                  <button
                    onClick={() => setShowBulkAdd(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 rounded-xl text-sm font-semibold text-white transition-colors"
                  >
                    <Wand2 className="w-4 h-4" /> Bulk Add Rooms
                  </button>
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
                  <Search className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-gray-900 mb-1">No rooms match your search.</h3>
                  <p className="text-sm text-gray-500">Try a different room number, block, or floor.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {roomsByBlock.map(({ block, floors, occupancy, roomCount }) => (
                    <div key={block}>
                      <div className="flex items-center gap-2 mb-2 text-sm font-bold text-gray-700">
                        <Layers className="w-4 h-4 text-gray-400" />
                        Block {block}
                        <span className="text-xs font-normal text-gray-400">({roomCount} rooms)</span>
                        <span className="text-xs font-normal text-gray-400 ml-auto">{occupancy.occupied}/{occupancy.total} beds occupied ({occupancy.pct}%)</span>
                      </div>
                      <div className="space-y-3 pl-3 border-l-2 border-gray-100">
                        {floors.map(({ floor, rooms, occupancy: floorOcc }) => (
                          <div key={floor}>
                            <div className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-gray-500 pl-2">
                              Floor {floor}
                              <span className="text-gray-400 font-normal">({rooms.length} rooms - {floorOcc.occupied}/{floorOcc.total} occupied)</span>
                            </div>
                            <div className="space-y-2">
                              {rooms.map((room) => (
                                <RoomRow
                                  key={room.id}
                                  room={room}
                                  isExpanded={expandedRooms.has(room.id)}
                                  onToggleExpand={() => toggleRoom(room.id)}
                                  onToggleBedMaintenance={handleToggleBedMaintenance}
                                  togglingBedId={togglingBedId}
                                  onDeleteClick={() => setDeletingRoom(room)}
                                  onChangeCapacityClick={() => setCapacityRoom(room)}
                                  onTransferClick={(bed) => setTransferBed(bed)}
                                  onCheckInClick={(bed) => setCheckInBed(bed)}
                                  onRetireClick={(bed) => setRetireBedTarget(bed)}
                                  onHistoryClick={(bed) => setBedHistoryTarget(bed)}
                                  onToggleActiveClick={(room) => setToggleActiveRoom(room)}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>

              <div className="md:hidden">
                {loadingRooms ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-20" />
                    ))}
                  </div>
                ) : roomsByBlock.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
                    <Layers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No rooms match your search.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 text-sm mb-3 flex-wrap">
                      <button
                        type="button"
                        onClick={() => { setMobileDrillBlock(null); setMobileDrillFloor(null); }}
                        className={mobileDrillBlock ? "text-gray-500 font-medium" : "text-gray-900 font-bold"}
                      >
                        Hostel
                      </button>
                      {mobileDrillBlock && (
                        <>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                          <button
                            type="button"
                            onClick={() => setMobileDrillFloor(null)}
                            className={mobileDrillFloor ? "text-gray-500 font-medium" : "text-gray-900 font-bold"}
                          >
                            Block {mobileDrillBlock}
                          </button>
                        </>
                      )}
                      {mobileDrillFloor && (
                        <>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                          <span className="text-gray-900 font-bold">Floor {mobileDrillFloor}</span>
                        </>
                      )}
                    </div>

                    {mobileDrillBlock === null ? (
                      <div className="space-y-2">
                        {roomsByBlock.map(({ block, occupancy, roomCount }) => (
                          <button
                            type="button"
                            key={block}
                            onClick={() => setMobileDrillBlock(block)}
                            className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl text-left"
                          >
                            <div className="flex items-center gap-2">
                              <Layers className="w-4 h-4 text-gray-400" />
                              <span className="font-bold text-gray-900">Block {block}</span>
                              <span className="text-xs text-gray-400">({roomCount} rooms)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">{occupancy.occupied}/{occupancy.total} ({occupancy.pct}%)</span>
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : mobileDrillFloor === null ? (
                      <div className="space-y-2">
                        {roomsByBlock.find((b) => b.block === mobileDrillBlock)?.floors.map(({ floor, rooms, occupancy }) => (
                          <button
                            type="button"
                            key={floor}
                            onClick={() => setMobileDrillFloor(floor)}
                            className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl text-left"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900">Floor {floor}</span>
                              <span className="text-xs text-gray-400">({rooms.length} rooms)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">{occupancy.occupied}/{occupancy.total} ({occupancy.pct}%)</span>
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {roomsByBlock.find((b) => b.block === mobileDrillBlock)?.floors.find((f) => f.floor === mobileDrillFloor)?.rooms.map((room) => (
                          <RoomRow
                            key={room.id}
                            room={room}
                            isExpanded={expandedRooms.has(room.id)}
                            onToggleExpand={() => toggleRoom(room.id)}
                            onToggleBedMaintenance={handleToggleBedMaintenance}
                            togglingBedId={togglingBedId}
                            onDeleteClick={() => setDeletingRoom(room)}
                            onChangeCapacityClick={() => setCapacityRoom(room)}
                            onTransferClick={(bed) => setTransferBed(bed)}
                            onCheckInClick={(bed) => setCheckInBed(bed)}
                            onRetireClick={(bed) => setRetireBedTarget(bed)}
                            onHistoryClick={(bed) => setBedHistoryTarget(bed)}
                            onToggleActiveClick={(room) => setToggleActiveRoom(room)}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {showAddRoom && activePropertyId && (
        <AddRoomModal propertyId={activePropertyId} onClose={() => setShowAddRoom(false)} />
      )}
      {showSetPricing && activePropertyId && (
        <SetPricingModal propertyId={activePropertyId} onClose={() => setShowSetPricing(false)} />
      )}
      {showEditProfile && activePropertyId && (
        <EditHostelProfileModal
          propertyId={activePropertyId}
          initialData={{
            emergencyContactName: activeProperty?.emergencyContactName,
            emergencyContactPhone: activeProperty?.emergencyContactPhone,
            rules: activeProperty?.rules,
          }}
          onClose={() => setShowEditProfile(false)}
        />
      )}
      {deletingRoom && (
        <DeleteRoomModal
          roomId={deletingRoom.id}
          roomNumber={deletingRoom.roomNumber}
          blockingBedCount={(deletingRoom.beds ?? []).filter((b) => b.status === "OCCUPIED" || b.status === "RESERVED").length}
          onClose={() => setDeletingRoom(null)}
          onDeleted={() => setDeletingRoom(null)}
        />
      )}

      {capacityRoom && (
        <CapacityChangeModal room={capacityRoom} onClose={() => setCapacityRoom(null)} />
      )}

      {transferBed && (
        <TransferModal bed={transferBed} rooms={rooms} onClose={() => setTransferBed(null)} />
      )}

      {checkInBed && (
        <CheckInModal bed={checkInBed} onClose={() => setCheckInBed(null)} />
      )}

      {retireBedTarget && (
        <RetireBedModal bed={retireBedTarget} onClose={() => setRetireBedTarget(null)} />
      )}

      {toggleActiveRoom && (
        <ToggleRoomActiveModal room={toggleActiveRoom} onClose={() => setToggleActiveRoom(null)} />
      )}

      {bedHistoryTarget && (
        <BedHistoryModal bed={bedHistoryTarget} onClose={() => setBedHistoryTarget(null)} />
      )}

      {showActivityLog && activePropertyId && (
        <ActivityLogModal propertyId={activePropertyId} onClose={() => setShowActivityLog(false)} />
      )}

      {showNoShow && activePropertyId && (
        <NoShowModal propertyId={activePropertyId} onClose={() => setShowNoShow(false)} />
      )}
      {showBulkAdd && activePropertyId && (
        <BulkAddModal propertyId={activePropertyId} onClose={() => setShowBulkAdd(false)} />
      )}

      {showBulkCapacity && activePropertyId && (
        <BulkCapacityModal propertyId={activePropertyId} onClose={() => setShowBulkCapacity(false)} />
      )}
{confirmApproveBooking && (
        <ApproveConfirmModal
          booking={confirmApproveBooking}
          isLoading={busyBookingId === confirmApproveBooking.id}
          onClose={() => setConfirmApproveBooking(null)}
          onConfirm={async () => {
            await handleApprove(confirmApproveBooking.id);
            setConfirmApproveBooking(null);
          }}
        />
      )}
            {rejectingBookingId != null && (
        <RejectReasonModal
          onClose={() => setRejectingBookingId(null)}
          onConfirm={handleRejectConfirm}
          isLoading={busyBookingId === rejectingBookingId}
        />
      )}
    </div>
  );
}



