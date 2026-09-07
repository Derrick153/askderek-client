"use client";

import { useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  useGetManagerPropertiesQuery,
  useGetHostelRoomsQuery,
  useGetHostelStatisticsQuery,
  useGetHostelBookingsQuery,
  useAddRoomMutation,
  useDeleteRoomMutation,
  useUpdateRoomCapacityMutation,
  useBulkPreviewCapacityMutation,
  useBulkApplyCapacityMutation,
  useAddPaymentStructureMutation,
  useBulkAddRoomsMutation,
  useUpdateHostelProfileMutation,
  useUpdateBedStatusMutation,
  useApproveBookingMutation,
  useRejectBookingMutation,
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
}: {
  bed: Bed;
  onToggleMaintenance: (bed: Bed) => void;
  isToggling: boolean;
}) {
  const style = BED_STYLES[bed.status];
  const canToggle = bed.status === "AVAILABLE" || bed.status === "MAINTENANCE";

  return (
    <button
      type="button"
      disabled={!canToggle || isToggling}
      onClick={() => canToggle && onToggleMaintenance(bed)}
      title={
        canToggle
          ? bed.status === "AVAILABLE"
            ? "Move to maintenance"
            : "Return to available"
          : `Bed is ${style.label.toLowerCase()} — cannot toggle while booked`
      }
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${style.chip} ${
        canToggle ? "hover:opacity-80 cursor-pointer" : "cursor-not-allowed opacity-80"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      Bed {bed.bedNumber}
      <span className="opacity-60">- {style.label}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOM ROW (Inventory — grouped by block, expands to show beds)
// ─────────────────────────────────────────────────────────────────────────────

function RoomRow({
  room,
  isExpanded,
  onToggleExpand,
  onToggleBedMaintenance,
  togglingBedId,
  onDeleteClick,
  onChangeCapacityClick,
}: {
  room: Room;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleBedMaintenance: (bed: Bed) => void;
  togglingBedId: number | null;
  onDeleteClick: () => void;
  onChangeCapacityClick: () => void;
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
  const [addPaymentStructure, { isLoading }] = useAddPaymentStructureMutation();
  const [price, setPrice] = useState<string | number>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!price) return;
    const result = await addPaymentStructure({ propertyId, price: Number(price) });
    if (!("error" in result)) { onClose(); } else { alert(JSON.stringify(result.error, null, 2)); }
  };

  return (
    <ModalShell title="Set Semester Pricing" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FieldLabel>Semester Price (GH?)</FieldLabel>
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
        <p className="text-xs text-gray-500">
          This is the official price students are charged per semester. Setting a new price replaces any existing active price.
        </p>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
        >
          {isLoading ? "Saving�" : "Save Pricing"}
        </button>
      </form>
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
          {booking.studentClerkId} {booking.roomNumber ? `— Room ${booking.roomNumber}` : ""}
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

function RejectReasonModal({
  onClose,
  onConfirm,
  isLoading,
}: {
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <ModalShell title="Reject Booking" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <FieldLabel>Reason (shown to the student)</FieldLabel>
          <textarea
            className={`${inputClass} min-h-[90px] resize-none`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Bed no longer available for this semester"
          />
        </div>
        <button
          onClick={() => reason.trim() && onConfirm(reason.trim())}
          disabled={!reason.trim() || isLoading}
          className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
        >
          {isLoading ? "Rejecting…" : "Reject Booking"}
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
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [showSetPricing, setShowSetPricing] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [showBulkCapacity, setShowBulkCapacity] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [togglingBedId, setTogglingBedId] = useState<number | null>(null);
  const [rejectingBookingId, setRejectingBookingId] = useState<number | null>(null);
  const [busyBookingId, setBusyBookingId] = useState<number | null>(null);

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

  const roomsByBlock = useMemo(() => {
    const groups = new Map<string, Room[]>();
    for (const room of rooms) {
      const key = room.block?.trim() || "Unassigned";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(room);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [rooms]);

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
                <button
                  onClick={() => setShowBulkAdd(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Wand2 className="w-4 h-4" /> Bulk Add

                <button
                  onClick={() => setShowBulkCapacity(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Layers className="w-4 h-4" /> Bulk Capacity
                </button>
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
                <StatCard icon={Gauge} label="Occupancy" value={`${Math.round(stats?.occupancyRate ?? 0)}%`} bg="bg-orange-50" text="text-orange-600" />
                <StatCard icon={BedDouble} label="Available Beds" value={stats?.availableBeds ?? 0} bg="bg-emerald-50" text="text-emerald-600" />
                <StatCard icon={Wrench} label="Maintenance" value={stats?.maintenanceBeds ?? 0} bg="bg-gray-100" text="text-gray-500" />
                <StatCard icon={Clock} label="Pending Approvals" value={stats?.pendingApprovals ?? 0} bg="bg-amber-50" text="text-amber-600" />
                <StatCard icon={CheckCircle2} label="Confirmed" value={stats?.confirmedBookings ?? 0} bg="bg-blue-50" text="text-blue-600" />
              </div>
            )}

            {/* Pending Approvals */}
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
                      onApprove={() => handleApprove(booking.id)}
                      onReject={() => setRejectingBookingId(booking.id)}
                    />
                  ))}
                </div>
              )}
            </div>

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
              ) : (
                <div className="space-y-4">
                  {roomsByBlock.map(([block, blockRooms]) => (
                    <div key={block}>
                      <div className="flex items-center gap-2 mb-2 text-sm font-bold text-gray-700">
                        <Layers className="w-4 h-4 text-gray-400" />
                        Block {block}
                        <span className="text-xs font-normal text-gray-400">({blockRooms.length} rooms)</span>
                      </div>
                      <div className="space-y-2">
                        {blockRooms
                          .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }))
                          .map((room) => (
                            <RoomRow
                              key={room.id}
                              room={room}
                              isExpanded={expandedRooms.has(room.id)}
                              onToggleExpand={() => toggleRoom(room.id)}
                              onToggleBedMaintenance={handleToggleBedMaintenance}
                              togglingBedId={togglingBedId}
                              onDeleteClick={() => setDeletingRoom(room)} onChangeCapacityClick={() => setCapacityRoom(room)}
                            />
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
      {showBulkAdd && activePropertyId && (
        <BulkAddModal propertyId={activePropertyId} onClose={() => setShowBulkAdd(false)} />
      )}

      {showBulkCapacity && activePropertyId && (
        <BulkCapacityModal propertyId={activePropertyId} onClose={() => setShowBulkCapacity(false)} />
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



