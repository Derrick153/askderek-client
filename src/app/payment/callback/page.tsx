"use client";

import { Suspense }                    from "react";
import { useEffect, useState }         from "react";
import { useRouter, useSearchParams }  from "next/navigation";
import { useVerifyPaymentQuery }        from "@/state/api";
import PaymentLoader                   from "@/components/PaymentLoader";

// ─────────────────────────────────────────────────────────────────────────────
//  /payment/callback/page.tsx
//  Paystack redirects here after payment attempt.
//  Wrapped in Suspense — required by Next.js 15 for useSearchParams.
// ─────────────────────────────────────────────────────────────────────────────

function CallbackContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const reference    = searchParams.get("reference") ?? "";

  const [hasRedirected, setHasRedirected] = useState(false);

  const {
    data:      verifyData,
    isLoading,
    isError,
    error,
  } = useVerifyPaymentQuery(reference, {
    skip: !reference,
  });

  useEffect(() => {
    if (!verifyData || hasRedirected) return;
    const status = verifyData?.payment?.paymentStatus;
    if (status === "Paid") {
      setHasRedirected(true);
      router.push(`/payment/receipt/${reference}`);
    }
  }, [verifyData, hasRedirected, reference, router]);

  if (!reference) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">⚠️</p>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Invalid Payment Link
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            No payment reference found in the URL.
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

  if (isLoading) {
    return <PaymentLoader message="Verifying your payment..." />;
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">❌</p>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Payment Verification Failed
          </h2>
          <p className="text-sm text-gray-500 mb-2">
            {(error as any)?.data?.message ||
              "We could not verify your payment. Please contact support."}
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

  const status = verifyData?.payment?.paymentStatus;
  if (status && status !== "Paid") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">❌</p>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Payment {status}
          </h2>
          <p className="text-sm text-gray-500 mb-2">
            Your payment was not completed successfully.
          </p>
          <p className="text-xs text-gray-400 mb-6">
            Reference: {reference}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.back()}
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push("/tenants/payments")}
              className="px-6 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
            >
              Back to Payments
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <PaymentLoader message="Payment confirmed! Loading receipt..." />;
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<PaymentLoader message="Loading payment status..." />}>
      <CallbackContent />
    </Suspense>
  );
}