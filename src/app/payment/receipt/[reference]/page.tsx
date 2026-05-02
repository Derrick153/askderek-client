"use client";

import { useParams, useRouter } from "next/navigation";
import { useGetPaymentReceiptQuery } from "@/state/api";
import ReceiptCard   from "@/components/ReceiptCard";
import PaymentLoader from "@/components/PaymentLoader";
import {
  ArrowLeft,
  Download,
  Share2,
  CheckCircle,
  XCircle,
  RefreshCw,
  MessageCircle,
  Printer,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
//  /payment/receipt/[reference]/page.tsx
//
//  Shows a full payment receipt after a successful payment.
//  Fetches receipt data using the Paystack reference.
//  Supports:
//    — WhatsApp share
//    — Print
//    — Download (via print dialog)
//    — Back navigation
//
//  The receipt data shape is safe-extracted from any backend response.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Local receipt shape — avoids fighting the strict PaymentReceipt type
 * in api.txt vs the actual backend response.
 * All fields are optional — components handle missing data gracefully.
 */
export interface ReceiptData {
  reference?:      string;
  receiptNumber?:  string;
  paymentDate?:    string | null;
  amountPaid?:     number;
  paymentStatus?:  string;
  paymentMethod?:  string;
  property?: {
    name?:    string;
    address?: string;
    city?:    string;
    region?:  string;
  };
  tenant?: {
    name?:  string;
    email?: string;
  };
  landlord?: {
    name?:  string;
    email?: string;
  };
  payment?: {
    amountPaid?:    number;
    paymentDate?:   string | null;
    paymentStatus?: string;
    paymentMethod?: string;
  };
  shareLinks?: {
    whatsapp?: string;
    [key: string]: string | undefined;
  };
  generatedAt?: string;
  [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// SAFE EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract receipt data from any backend response shape.
 * Handles:
 *   { receipt: {...} }
 *   { data: {...} }
 *   flat object
 */
function extractReceipt(raw: unknown): ReceiptData | null {
  if (!raw) return null;
  const r = raw as Record<string, unknown>;

  if (r.receipt && typeof r.receipt === "object")
    return r.receipt as ReceiptData;

  if (r.data && typeof r.data === "object")
    return r.data as ReceiptData;

  // Flat response
  if (r.reference || r.receiptNumber || r.amountPaid)
    return r as ReceiptData;

  return null;
}

/**
 * Get the best available amount from receipt.
 */
function getAmount(receipt: ReceiptData): number {
  return (
    receipt.amountPaid ??
    receipt.payment?.amountPaid ??
    0
  );
}

/**
 * Get the best available payment date.
 */
function getPaymentDate(receipt: ReceiptData): string | null {
  return (
    receipt.paymentDate ??
    receipt.payment?.paymentDate ??
    receipt.generatedAt ??
    null
  );
}

const formatGHS = (amount: number) =>
  `GHS ${amount.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GH", {
    day:    "numeric",
    month:  "long",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────────────────────────────────────

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

const ReceiptSkeleton = () => (
  <div className="min-h-screen bg-gray-50 py-8 px-4">
    <div className="max-w-lg mx-auto space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-96" />
      <div className="flex gap-3">
        <Skeleton className="h-11 flex-1" />
        <Skeleton className="h-11 flex-1" />
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ERROR STATE
// ─────────────────────────────────────────────────────────────────────────────

const ErrorState = ({
  reference,
  onRetry,
  onBack,
}: {
  reference: string;
  onRetry:   () => void;
  onBack:    () => void;
}) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-sm w-full shadow-sm">
      <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <XCircle className="w-8 h-8 text-rose-500" />
      </div>
      <h2 className="text-lg font-bold text-gray-900 mb-2">
        Receipt Not Found
      </h2>
      <p className="text-sm text-gray-500 mb-2">
        We could not load the receipt for this payment.
        It may still be processing.
      </p>
      {reference && (
        <p className="text-xs text-gray-400 font-mono bg-gray-50 rounded-lg px-3 py-2 mb-6">
          Ref: {reference}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <button
          onClick={onRetry}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-xl hover:bg-orange-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
        <button
          onClick={onBack}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Payments
        </button>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// RECEIPT DISPLAY
// ─────────────────────────────────────────────────────────────────────────────

const ReceiptDisplay = ({
  receipt,
  reference,
  onBack,
}: {
  receipt:   ReceiptData;
  reference: string;
  onBack:    () => void;
}) => {
  const amount      = getAmount(receipt);
  const paymentDate = getPaymentDate(receipt);
  const propertyName = receipt.property?.name ?? "Property";
  const tenantName   = receipt.tenant?.name ?? "Tenant";

  const handleWhatsApp = () => {
    // Use shareLinks from backend if available, otherwise build our own
    const url =
      receipt.shareLinks?.whatsapp ??
      `https://wa.me/?text=${encodeURIComponent(
        `AskDerek Payment Receipt\n` +
        `Reference: ${reference}\n` +
        `Property: ${propertyName}\n` +
        `Amount: ${formatGHS(amount)}\n` +
        `Date: ${formatDate(paymentDate)}\n` +
        `Verify at: ${window.location.origin}/verify/${reference}`
      )}`;
    window.open(url, "_blank");
  };

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            My Payments
          </button>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
            <CheckCircle className="w-3.5 h-3.5" />
            Payment Confirmed
          </div>
        </div>

        {/* ── Receipt Card from existing component ── */}
        <ReceiptCard receipt={receipt as any} />

        {/* ── Manual receipt if ReceiptCard cannot render ── */}
        {!receipt.reference && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 print:shadow-none">
            {/* AskDerek Header */}
            <div className="text-center border-b border-gray-100 pb-5 mb-5">
              <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-black text-lg">A</span>
              </div>
              <h2 className="text-lg font-black text-gray-900">AskDerek</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Ghana&apos;s #1 Real Estate Platform
              </p>
            </div>

            {/* Status */}
            <div className="flex items-center justify-center gap-2 mb-5">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <span className="text-base font-bold text-emerald-600">
                Payment Successful
              </span>
            </div>

            {/* Amount */}
            <div className="text-center mb-6">
              <p className="text-3xl font-black text-gray-900">
                {formatGHS(amount)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {formatDate(paymentDate)}
              </p>
            </div>

            {/* Details */}
            <div className="space-y-3 text-sm">
              {[
                { label: "Reference",   value: reference },
                { label: "Property",    value: propertyName },
                { label: "Tenant",      value: tenantName },
                { label: "Method",      value: receipt.paymentMethod ?? receipt.payment?.paymentMethod ?? "Paystack" },
                { label: "Status",      value: "Paid" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-semibold text-gray-900 text-right max-w-[200px] truncate">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Verify QR placeholder */}
            <div className="mt-5 pt-5 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400">
                Verify this receipt at:
              </p>
              <p className="text-xs font-mono text-gray-600 mt-0.5 break-all">
                askderek.com/verify/{reference}
              </p>
              <p className="text-xs text-gray-300 mt-3">
                AskDerek — Building Ghana&apos;s Property Future 🇬🇭
              </p>
            </div>
          </div>
        )}

        {/* ── Action Buttons ── */}
        <div className="grid grid-cols-2 gap-3 print:hidden">
          <button
            onClick={handleWhatsApp}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print / Save
          </button>
        </div>

        {/* ── Verify Link ── */}
        <div className="text-center print:hidden">
          <p className="text-xs text-gray-400">
            Anyone can verify this receipt at{" "}
            <span className="font-medium text-gray-600">
              askderek.com/verify/{reference}
            </span>
          </p>
        </div>

      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function ReceiptPage() {
  const params    = useParams();
  const router    = useRouter();
  const reference = params.reference as string;

  const {
    data:      rawData,
    isLoading,
    isError,
    refetch,
  } = useGetPaymentReceiptQuery(reference, {
    skip: !reference,
  });

  const handleBack  = () => router.push("/tenants/payments");
  const handleRetry = () => refetch();

  if (isLoading) return <ReceiptSkeleton />;

  // Safe extraction — no more type mismatch errors
  const receipt = extractReceipt(rawData);

  if (isError || !receipt) {
    return (
      <ErrorState
        reference={reference}
        onRetry={handleRetry}
        onBack={handleBack}
      />
    );
  }

  return (
    <ReceiptDisplay
      receipt={receipt}
      reference={reference}
      onBack={handleBack}
    />
  );
}