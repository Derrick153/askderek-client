"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  PaymentLoader.tsx
//  Full screen loading state shown while payment is processing.
//  Shown between clicking Pay and Paystack redirecting.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  message?: string;
}

export default function PaymentLoader({
  message = "Processing your payment...",
}: Props) {
  return (
    <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="text-center">

        {/* ── Spinner ── */}
        <div className="relative w-16 h-16 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-orange-100" />
          <div className="absolute inset-0 rounded-full border-4 border-orange-500 border-t-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl">💳</span>
          </div>
        </div>

        {/* ── Message ── */}
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          {message}
        </h3>
        <p className="text-sm text-gray-500 max-w-xs mx-auto">
          Please do not close this page. You will be redirected to Paystack to complete your payment securely.
        </p>

        {/* ── Paystack badge ── */}
        <div className="mt-6 inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-gray-500 font-medium">
            Secured by Paystack
          </span>
        </div>

      </div>
    </div>
  );
}