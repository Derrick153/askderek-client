"use client";

import { useState } from "react";
import { GraduationCap, Calendar, CheckCircle, Clock, Bell, ChevronDown, ChevronUp, Users } from "lucide-react";
import type { SchoolSemester } from "@/state/api";

// ─────────────────────────────────────────────────────────────────────────────
//  SchoolSemesterCard.tsx
//
//  Displays a school semester card for the admin/schools page.
//  Shows semester dates, confirmation status, students affected.
//  Admin can update closing date and send notifications.
//
//  Usage:
//    <SchoolSemesterCard
//      semester={semester}
//      schoolName="KNUST"
//      studentsAffected={342}
//      onUpdateEndDate={(semesterId, endDate) => updateEndDate(...)}
//      onNotifyStudents={(semesterId) => notify(...)}
//    />
// ─────────────────────────────────────────────────────────────────────────────

interface SchoolSemesterCardProps {
  semester:          SchoolSemester;
  schoolId:          number;
  schoolName?:       string;
  studentsAffected?: number;
  onUpdateEndDate?:  (semesterId: number, endDate: string) => Promise<void>;
  onNotifyStudents?: (semesterId: number) => Promise<void>;
  className?:        string;
}

const formatDate = (iso?: string | null) => {
  if (!iso) return "Not set";
  return new Date(iso).toLocaleDateString("en-GH", {
    day:     "numeric",
    month:   "long",
    year:    "numeric",
  });
};

const getDaysUntil = (iso?: string | null): number | null => {
  if (!iso) return null;
  const now  = new Date();
  now.setHours(0, 0, 0, 0);
  const end  = new Date(iso);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - now.getTime()) / 86400000);
};

export default function SchoolSemesterCard({
  semester,
  schoolId,
  schoolName,
  studentsAffected = 0,
  onUpdateEndDate,
  onNotifyStudents,
  className = "",
}: SchoolSemesterCardProps) {
  const [expanded,    setExpanded]    = useState(false);
  const [newEndDate,  setNewEndDate]  = useState(semester.endDate ?? "");
  const [isUpdating,  setIsUpdating]  = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const daysUntilEnd = getDaysUntil(semester.endDate);

  const getEndDateBadge = () => {
    if (!semester.endDate) {
      return { label: "End date not set", cls: "bg-gray-100 text-gray-500" };
    }
    if (!semester.isConfirmed) {
      return { label: "Unconfirmed", cls: "bg-amber-50 text-amber-700 border border-amber-200" };
    }
    if (daysUntilEnd !== null && daysUntilEnd < 0) {
      return { label: "Ended", cls: "bg-gray-100 text-gray-500" };
    }
    if (daysUntilEnd !== null && daysUntilEnd <= 30) {
      return { label: `Ends in ${daysUntilEnd} days`, cls: "bg-rose-50 text-rose-700 border border-rose-200" };
    }
    return { label: "Confirmed", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
  };

  const badge = getEndDateBadge();

  const handleUpdateEndDate = async () => {
    if (!newEndDate || !onUpdateEndDate) return;
    setIsUpdating(true);
    try {
      await onUpdateEndDate(semester.id, newEndDate);
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch {
      // Error handled by withToast in api.ts
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNotify = async () => {
    if (!onNotifyStudents) return;
    setIsNotifying(true);
    try {
      await onNotifyStudents(semester.id);
    } catch {
      // Error handled by withToast in api.ts
    } finally {
      setIsNotifying(false);
    }
  };

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                {semester.semesterName}
              </h3>
              {schoolName && (
                <p className="text-xs text-gray-400 mt-0.5">{schoolName}</p>
              )}
            </div>
          </div>

          {/* Status badge */}
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${badge.cls}`}>
            {badge.label}
          </span>
        </div>

        {/* Date row */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Start Date</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatDate(semester.startDate)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">End Date</p>
              <p className={`text-sm font-semibold ${
                semester.isConfirmed ? "text-gray-900" : "text-amber-600"
              }`}>
                {formatDate(semester.endDate)}
              </p>
            </div>
          </div>
        </div>

        {/* Students affected */}
        {studentsAffected > 0 && (
          <div className="flex items-center gap-2 mt-3 bg-blue-50 rounded-xl px-3 py-2">
            <Users className="w-3.5 h-3.5 text-blue-500" />
            <p className="text-xs text-blue-700 font-medium">
              {studentsAffected.toLocaleString()} students affected
            </p>
          </div>
        )}

        {/* Expand/collapse for admin actions */}
        {(onUpdateEndDate || onNotifyStudents) && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors mt-4"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? "Hide Actions" : "Admin Actions"}
          </button>
        )}
      </div>

      {/* Expanded admin actions */}
      {expanded && (
        <div className="border-t border-gray-100 p-5 bg-gray-50 space-y-4">

          {/* Update end date */}
          {onUpdateEndDate && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                {semester.isConfirmed ? "Update End Date" : "Set Confirmed End Date"}
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  disabled={isUpdating}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 disabled:opacity-60"
                />
                <button
                  onClick={handleUpdateEndDate}
                  disabled={!newEndDate || isUpdating || newEndDate === semester.endDate}
                  className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white text-xs font-semibold rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isUpdating ? (
                    "Saving..."
                  ) : updateSuccess ? (
                    <><CheckCircle className="w-3.5 h-3.5" /> Saved</>
                  ) : (
                    "Confirm"
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Confirming the end date will update all related hostel bookings.
              </p>
            </div>
          )}

          {/* Notify students */}
          {onNotifyStudents && studentsAffected > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">
                Notify Students
              </p>
              <button
                onClick={handleNotify}
                disabled={isNotifying || !semester.endDate}
                className="flex items-center gap-2 w-full justify-center py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Bell className="w-3.5 h-3.5" />
                {isNotifying
                  ? "Sending notifications..."
                  : `Notify ${studentsAffected} Students`
                }
              </button>
              {!semester.endDate && (
                <p className="text-xs text-amber-600 mt-1 text-center">
                  Set the end date first before notifying students.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}