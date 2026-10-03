"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useGetHostelOccupancyQuery } from "@/state/api";
import { ArrowLeft, ChevronRight, BedDouble, User } from "lucide-react";

const NAVY = "#0F1B2E";
const ORANGE = "#E85D2C";

type Level = "block" | "floor" | "room" | "bed";

function StatChip({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <span className="text-xs" style={{ color: color ?? "#8B8680" }}>
      {value} {label}
    </span>
  );
}

export default function OccupancyPage() {
  const searchParams = useSearchParams();
  const propertyId = Number(searchParams.get("propertyId")) || 0;

  const [level, setLevel] = useState<Level>("block");
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [selectedRoomLabel, setSelectedRoomLabel] = useState<string>("");

  const { data, isLoading } = useGetHostelOccupancyQuery(
    {
      propertyId,
      level,
      block: selectedBlock ?? undefined,
      floor: selectedFloor ?? undefined,
      roomId: selectedRoomId ?? undefined,
    },
    { skip: !propertyId }
  );

  const goToFloor = (block: string) => {
    setSelectedBlock(block);
    setLevel("floor");
  };
  const goToRoom = (floor: string) => {
    setSelectedFloor(floor);
    setLevel("room");
  };
  const goToBed = (roomId: number, roomLabel: string) => {
    setSelectedRoomId(roomId);
    setSelectedRoomLabel(roomLabel);
    setLevel("bed");
  };

  const backToBlock = () => {
    setLevel("block");
    setSelectedBlock(null);
    setSelectedFloor(null);
    setSelectedRoomId(null);
  };
  const backToFloor = () => {
    setLevel("floor");
    setSelectedFloor(null);
    setSelectedRoomId(null);
  };
  const backToRoom = () => {
    setLevel("room");
    setSelectedRoomId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/managers/hostel" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>

        <h1 className="text-xl font-black text-gray-900 mb-1">Occupancy</h1>

        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
          <button onClick={backToBlock} className={level === "block" ? "font-bold text-gray-900" : "hover:text-gray-900"}>
            Blocks
          </button>
          {selectedBlock && (
            <>
              <ChevronRight className="w-3.5 h-3.5" />
              <button onClick={backToFloor} className={level === "floor" ? "font-bold text-gray-900" : "hover:text-gray-900"}>
                Block {selectedBlock}
              </button>
            </>
          )}
          {selectedFloor && (
            <>
              <ChevronRight className="w-3.5 h-3.5" />
              <button onClick={backToRoom} className={level === "room" ? "font-bold text-gray-900" : "hover:text-gray-900"}>
                Floor {selectedFloor}
              </button>
            </>
          )}
          {level === "bed" && (
            <>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="font-bold text-gray-900">Room {selectedRoomLabel}</span>
            </>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-sm text-gray-400">Loading...</div>
        ) : !data || data.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-sm text-gray-500">
            No data at this level.
          </div>
        ) : level === "block" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.map((row: any) => (
              <button
                key={row.block}
                onClick={() => goToFloor(row.block)}
                className="bg-white rounded-2xl border border-gray-200 p-5 text-left hover:border-orange-300 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-gray-900">Block {row.block}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
                <p className="text-xs text-gray-400 mb-2">{row.totalRooms} room{row.totalRooms === 1 ? "" : "s"}</p>
                <div className="flex flex-wrap gap-3">
                  <StatChip label="occupied" value={row.occupiedBeds} color="#DC2626" />
                  <StatChip label="reserved" value={row.reservedBeds} color="#D97706" />
                  <StatChip label="available" value={row.availableBeds} color="#059669" />
                  <StatChip label="maintenance" value={row.maintenanceBeds} color="#6B7280" />
                </div>
              </button>
            ))}
          </div>
        ) : level === "floor" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.map((row: any) => (
              <button
                key={row.floor}
                onClick={() => goToRoom(row.floor)}
                className="bg-white rounded-2xl border border-gray-200 p-5 text-left hover:border-orange-300 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-gray-900">Floor {row.floor}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
                <p className="text-xs text-gray-400 mb-2">{row.totalRooms} room{row.totalRooms === 1 ? "" : "s"}</p>
                <div className="flex flex-wrap gap-3">
                  <StatChip label="occupied" value={row.occupiedBeds} color="#DC2626" />
                  <StatChip label="reserved" value={row.reservedBeds} color="#D97706" />
                  <StatChip label="available" value={row.availableBeds} color="#059669" />
                  <StatChip label="maintenance" value={row.maintenanceBeds} color="#6B7280" />
                </div>
              </button>
            ))}
          </div>
        ) : level === "room" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.map((row: any) => (
              <button
                key={row.id}
                onClick={() => goToBed(row.id, row.roomNumber)}
                className="bg-white rounded-2xl border border-gray-200 p-5 text-left hover:border-orange-300 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-gray-900">Room {row.roomNumber}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
                <p className="text-xs text-gray-400 mb-2">{row.gender ?? "MIXED"} - {row.totalBeds} bed{row.totalBeds === 1 ? "" : "s"}</p>
                <div className="flex flex-wrap gap-3">
                  <StatChip label="occupied" value={row.occupiedBeds} color="#DC2626" />
                  <StatChip label="reserved" value={row.reservedBeds} color="#D97706" />
                  <StatChip label="available" value={row.availableBeds} color="#059669" />
                  <StatChip label="maintenance" value={row.maintenanceBeds} color="#6B7280" />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((row: any) => (
              <div key={row.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                    <BedDouble className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Bed {row.bedNumber}</p>
                    <p className="text-xs text-gray-400">{row.status}</p>
                  </div>
                </div>
                {row.studentName ? (
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 justify-end">
                      <User className="w-3.5 h-3.5" />
                      {row.studentName}
                    </p>
                    <p className="text-xs text-gray-400">{row.bookingReference}</p>
                  </div>
                ) : row.bookingReference ? (
                  <div className="text-right">
                    <p className="text-xs text-gray-400">{row.bookingReference}</p>
                  </div>
                ) : (
                  <span className="text-xs text-gray-300">Empty</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}