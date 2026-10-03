"use client";

import { useEffect }             from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser }               from "@clerk/nextjs";
import { useInitializePaymentMutation } from "@/state/api";
import PaymentLoader             from "@/components/PaymentLoader";

// ─────────────────────────────────────────────────────────────────────────────
//  /tenants/payments/pay/page.tsx
//
//  Intermediate page that triggers Paystack payment initialization.
//  Receives leaseId and amount from query params.
//  Immediately initializes and redirects to Paystack.
//
//  Usage:
//  /tenants/payments/pay?leaseId=1&amount=600
// ─────────────────────────────────────────────────────────────────────────────

export default function PayPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();

  const leaseId = Number(searchParams.get("leaseId"));
  const amount  = Number(searchParams.get("amount"));

  const [initializePayment, { isLoading, isError, error }] =
    useInitializePaymentMutation();

  useEffect(() => {
    if (!isLoaded || !user) return;
    if (!leaseId || !amount) {
      router.push("/tenants/payments");
      return;
    }

    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) return;

    const run = async () => {
      try {
        const result = await initializePayment({
          leaseId,
          amount,
          email,
        }).unwrap();

        if (result?.data?.authorization_url) {
          window.location.href = result.data.authorization_url;
        }
      } catch (err) {
        console.error("Payment initialization failed:", err);
      }
    };

    run();
  }, [isLoaded, user]);

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">❌</p>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Payment Failed to Start
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {(error as any)?.data?.message ||
              "Something went wrong. Please try again."}
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

  return <PaymentLoader message="Connecting to Paystack..." />;
}