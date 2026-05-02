"use client";

import { useState } from "react";
import { Loader2, Gavel, CheckCircle, AlertTriangle, X } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
//  SaleCompletionForm.tsx
//
//  Form for completing a property sale from an agreed enquiry.
//  Used on the admin/sales page and managers/enquiries page.
//
//  Collects:
//    — Final agreed price (pre-filled from enquiry.agreedPrice)
//    — Buyer Clerk ID (optional)
//    — Notes (optional)
//
//  Shows live commission breakdown before submission.
// ─────────────────────────────────────────────────────────────────────────────

interface SaleCompletionFormProps {
  propertyId:    number;
  propertyName:  string;
  enquiryId?:    number;
  agreedPrice?:  number;          // pre-filled from enquiry
  onSubmit:      (data: SaleCompletionData) => Promise<void>;
  onCancel?:     () => void;
  className?:    string;
}

export interface SaleCompletionData {
  propertyId:     number;
  soldPrice:      number;
  soldToClerkId?: string;
  notes?:         string;
}

const COMMISSION = 0.05;

const formatGHS = (n: number) =>
  `GHS ${n.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function SaleCompletionForm({
  propertyId,
  propertyName,
  agreedPrice,
  onSubmit,
  onCancel,
  className = "",
}: SaleCompletionFormProps) {
  const [soldPrice,     setSoldPrice]     = useState(agreedPrice?.toString() ?? "");
  const [soldToClerkId, setSoldToClerkId] = useState("");
  const [notes,         setNotes]         = useState("");
  const [isLoading,     setIsLoading]     = useState(false);
  const [isSuccess,     setIsSuccess]     = useState(false);
  const [error,         setError]         = useState("");

  const parsedPrice  = parseFloat(soldPrice.replace(/,/g, "")) || 0;
  const commission   = parsedPrice * COMMISSION;
  const landlordGets = parsedPrice * (1 - COMMISSION);
  const isValid      = parsedPrice > 0;

  const handleSubmit = async () => {
    if (!isValid) { setError("Enter a valid sale price."); return; }
    setError("");
    setIsLoading(true);
    try {
      await onSubmit({
        propertyId,
        soldPrice:      parsedPrice,
        soldToClerkId:  soldToClerkId.trim() || undefined,
        notes:          notes.trim() || undefined,
      });
      setIsSuccess(true);
    } catch (err: any) {
      setError(err?.message ?? "Failed to complete sale. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className={`bg-white rounded-2xl border border-gray-200 p-8 text-center ${className}`}>
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Sale Completed!</h3>
        <p className="text-sm text-gray-500 mb-2">
          {propertyName} has been successfully marked as sold.
        </p>
        <div className="bg-emerald-50 rounded-xl px-4 py-3 mb-6 inline-block">
          <p className="text-sm font-bold text-emerald-700">
            {formatGHS(parsedPrice)} sale recorded
          </p>
          <p className="text-xs text-emerald-600 mt-0.5">
            Commission: {formatGHS(commission)}
          </p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="block mx-auto text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
            <Gavel className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Complete Sale</h3>
            <p className="text-xs text-gray-400 truncate max-w-[200px]">{propertyName}</p>
          </div>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-5 space-y-5">

        {/* Warning */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Completing this sale will mark the property as sold and remove it from
            active listings. A 5% commission will be recorded for AskDerek.
          </p>
        </div>

        {/* Sale price */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Final Sale Price (GHS) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
              GHS
            </span>
            <input
              type="number"
              value={soldPrice}
              onChange={(e) => { setSoldPrice(e.target.value); setError(""); }}
              placeholder="0"
              min="0"
              step="1000"
              disabled={isLoading}
              className="w-full pl-12 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-gray-50"
            />
          </div>
          {agreedPrice && parsedPrice !== agreedPrice && (
            <p className="text-xs text-gray-400 mt-1">
              Agreed price from enquiry: {formatGHS(agreedPrice)}
            </p>
          )}
        </div>

        {/* Live commission breakdown */}
        {parsedPrice > 0 && (
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
              Breakdown
            </p>
            <div className="space-y-2.5">
              {[
                { label: "Sale Price",       value: formatGHS(parsedPrice),   cls: "text-gray-900 font-bold" },
                { label: "AskDerek (5%)",    value: formatGHS(commission),    cls: "text-rose-600" },
                { label: "Seller Receives",  value: formatGHS(landlordGets),  cls: "text-emerald-600 font-bold text-base" },
              ].map(({ label, value, cls }) => (
                <div key={label} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className={`text-sm ${cls}`}>{value}</span>
                </div>
              ))}
            </div>

            {/* Visual split bar */}
            <div className="mt-3">
              <div className="h-2 bg-rose-200 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: "95%" }} />
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-400">
                <span>You get 95%</span>
                <span>AskDerek 5%</span>
              </div>
            </div>
          </div>
        )}

        {/* Buyer ID */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Buyer ID{" "}
            <span className="text-xs font-normal text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={soldToClerkId}
            onChange={(e) => setSoldToClerkId(e.target.value)}
            placeholder="AskDerek user ID of the buyer"
            disabled={isLoading}
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-gray-50"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Notes{" "}
            <span className="text-xs font-normal text-gray-400">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes about this sale..."
            rows={3}
            disabled={isLoading}
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-gray-50 resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!isValid || isLoading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
              : <><Gavel className="w-4 h-4" /> Complete Sale</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}