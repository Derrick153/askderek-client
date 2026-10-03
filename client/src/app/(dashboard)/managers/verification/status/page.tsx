"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Shield, CheckCircle, Clock, XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function VerificationStatusPage() {
  const { user } = useUser();
  const [status, setStatus] = useState<"loading" | "none" | "Pending" | "Approved" | "Rejected">("loading");
  const [verification, setVerification] = useState<any>(null);

  const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

  useEffect(() => {
    if (!user) return;
    fetchStatus();
  }, [user]);

  const fetchStatus = async () => {
    try {
      const token = await (window as any).Clerk?.session?.getToken();
      const res = await fetch(`${API}/managers/verification/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setVerification(data);
        setStatus(data.status);
      } else {
        setStatus("none");
      }
    } catch {
      setStatus("none");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/managers/verification" className="flex items-center gap-2 text-gray-500 hover:text-orange-600 text-sm font-semibold mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Verification
          </Link>
          <h1 className="text-3xl font-black text-gray-900">Verification Status</h1>
          <p className="text-gray-500 mt-1">Track your identity verification</p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          {status === "loading" && (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Loading status...</p>
            </div>
          )}

          {status === "none" && (
            <div className="text-center py-8">
              <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-black text-gray-900 mb-2">Not Verified Yet</h2>
              <p className="text-gray-500 mb-6">You have not submitted your verification documents yet.</p>
              <Link
                href="/managers/verification"
                className="bg-orange-600 text-white px-6 py-3 rounded-xl font-black hover:bg-orange-700 transition-colors"
              >
                Start Verification
              </Link>
            </div>
          )}

          {status === "Pending" && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-10 h-10 text-amber-600" />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-2">Under Review</h2>
              <p className="text-gray-500 mb-6">Your documents have been submitted and are being reviewed by our team. This usually takes 24 hours.</p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
                <p className="text-amber-700 text-sm font-semibold">📋 What happens next?</p>
                <ul className="text-amber-600 text-sm mt-2 space-y-1">
                  <li>• Admin reviews your Ghana Card</li>
                  <li>• You receive an email when approved</li>
                  <li>• Verified badge appears on your listings</li>
                </ul>
              </div>
              {verification?.submittedAt && (
                <p className="text-xs text-gray-400 mt-4">
                  Submitted: {new Date(verification.submittedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {status === "Approved" && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-2">✅ Verified Landlord!</h2>
              <p className="text-gray-500 mb-6">Your identity has been verified. A verified badge now appears on all your listings.</p>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-left">
                <p className="text-green-700 text-sm font-semibold">🎉 Benefits of being verified:</p>
                <ul className="text-green-600 text-sm mt-2 space-y-1">
                  <li>• Verified badge on all listings</li>
                  <li>• Higher trust from tenants</li>
                  <li>• Priority in search results</li>
                </ul>
              </div>
              {verification?.reviewedAt && (
                <p className="text-xs text-gray-400 mt-4">
                  Verified on: {new Date(verification.reviewedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {status === "Rejected" && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-2">Verification Rejected</h2>
              <p className="text-gray-500 mb-4">Your verification was not approved.</p>
              {verification?.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-left mb-6">
                  <p className="text-red-700 text-sm font-semibold">Reason:</p>
                  <p className="text-red-600 text-sm mt-1">{verification.rejectionReason}</p>
                </div>
              )}
              <Link
                href="/managers/verification"
                className="bg-orange-600 text-white px-6 py-3 rounded-xl font-black hover:bg-orange-700 transition-colors"
              >
                Resubmit Documents
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}