"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams }    from "next/navigation";
import { useVerifyPaymentQuery }          from "@/state/api";
import PaymentLoader                     from "@/components/PaymentLoader";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
//  /payment/callback/page.tsx
//
//  Paystack redirects here after every payment attempt.
//  This page verifies the payment reference and redirects:
//    Success → /payment/receipt/[reference]
//    Failure → shows error with retry options
//
//  Wrapped in Suspense — required by Next.js 15 for useSearchParams.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Safely extract payment status from any backend response shape.
 * Backend may return { payment: { paymentStatus } } or { status } or { paymentStatus }
 */
function extractPaymentStatus(data: unknown): string | null {
  if (!data) return null;
  const d = data as Record<string, unknown>;

  // Shape 1: { payment: { paymentStatus: "Paid" } }
  if (d.payment && typeof d.payment === "object") {
    const p = d.payment as Record<string, unknown>;
    if (typeof p.paymentStatus === "string") return p.paymentStatus;
    if (typeof p.status === "string")        return p.status;
  }

  // Shape 2: { paymentStatus: "Paid" }
  if (typeof d.paymentStatus === "string") return d.paymentStatus;

  // Shape 3: { status: "success" } — Paystack direct
  if (typeof d.status === "string") return d.status;

  // Shape 4: { data: { status: "success" } }
  if (d.data && typeof d.data === "object") {
    const inner = d.data as Record<string, unknown>;
    if (typeof inner.status === "string") return inner.status;
  }

  return null;
}

/**
 * Normalise any status string to Paid | Failed | Pending
 */
function normaliseStatus(raw: string | null): "Paid" | "Failed" | "Pending" | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower === "paid"    || lower === "success") return "Paid";
  if (lower === "failed"  || lower === "failure") return "Failed";
  if (lower === "pending" || lower === "abandoned") return "Pending";
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// STATES
// ─────────────────────────────────────────────────────────────────────────────

const InvalidReference = ({ onBack }: { onBack: () => void }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-sm w-full shadow-sm">
      <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-8 h-8 text-amber-500" />
      </div>
      <h2 className="text-lg font-bold text-gray-900 mb-2">
        Invalid Payment Link
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        No payment reference was found in this URL.
        This link may be expired or invalid.
      </p>
      <button
        onClick={onBack}
        className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-xl hover:bg-orange-700 transition-colors mx-auto"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Payments
      </button>
    </div>
  </div>
);

const VerifyingState = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-sm w-full shadow-sm">
      <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
      <h2 className="text-lg font-bold text-gray-900 mb-2">
        Verifying Payment
      </h2>
      <p className="text-sm text-gray-500">
        Please wait while we confirm your payment with Paystack.
        Do not close this page.
      </p>
      <div className="mt-4 flex items-center justify-center gap-1">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  </div>
);

const SuccessState = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-sm w-full shadow-sm">
      <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-8 h-8 text-emerald-500" />
      </div>
      <h2 className="text-lg font-bold text-gray-900 mb-2">
        Payment Confirmed!
      </h2>
      <p className="text-sm text-gray-500">
        Your payment was successful. Redirecting to your receipt...
      </p>
      <div className="mt-4 flex items-center justify-center gap-1">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  </div>
);

const FailedState = ({
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
        Payment Failed
      </h2>
      <p className="text-sm text-gray-500 mb-2">
        Your payment could not be completed.
        No money has been deducted from your account.
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

const PendingState = ({
  reference,
  onBack,
}: {
  reference: string;
  onBack:    () => void;
}) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-sm w-full shadow-sm">
      <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-8 h-8 text-amber-500" />
      </div>
      <h2 className="text-lg font-bold text-gray-900 mb-2">
        Payment Pending
      </h2>
      <p className="text-sm text-gray-500 mb-2">
        Your payment is being processed.
        This may take a few minutes.
        Check your payment history for updates.
      </p>
      {reference && (
        <p className="text-xs text-gray-400 font-mono bg-gray-50 rounded-lg px-3 py-2 mb-6">
          Ref: {reference}
        </p>
      )}
      <button
        onClick={onBack}
        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors mx-auto"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Payments
      </button>
    </div>
  </div>
);

const ErrorState = ({
  onRetry,
  onBack,
}: {
  onRetry: () => void;
  onBack:  () => void;
}) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-sm w-full shadow-sm">
      <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <XCircle className="w-8 h-8 text-rose-500" />
      </div>
      <h2 className="text-lg font-bold text-gray-900 mb-2">
        Verification Failed
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        We could not verify your payment status.
        Please check your payment history or contact support.
      </p>
      <div className="flex flex-col gap-2">
        <button
          onClick={onRetry}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-600 text-white text-sm font-semibold rounded-xl hover:bg-orange-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Verification
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
// CALLBACK CONTENT
// ─────────────────────────────────────────────────────────────────────────────

function CallbackContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const reference    = searchParams.get("reference") ?? "";

  const [hasRedirected, setHasRedirected] = useState(false);
  const [retryCount,    setRetryCount]    = useState(0);

  const {
    data:      verifyData,
    isLoading,
    isError,
    refetch,
  } = useVerifyPaymentQuery(reference, {
    skip: !reference,
  });

  // Extract and normalise payment status safely
  const rawStatus      = extractPaymentStatus(verifyData);
  const paymentStatus  = normaliseStatus(rawStatus);

  useEffect(() => {
    if (!verifyData || hasRedirected) return;
    if (paymentStatus === "Paid") {
      setHasRedirected(true);
      router.push(`/payment/receipt/${reference}`);
    }
  }, [verifyData, hasRedirected, paymentStatus, reference, router]);

  const handleBack  = () => router.push("/tenants/payments");
  const handleRetry = () => {
    setRetryCount((c) => c + 1);
    refetch();
  };

  // No reference in URL
  if (!reference) {
    return <InvalidReference onBack={handleBack} />;
  }

  // Loading — verifying with backend
  if (isLoading) {
    return <VerifyingState />;
  }

  // Network or server error
  if (isError) {
    return <ErrorState onRetry={handleRetry} onBack={handleBack} />;
  }

  // Payment confirmed — show success briefly before redirect
  if (paymentStatus === "Paid") {
    return <SuccessState />;
  }

  // Payment failed
  if (paymentStatus === "Failed") {
    return (
      <FailedState
        reference={reference}
        onRetry={handleBack}
        onBack={handleBack}
      />
    );
  }

  // Payment still pending
  if (paymentStatus === "Pending") {
    return <PendingState reference={reference} onBack={handleBack} />;
  }

  // Unknown status — show verifying state while we wait
  return <VerifyingState />;
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE EXPORT — wrapped in Suspense for Next.js 15 useSearchParams
// ─────────────────────────────────────────────────────────────────────────────

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<PaymentLoader message="Loading payment status..." />}>
      <CallbackContent />
    </Suspense>
  );
}