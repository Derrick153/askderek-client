"use client";

import { useState } from "react";
import { X, Gavel, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
//  MarkAsSoldModal.tsx
//
//  Confirmation modal for marking a property as sold.
//  Manager enters final sale price and optionally the buyer's Clerk ID.
//  Commission is calculated and shown in real time before confirmation.
//
//  Usage:
//    <MarkAsSoldModal
//      propertyId={45}
//      propertyName="3 Bedroom at East Legon"
//      askingPrice={250000}
//      isOpen={true}
//      onClose={() => setOpen(false)}
//      onConfirm={async (data) => { await markAsSold(data); }}
//    />
// ─────────────────────────────────────────────────────────────────────────────

interface ConfirmData {
  propertyId:     number;
  soldPrice:      number;
  soldToClerkId?: string;
}

interface MarkAsSoldModalProps {
  propertyId:    number;
  propertyName:  string;
  askingPrice?:  number;
  isOpen:        boolean;
  onClose:       () => void;
  onConfirm:     (data: ConfirmData) => Promise<void>;
}

const COMMISSION_RATE = 0.05; // 5%

const formatGHS = (amount: number) =>
  `GHS ${amount.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function MarkAsSoldModal({
  propertyId,
  propertyName,
  askingPrice,
  isOpen,
  onClose,
  onConfirm,
}: MarkAsSoldModalProps) {
  const [soldPrice,     setSoldPrice]     = useState(askingPrice?.toString() ?? "");
  const [soldToClerkId, setSoldToClerkId] = useState("");
  const [isLoading,     setIsLoading]     = useState(false);
  const [error,         setError]         = useState("");
  const [confirmed,     setConfirmed]     = useState(false);

  if (!isOpen) return null;

  const parsedPrice  = parseFloat(soldPrice.replace(/,/g, "")) || 0;
  const commission   = parsedPrice * COMMISSION_RATE;
  const landlordPays = parsedPrice * (1 - COMMISSION_RATE);
  const isValid      = parsedPrice > 0;

  const handleConfirm = async () => {
    if (!isValid) {
      setError("Please enter a valid sale price.");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      await onConfirm({
        propertyId,
        soldPrice:      parsedPrice,
        soldToClerkId:  soldToClerkId.trim() || undefined,
      });
      setConfirmed(true);
    } catch (err: any) {
      setError(err?.message ?? "Failed to mark as sold. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setSoldPrice(askingPrice?.toString() ?? "");
    setSoldToClerkId("");
    setError("");
    setConfirmed(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Success state */}
        {confirmed ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              Property Marked as Sold!
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {propertyName} has been successfully marked as sold.
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
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <Gavel className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Mark as Sold</h2>
                  <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">
                    {propertyName}
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

            {/* Body */}
            <div className="p-5 space-y-4">

              {/* Warning */}
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  This action will mark the property as sold and remove it from active listings.
                  This cannot be undone without admin help.
                </p>
              </div>

              {/* Sale price input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Final Sale Price (GHS) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
                    GHS
                  </span>
                  <input
                    type="number"
                    value={soldPrice}
                    onChange={(e) => { setSoldPrice(e.target.value); setError(""); }}
                    placeholder="0.00"
                    min="0"
                    step="1000"
                    disabled={isLoading}
                    className="w-full pl-12 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-gray-50"
                  />
                </div>
                {askingPrice && (
                  <p className="text-xs text-gray-400 mt-1">
                    Asking price: {formatGHS(askingPrice)}
                  </p>
                )}
              </div>

              {/* Commission breakdown */}
              {parsedPrice > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Commission Breakdown
                  </p>
                  {[
                    { label: "Sale Price",          value: formatGHS(parsedPrice),   cls: "text-gray-900"    },
                    { label: "AskDerek (5%)",        value: `- ${formatGHS(commission)}`, cls: "text-rose-600" },
                    { label: "You Receive (95%)",    value: formatGHS(landlordPays),  cls: "text-emerald-600 font-bold" },
                  ].map(({ label, value, cls }) => (
                    <div key={label} className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{label}</span>
                      <span className={cls}>{value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Buyer Clerk ID — optional */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Buyer ID{" "}
                  <span className="text-xs font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={soldToClerkId}
                  onChange={(e) => setSoldToClerkId(e.target.value)}
                  placeholder="Buyer's AskDerek user ID"
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-gray-50"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Link this sale to a buyer on the platform if known.
                </p>
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
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                ) : (
                  <><Gavel className="w-4 h-4" /> Confirm Sale</>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}