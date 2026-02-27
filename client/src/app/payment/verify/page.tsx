"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, ArrowRight, Home } from "lucide-react";
import Link from "next/link";

function PaymentVerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get("reference") || searchParams.get("trxref");

  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState<number | null>(null);

  useEffect(() => {
    if (!reference) {
      setStatus("failed");
      setMessage("No payment reference found.");
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/payments/verify/${reference}`
        );
        const data = await res.json();

        if (res.ok && (data.status === "success" || data.data?.status === "success")) {
          setStatus("success");
          setAmount(data.data?.amount ? data.data.amount / 100 : null);
          setMessage("Your rent payment was received successfully.");

          // Auto redirect to residences after 4 seconds
          setTimeout(() => router.push("/tenants/residences"), 4000);
        } else {
          setStatus("failed");
          setMessage(data.message || "Payment could not be verified. Contact support.");
        }
      } catch (err) {
        setStatus("failed");
        setMessage("Network error. Please check your connection.");
      }
    };

    verify();
  }, [reference, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 w-full max-w-sm overflow-hidden">

        {/* Status Header */}
        <div className={`px-6 py-8 text-center ${
          status === "loading" ? "bg-gray-50" :
          status === "success" ? "bg-emerald-500" : "bg-red-500"
        }`}>
          {status === "loading" && (
            <Loader2 className="w-16 h-16 text-gray-400 animate-spin mx-auto" />
          )}
          {status === "success" && (
            <CheckCircle2 className="w-16 h-16 text-white mx-auto" />
          )}
          {status === "failed" && (
            <XCircle className="w-16 h-16 text-white mx-auto" />
          )}

          <h1 className={`text-2xl font-black mt-4 ${
            status === "loading" ? "text-gray-700" : "text-white"
          }`}>
            {status === "loading" && "Verifying Payment..."}
            {status === "success" && "Payment Successful!"}
            {status === "failed" && "Payment Failed"}
          </h1>

          {amount && status === "success" && (
            <p className="text-white/90 text-3xl font-black mt-1">
              GH₵{amount.toLocaleString()}
            </p>
          )}
        </div>

        {/* Details */}
        <div className="px-6 py-6 space-y-4">
          <p className="text-gray-600 text-sm text-center">{message}</p>

          {reference && (
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <p className="text-xs text-gray-400 mb-0.5">Reference</p>
              <p className="text-xs font-mono text-gray-700 break-all">{reference}</p>
            </div>
          )}

          {status === "success" && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
              <p className="text-emerald-700 text-xs font-bold">
                Redirecting to your residence in 4 seconds...
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <Link
              href="/tenants/residences"
              className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all"
            >
              <Home className="w-4 h-4" />
              Go to My Residence
              <ArrowRight className="w-4 h-4" />
            </Link>

            {status === "failed" && (
              <button
                onClick={() => router.back()}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold text-sm transition-all"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentVerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-gray-400" /></div>}>
      <PaymentVerifyContent />
    </Suspense>
  );
}