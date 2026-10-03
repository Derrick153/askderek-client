"use client";

import { useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
//  PaymentRetryButton.tsx
//  Shown when a payment failed or expired.
//  Lets tenant retry the payment immediately.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  leaseId:   number;
  amount:    number;
  email:     string;
  onRetry:   (leaseId: number, amount: number, email: string) => Promise<void>;
}

export default function PaymentRetryButton({
  leaseId,
  amount,
  email,
  onRetry,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);

  const handleRetry = async () => {
    setIsLoading(true);
    try {
      await onRetry(leaseId, amount, email);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleRetry}
      disabled={isLoading}
      className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-semibold rounded-lg transition-colors"
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12" cy="12" r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          Processing...
        </>
      ) : (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582M20 20v-5h-.581M5.635 19A9 9 0 104.582 9H4"
            />
          </svg>
          Retry Payment
        </>
      )}
    </button>
  );
}