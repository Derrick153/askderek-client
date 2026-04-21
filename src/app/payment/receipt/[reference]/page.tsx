"use client";

import { useParams, useRouter } from "next/navigation";
import { useGetPaymentReceiptQuery } from "@/state/api";
import ReceiptCard               from "@/components/ReceiptCard";
import PaymentLoader             from "@/components/PaymentLoader";

// ─────────────────────────────────────────────────────────────────────────────
//  /payment/receipt/[reference]/page.tsx
//
//  Shows full payment receipt after successful payment.
//  Fetches receipt data from backend using the Paystack reference.
//  Has WhatsApp share and print options.
// ─────────────────────────────────────────────────────────────────────────────

export default function ReceiptPage() {
  const params    = useParams();
  const router    = useRouter();
  const reference = params.reference as string;

  const {
    data:      receipt,
    isLoading,
    isError,
    error,
  } = useGetPaymentReceiptQuery(reference, {
    skip: !reference,
  });

  // ── Loading ──
  if (isLoading) {
    return <PaymentLoader message="Loading your receipt..." />;
  }

  // ── Error ──
  if (isError || !receipt) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">❌</p>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Receipt Not Found
          </h2>
          <p className="text-sm text-gray-500 mb-2">
            {(error as any)?.data?.message ||
              "We could not find this receipt. Please contact support."}
          </p>
          <p className="text-xs text-gray-400 mb-6">
            Reference: {reference}
          </p>
          <button
            onClick={() => router.push("/tenants/payments")}
            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Back to Payments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">

      {/* ── Header ── */}
      <div className="text-center mb-8">
        <p className="text-3xl mb-2">✅</p>
        <h1 className="text-2xl font-bold text-gray-900">
          Payment Successful
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Your rent payment has been confirmed
        </p>
      </div>

      {/* ── Receipt Card ── */}
      <ReceiptCard receipt={receipt} />

      {/* ── Back Button ── */}
      <div className="text-center mt-6">
        <button
          onClick={() => router.push("/tenants/payments")}
          className="text-sm text-gray-500 hover:text-gray-700 font-medium underline underline-offset-2 transition-colors"
        >
          Back to Payment Dashboard
        </button>
      </div>

    </div>
  );
}