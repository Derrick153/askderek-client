import { CheckCircle, XCircle, User, DoorOpen, ArrowRight } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
//  HostelRoomCard.tsx
//
//  Displays a single hostel room with its availability status.
//  Used on:
//    — hostel/[id] page for students browsing rooms
//    — managers/hostel page for landlords managing rooms
//
//  Shows: room number, type, price per semester, occupant status, action button
//
//  Usage:
//    <HostelRoomCard
//      room={{ roomNumber: "14A", type: "Single", pricePerSemester: 1200 }}
//      isAvailable={true}
//      onBook={() => setSelectedRoom("14A")}
//    />
// ─────────────────────────────────────────────────────────────────────────────

export type RoomType = "SINGLE" | "DOUBLE" | "TRIPLE" | "SHARED";

export interface HostelRoom {
  roomNumber:          string;
  type?:               RoomType | string;
  pricePerSemester?:   number;
  floor?:              string | number;
  amenities?:          string[];
  occupantName?:       string;  // shown to manager only
  occupantClerkId?:    string;
}

interface HostelRoomCardProps {
  room:         HostelRoom;
  isAvailable:  boolean;
  isSelected?:  boolean;
  showOccupant?: boolean;      // true for manager view
  onBook?:      (room: HostelRoom) => void;
  onManage?:    (room: HostelRoom) => void;
  className?:   string;
}

interface RoomTypeMeta {
  label:  string;
  icon:   string;
  color:  string;
}

const ROOM_TYPE_META: Record<string, RoomTypeMeta> = {
  SINGLE: { label: "Single Room",  icon: "🛏️",  color: "text-blue-600"    },
  DOUBLE: { label: "Double Room",  icon: "🛏️🛏️", color: "text-violet-600"  },
  TRIPLE: { label: "Triple Room",  icon: "🏠",  color: "text-amber-600"   },
  SHARED: { label: "Shared Room",  icon: "👥",  color: "text-emerald-600" },
};

const formatGHS = (amount: number) =>
  `GHS ${amount.toLocaleString("en-GH", { minimumFractionDigits: 0 })}`;

export default function HostelRoomCard({
  room,
  isAvailable,
  isSelected   = false,
  showOccupant = false,
  onBook,
  onManage,
  className    = "",
}: HostelRoomCardProps) {
  const typeMeta = ROOM_TYPE_META[room.type?.toUpperCase() ?? "SINGLE"] ?? ROOM_TYPE_META.SINGLE;

  return (
    <div
      className={`
        bg-white rounded-2xl border-2 p-4 transition-all
        ${isSelected   ? "border-orange-500 shadow-md shadow-orange-100" :
          isAvailable  ? "border-gray-200 hover:border-gray-300"         :
          "border-gray-100 opacity-70"}
        ${className}
      `}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* Room number badge */}
          <div className={`
            w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm
            ${isAvailable ? "bg-orange-50 text-orange-700" : "bg-gray-100 text-gray-400"}
          `}>
            {room.roomNumber}
          </div>
          <div>
            {room.floor !== undefined && (
              <p className="text-xs text-gray-400">Floor {room.floor}</p>
            )}
            <div className="flex items-center gap-1">
              <span>{typeMeta.icon}</span>
              <p className={`text-xs font-semibold ${typeMeta.color}`}>
                {typeMeta.label}
              </p>
            </div>
          </div>
        </div>

        {/* Availability badge */}
        {isAvailable ? (
          <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
            <CheckCircle className="w-3 h-3" />
            Available
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs font-semibold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full">
            <XCircle className="w-3 h-3" />
            Occupied
          </div>
        )}
      </div>

      {/* Price */}
      {room.pricePerSemester !== undefined && (
        <div className="mb-3">
          <p className="text-xl font-black text-gray-900">
            {formatGHS(room.pricePerSemester)}
          </p>
          <p className="text-xs text-gray-400">per semester</p>
        </div>
      )}

      {/* Amenities */}
      {(room.amenities?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {room.amenities!.map((a) => (
            <span
              key={a}
              className="text-xs bg-gray-50 text-gray-500 border border-gray-100 px-2 py-0.5 rounded-lg"
            >
              {a}
            </span>
          ))}
        </div>
      )}

      {/* Occupant info — manager only */}
      {!isAvailable && showOccupant && room.occupantName && (
        <div className="flex items-center gap-2 mb-3 bg-gray-50 rounded-xl px-3 py-2">
          <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <p className="text-xs text-gray-600 font-medium truncate">
            {room.occupantName}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {isAvailable && onBook && (
          <button
            onClick={() => onBook(room)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Book Room
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
        {onManage && (
          <button
            onClick={() => onManage(room)}
            className={`
              flex items-center justify-center gap-1.5 py-2.5 px-3
              text-xs font-semibold rounded-xl transition-colors
              ${isAvailable && onBook
                ? "bg-gray-100 hover:bg-gray-200 text-gray-600"
                : "flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700"
              }
            `}
          >
            <DoorOpen className="w-3.5 h-3.5" />
            Manage
          </button>
        )}
      </div>
    </div>
  );
}