"use client";

import { useGetAdminPendingPropertiesQuery, useApprovePropertyMutation, useRejectPropertyMutation } from "@/state/api";
import { CheckCircle, XCircle, MapPin, DollarSign } from "lucide-react";
import { useState } from "react";

const AdminProperties = () => {
  const { data: properties, isLoading } = useGetAdminPendingPropertiesQuery();
  const [approveProperty] = useApprovePropertyMutation();
  const [rejectProperty] = useRejectPropertyMutation();
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
        <h1 className="text-2xl font-bold text-gray-900">Pending Properties</h1>
        <p className="text-gray-500 mt-1">{properties?.length || 0} properties waiting for approval</p>
      </div>

      {properties?.length === 0 && (
        <div className="bg-white rounded-2xl p-10 text-center border border-gray-200">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">All caught up! No pending properties.</p>
        </div>
      )}

      <div className="space-y-4">
        {properties?.map((property: any) => (
          <div key={property.id} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-lg">{property.name}</h3>
                <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                  <MapPin className="w-4 h-4" />
                  <span>{property.location?.address}, {property.location?.city}</span>
                </div>
                <div className="flex items-center gap-1 text-orange-600 font-semibold mt-1">
                  <DollarSign className="w-4 h-4" />
                  <span>GH₵ {property.pricePerMonth?.toLocaleString()} / month</span>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Landlord: {property.manager?.name} · {property.manager?.email}
                </div>
              </div>

              <div className="flex flex-col gap-2 min-w-[200px]">
                {rejectingId === property.id ? (
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
                          await rejectProperty({ id: property.id, reason: rejectReason });
                          setRejectingId(null);
                          setRejectReason("");
                        }}
                        className="flex-1 bg-red-600 text-white rounded-lg px-3 py-2 text-sm font-semibold hover:bg-red-700"
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
                      onClick={() => approveProperty(property.id)}
                      className="flex-1 bg-green-600 text-white rounded-lg px-3 py-2 text-sm font-semibold hover:bg-green-700 flex items-center justify-center gap-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => setRejectingId(property.id)}
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

export default AdminProperties;