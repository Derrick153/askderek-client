"use client";

import { useState, useMemo }          from "react";
import { useParams, useRouter }        from "next/navigation";
import {
  useGetPropertiesQuery,
  useGetPropertyQuery,
  useGetAllSchoolsQuery,
  useCreateSemesterBookingMutation,
  useVerifyReceiptQuery,
} from "@/state/api";
import { useUser }              from "@clerk/nextjs";
import HostelRoomCard           from "@/components/HostelRoomCard";
import SchoolSemesterCard       from "@/components/SchoolSemesterCard";
import ListingTypeBadge         from "@/components/ListingTypeBadge";
import Image                    from "next/image";
import {
  Search, MapPin, Home, GraduationCap,
  ArrowLeft, CheckCircle, Loader2,
  ShieldCheck, XCircle, AlertCircle,
  Calendar, RefreshCw,
} from "lucide-react";
import type { HostelRoom } from "@/components/HostelRoomCard";
import type { School }     from "@/state/api";

// ─────────────────────────────────────────────────────────────────────────────
//  HOSTEL LISTING PAGE  —  /hostel
// ─────────────────────────────────────────────────────────────────────────────

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-2xl ${className}`} />
);

const formatGHS = (n?: number) =>
  n != null ? `GHS ${n.toLocaleString("en-GH", { minimumFractionDigits: 0 })}` : "—";

export default function VerifyReceiptPage() {
  const params    = useParams();
  const reference = params.reference as string;

  const { data, isLoading, isError, refetch } = useVerifyReceiptQuery(reference, {
    skip: !reference,
  });

  const receipt = (data as any)?.receipt ?? data;

  const formatDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString("en-GH", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  if (!reference) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-sm w-full">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900">Invalid Reference</h2>
          <p className="text-sm text-gray-500 mt-2">No payment reference provided.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-sm w-full">
          <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-700">Verifying receipt...</p>
        </div>
      </div>
    );
  }

  if (isError || !receipt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-sm w-full">
          <XCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Receipt Not Found</h2>
          <p className="text-sm text-gray-500 mb-4 font-mono">{reference}</p>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 mx-auto px-5 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-xl hover:bg-orange-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const isPaid = receipt.status === "Paid" || receipt.status === "success";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className={`p-6 text-center ${isPaid ? "bg-emerald-50" : "bg-amber-50"}`}>
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 ${isPaid ? "bg-emerald-100" : "bg-amber-100"}`}>
            {isPaid
              ? <ShieldCheck className="w-8 h-8 text-emerald-600" />
              : <AlertCircle className="w-8 h-8 text-amber-600" />
            }
          </div>
          <h2 className={`text-lg font-bold ${isPaid ? "text-emerald-800" : "text-amber-800"}`}>
            {isPaid ? "Payment Verified ✅" : "Payment Pending ⏳"}
          </h2>
          <p className={`text-xs mt-1 ${isPaid ? "text-emerald-600" : "text-amber-600"}`}>
            AskDerek Receipt Verification
          </p>
        </div>

        {/* Details */}
        <div className="p-6 space-y-4">
          {[
            { label: "Reference",    value: receipt.reference ?? reference },
            { label: "Status",       value: receipt.status ?? "—"          },
            { label: "Amount Paid",  value: receipt.amountPaid != null ? `GHS ${receipt.amountPaid.toLocaleString("en-GH")}` : "—" },
            { label: "Payment Date", value: formatDate(receipt.paymentDate) },
            { label: "Verified At",  value: formatDate(receipt.verifiedAt)  },
            { label: "Verified By",  value: receipt.verifiedBy ?? "AskDerek" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between border-b border-gray-50 pb-3 last:border-0 last:pb-0">
              <span className="text-xs text-gray-400 font-medium">{label}</span>
              <span className="text-xs font-bold text-gray-900 text-right max-w-[180px] break-all">{value}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 text-center">
          <p className="text-xs text-gray-400">
            Verify more receipts at{" "}
            <span className="font-medium text-gray-600">askderek.com/verify</span>
          </p>
          <p className="text-xs text-gray-300 mt-1">
            AskDerek — Ghana&apos;s #1 Real Estate Platform 🇬🇭
          </p>
        </div>
      </div>
    </div>
  );
}

;