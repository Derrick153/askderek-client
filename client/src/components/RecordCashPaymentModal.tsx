"use client";

import { useState } from "react";
import { X, Banknote, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

// -----------------------------------------------------------------------------
//  RecordCashPaymentModal.tsx
//
//  Admin records an offline cash payment against a lease - creates a new
//  Payment row marked Paid, for rent paid outside Paystack.
//
//  Usage:
//    <RecordCashPaymentModal
//      isOpen={isOpen}
//      onClose={() => setIsOpen(false)}
//      onConfirm={async (data) => { await recordCash(data).unwrap(); }}
//    />
// -----------------------------------------------------------------------------

interface ConfirmData {
  leaseId:    number;
  amountPaid: number;
  dueDate:    string;
  notes?:     string;
}

interface RecordCashPaymentModalProps {
  isOpen:    boolean;
  onClose:   () => void;
  onConfirm: (data: ConfirmData) => Promise<void>;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function RecordCashPaymentModal({
  isOpen,
  onClose,
  onConfirm,
}: RecordCashPaymentModalProps) {
  const [leaseId,    setLeaseId]    = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [dueDate,    setDueDate]    = useState(todayISO());
  const [notes,      setNotes]      = useState("");
  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState("");
  const [confirmed,  setConfirmed]  = useState(false);

  if (!isOpen) return null;

  const parsedLeaseId = parseInt(leaseId, 10);
  const parsedAmount  = parseFloat(amountPaid.replace(/,/g, "")) || 0;
  const isValid       = Number.isInteger(parsedLeaseId) && parsedLeaseId > 0 && parsedAmount > 0 && !!dueDate;

  const reset = () => {
    setLeaseId("");
    setAmountPaid("");
    setDueDate(todayISO());
    setNotes("");
    setError("");
    setConfirmed(false);
  };

  const handleConfirm = async () => {
    if (!isValid) {
      setError("Enter a valid lease ID, amount, and due date.");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      await onConfirm({
        leaseId:    parsedLeaseId,
        amountPaid: parsedAmount,
        dueDate:    new Date(dueDate).toISOString(),
        notes:      notes.trim() || undefined,
      });
      setConfirmed(true);
    } catch (err: any) {
      setError(err?.data?.message ?? err?.message ?? "Failed to record cash payment. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {confirmed ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              Cash Payment Recorded!
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              The payment has been recorded and the tenant has been notified.
            </p>
            <button
              onClick={handleClose}
              className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <Banknote className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Record Cash Payment</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    For rent paid outside Paystack
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-40"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  This creates a real, locked payment record and notifies the tenant immediately.
                  Double-check the lease ID before confirming.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Lease ID <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={leaseId}
                  onChange={(e) => { setLeaseId(e.target.value); setError(""); }}
                  placeholder="e.g. 15"
                  min="1"
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Amount Paid (GHS) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
                    GHS
                  </span>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => { setAmountPaid(e.target.value); setError(""); }}
                    placeholder="0.00"
                    min="0"
                    step="1"
                    disabled={isLoading}
                    className="w-full pl-12 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  For Month / Due Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => { setDueDate(e.target.value); setError(""); }}
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Notes{" "}
                  <span className="text-xs font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Paid in office, receipt #042"
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-gray-50"
                />
              </div>

              {error && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            <div className="flex gap-3 p-5 pt-0">
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!isValid || isLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Recording...</>
                ) : (
                  <><Banknote className="w-4 h-4" /> Record Payment</>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
