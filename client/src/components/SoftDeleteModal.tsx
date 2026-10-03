"use client";

import { useState, useEffect, useRef } from "react";
import { AlertTriangle, X, Trash2, Loader2, CheckCircle, RotateCcw } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
//  SoftDeleteModal.tsx
//
//  Confirmation modal for soft-deleting a property from AskDerek.
//  Admin-only action. Includes:
//    — Reason selection (required)
//    — Detail text (required, min 10 chars)
//    — 10-second countdown undo window after confirmation
//    — Clear visual warning about what will happen
//
//  Usage:
//    <SoftDeleteModal
//      propertyId={45}
//      propertyName="3 Bedroom at East Legon"
//      adminDbId={1}
//      isOpen={true}
//      onClose={() => setOpen(false)}
//      onConfirm={async (data) => { await triggerPendingRemoval(data); }}
//    />
// ─────────────────────────────────────────────────────────────────────────────

export type DeleteType =
  | "SPAM"
  | "DUPLICATE"
  | "FRAUDULENT"
  | "SUSPENDED"
  | "LANDLORD_REQUEST"
  | "POLICY_VIOLATION"
  | "OTHER";

interface DeleteReasonConfig {
  label:       string;
  description: string;
}

const DELETE_REASONS: Record<DeleteType, DeleteReasonConfig> = {
  SPAM:              { label: "Spam",              description: "Property is spam or irrelevant listing" },
  DUPLICATE:         { label: "Duplicate",         description: "Duplicate listing already exists"       },
  FRAUDULENT:        { label: "Fraudulent",        description: "Property listing is fraudulent or fake" },
  SUSPENDED:         { label: "Suspended",         description: "Landlord account has been suspended"    },
  LANDLORD_REQUEST:  { label: "Landlord Request",  description: "Landlord requested removal"             },
  POLICY_VIOLATION:  { label: "Policy Violation",  description: "Listing violates AskDerek policies"     },
  OTHER:             { label: "Other",             description: "Another reason (specify below)"         },
};

export interface SoftDeleteData {
  propertyId: number;
  adminDbId:  number;
  reason:     string;
  deleteType: DeleteType;
}

interface SoftDeleteModalProps {
  propertyId:   number;
  propertyName: string;
  adminDbId:    number;
  isOpen:       boolean;
  onClose:      () => void;
  onConfirm:    (data: SoftDeleteData) => Promise<void>;
  undoWindowSeconds?: number;  // default 10
}

const UNDO_SECONDS = 10;

export default function SoftDeleteModal({
  propertyId,
  propertyName,
  adminDbId,
  isOpen,
  onClose,
  onConfirm,
  undoWindowSeconds = UNDO_SECONDS,
}: SoftDeleteModalProps) {
  const [deleteType,  setDeleteType]  = useState<DeleteType>("SPAM");
  const [reason,      setReason]      = useState("");
  const [isLoading,   setIsLoading]   = useState(false);
  const [error,       setError]       = useState("");
  const [phase,       setPhase]       = useState<"form" | "countdown" | "done">("form");
  const [countdown,   setCountdown]   = useState(undoWindowSeconds);
  const [undone,      setUndone]      = useState(false);

  const timerRef    = useRef<NodeJS.Timeout | null>(null);
  const executeRef  = useRef<boolean>(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  if (!isOpen) return null;

  const isValid = reason.trim().length >= 10;

  const handleSubmit = async () => {
    if (!isValid) {
      setError("Please enter a reason with at least 10 characters.");
      return;
    }
    setError("");
    setIsLoading(true);

    try {
      await onConfirm({
        propertyId,
        adminDbId,
        reason:     reason.trim(),
        deleteType,
      });

      // Start countdown
      executeRef.current = false;
      setPhase("countdown");
      setCountdown(undoWindowSeconds);

      timerRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(timerRef.current!);
            if (!executeRef.current) {
              setPhase("done");
            }
            return 0;
          }
          return c - 1;
        });
      }, 1000);

    } catch (err: any) {
      setError(err?.message ?? "Failed to queue property for removal.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUndo = () => {
    executeRef.current = true;
    clearInterval(timerRef.current!);
    setUndone(true);
    setPhase("form");
    setCountdown(undoWindowSeconds);
    // Note: actual backend undo (cancel removal) handled by parent via onClose + cancelPendingRemoval
    onClose();
  };

  const handleClose = () => {
    if (isLoading || phase === "countdown") return;
    setDeleteType("SPAM");
    setReason("");
    setError("");
    setPhase("form");
    setCountdown(undoWindowSeconds);
    setUndone(false);
    onClose();
  };

  const progressPercent = ((undoWindowSeconds - countdown) / undoWindowSeconds) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={phase === "form" ? handleClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* ── DONE STATE ── */}
        {phase === "done" && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              Property Queued for Removal
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {propertyName} has been queued for removal.
              It will be soft-deleted within the next 10 minutes.
            </p>
            <button
              onClick={handleClose}
              className="px-6 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {/* ── COUNTDOWN STATE ── */}
        {phase === "countdown" && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 relative">
              <Trash2 className="w-8 h-8 text-amber-500" />
              {/* Countdown ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="#fde68a" strokeWidth="4" />
                <circle
                  cx="32" cy="32" r="28"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - progressPercent / 100)}`}
                  className="transition-all duration-1000"
                />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              Removing in {countdown}s
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {propertyName} will be queued for removal.
              Click Undo to cancel this action.
            </p>
            <button
              onClick={handleUndo}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white text-sm font-bold rounded-xl hover:bg-orange-700 transition-colors mx-auto"
            >
              <RotateCcw className="w-4 h-4" />
              Undo — Cancel Removal
            </button>
          </div>
        )}

        {/* ── FORM STATE ── */}
        {phase === "form" && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Remove Property</h2>
                  <p className="text-xs text-gray-400 truncate max-w-[200px]">
                    {propertyName}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">

              {/* Warning */}
              <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl p-4">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-rose-800 mb-0.5">
                    This action will queue this property for deletion.
                  </p>
                  <p className="text-xs text-rose-700">
                    The property will be soft-deleted and hidden from all listings.
                    You will have a 10-second window to undo after confirming.
                  </p>
                </div>
              </div>

              {/* Delete type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Removal Reason <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(DELETE_REASONS) as [DeleteType, DeleteReasonConfig][]).map(
                    ([type, config]) => (
                      <button
                        key={type}
                        onClick={() => setDeleteType(type)}
                        className={`
                          text-left px-3 py-2.5 rounded-xl border-2 transition-all text-xs
                          ${deleteType === type
                            ? "border-rose-500 bg-rose-50 text-rose-700 font-semibold"
                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                          }
                        `}
                      >
                        <p className="font-semibold">{config.label}</p>
                        <p className={`mt-0.5 leading-tight ${
                          deleteType === type ? "text-rose-500" : "text-gray-400"
                        }`}>
                          {config.description}
                        </p>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Detail reason */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Details <span className="text-rose-500">*</span>
                  <span className={`ml-2 text-xs font-normal ${
                    reason.trim().length < 10 ? "text-gray-400" : "text-emerald-500"
                  }`}>
                    ({reason.trim().length}/10 min chars)
                  </span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => { setReason(e.target.value); setError(""); }}
                  placeholder="Explain specifically why this property is being removed..."
                  rows={3}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
                />
              </div>

              {/* Error */}
              {error && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-5 pt-0">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!isValid || isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                  : <><Trash2 className="w-4 h-4" /> Remove Property</>
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}