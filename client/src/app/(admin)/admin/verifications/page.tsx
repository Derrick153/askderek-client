"use client";

import { useGetPendingVerificationsQuery, useApproveVerificationMutation, useRejectVerificationMutation } from "@/state/api";
import { CheckCircle, XCircle, Phone } from "lucide-react";
import { useState } from "react";

const AdminVerifications = () => {
  const { data: verifications, isLoading } = useGetPendingVerificationsQuery();
  const [approveVerification] = useApproveVerificationMutation();
  const [rejectVerification] = useRejectVerificationMutation();
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Landlord Verifications</h1>
        <p className="text-gray-500 mt-1">{verifications?.length || 0} landlords waiting for Ghana Card verification</p>
      </div>

      {verifications?.length === 0 && (
        <div className="bg-white rounded-2xl p-10 text-center border border-gray-200">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No pending verifications!</p>
        </div>
      )}

      <div className="space-y-4">
        {verifications?.map((v: any) => (
          <div key={v.id} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                {/* ✅ FIXED: data is at v.manager.user not v.manager */}
                <h3 className="font-bold text-gray-900 text-lg">{v.manager?.user?.name || "Unknown"}</h3>
                <p className="text-gray-500 text-sm">{v.manager?.user?.email || "No email"}</p>
                <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                  <Phone className="w-4 h-4" />
                  <span>{v.phoneNumber || "No phone"}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Submitted: {new Date(v.submittedAt).toLocaleDateString()}</p>
                <div className="flex gap-3 mt-3">
                  <a href={v.ghanaCardFrontUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-100">
                    View Ghana Card Front
                  </a>
                  <a href={v.ghanaCardBackUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-100">
                    View Ghana Card Back
                  </a>
                </div>
              </div>

              <div className="flex flex-col gap-2 min-w-[200px]">
                {rejectingId === v.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Reason for rejection"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await rejectVerification({ id: v.id, reason: rejectReason });
                          setRejectingId(null);
                          setRejectReason("");
                        }}
                        className="flex-1 bg-red-600 text-white rounded-lg px-3 py-2 text-sm font-semibold"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setRejectingId(null)}
                        className="flex-1 bg-gray-200 text-gray-700 rounded-lg px-3 py-2 text-sm font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveVerification(v.id)}
                      className="flex-1 bg-green-600 text-white rounded-lg px-3 py-2 text-sm font-semibold hover:bg-green-700 flex items-center justify-center gap-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => setRejectingId(v.id)}
                      className="flex-1 bg-red-100 text-red-600 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-red-200 flex items-center justify-center gap-1"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminVerifications;