"use client";

import { useUser } from "@clerk/nextjs";
import { useGetApplicationsQuery, useUpdateApplicationStatusMutation } from "@/state/api";
import { FileText, MapPin, Calendar, User, Mail, Phone, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";

export default function ManagerApplicationsPage() {
  const { user, isLoaded } = useUser();
  const userId = user?.id;

  const { data: applications, isLoading, error } = useGetApplicationsQuery(
    { userId, userType: "manager" },
    { skip: !userId }
  );

  const [updateStatus, { isLoading: isUpdating }] = useUpdateApplicationStatusMutation();
  const [processingId, setProcessingId] = useState<number | null>(null);

  const handleUpdateStatus = async (applicationId: number, newStatus: string) => {
    setProcessingId(applicationId);
    try {
      await updateStatus({ id: applicationId, status: newStatus }).unwrap();
      toast.success(`Application ${newStatus}!`);
    } catch (error) {
      toast.error("Failed to update application");
    } finally {
      setProcessingId(null);
    }
  };

  if (!isLoaded || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading applications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FileText className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Error loading applications</p>
        </div>
      </div>
    );
  }

  const pendingApplications = applications?.filter((app: any) => app.status === "pending") || [];
  const approvedApplications = applications?.filter((app: any) => app.status === "approved") || [];
  const rejectedApplications = applications?.filter((app: any) => app.status === "rejected") || [];

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-3 py-1 rounded-full text-sm font-semibold inline-flex items-center gap-2";
    switch (status.toLowerCase()) {
      case "approved":
        return `${baseClasses} bg-green-100 text-green-700`;
      case "rejected":
        return `${baseClasses} bg-red-100 text-red-700`;
      default:
        return `${baseClasses} bg-yellow-100 text-yellow-700`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Applications</h1>
          <p className="text-gray-600">
            {applications?.length || 0} total application{applications?.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-700 font-medium mb-1">Pending Review</p>
                <p className="text-3xl font-bold text-yellow-900">{pendingApplications.length}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium mb-1">Approved</p>
                <p className="text-3xl font-bold text-green-900">{approvedApplications.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 font-medium mb-1">Rejected</p>
                <p className="text-3xl font-bold text-red-900">{rejectedApplications.length}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        {/* Empty State */}
        {!applications || applications.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow">
            <FileText className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">No applications yet</h2>
            <p className="text-gray-500">Applications will appear here when tenants apply to your properties.</p>
          </div>
        ) : (
          /* Applications List */
          <div className="space-y-6">
            {applications.map((application: any) => (
              <div
                key={application.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-all overflow-hidden"
              >
                <div className="md:flex">
                  {/* Property Image */}
                  <div className="md:w-64 h-48 md:h-auto relative overflow-hidden">
                    <img
                      src={application.property?.photoUrls?.[0] || "/placeholder-property.jpg"}
                      alt={application.property?.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 left-4 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      GH₵{application.property?.pricePerMonth}/mo
                    </div>
                  </div>

                  {/* Application Details */}
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {application.property?.name}
                        </h3>
                        <div className="flex items-center gap-2 text-gray-600 mb-2">
                          <MapPin className="w-4 h-4" />
                          <span className="text-sm">
                            {application.property?.location?.city}, {application.property?.location?.state}
                          </span>
                        </div>
                      </div>
                      <div className={getStatusBadge(application.status)}>
                        <span className="capitalize">{application.status}</span>
                      </div>
                    </div>

                    {/* Applicant Info */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Applicant Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 text-gray-700">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{application.tenant?.name || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{application.tenant?.email || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{application.tenant?.phoneNumber || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">
                            Applied: {format(new Date(application.createdAt), "MMM dd, yyyy")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Message */}
                    {application.message && (
                      <div className="bg-blue-50 rounded-lg p-4 mb-4">
                        <p className="text-sm text-gray-700 italic">"{application.message}"</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {application.status === "pending" && (
                      <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
                        <button
                          onClick={() => handleUpdateStatus(application.id, "approved")}
                          disabled={isUpdating && processingId === application.id}
                          className="flex-1 bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <CheckCircle className="w-5 h-5" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(application.id, "rejected")}
                          disabled={isUpdating && processingId === application.id}
                          className="flex-1 bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <XCircle className="w-5 h-5" />
                          Reject
                        </button>
                      </div>
                    )}

                    {application.status === "approved" && (
                      <div className="pt-4 border-t border-gray-100">
                        <p className="text-green-600 font-semibold flex items-center gap-2">
                          <CheckCircle className="w-5 h-5" />
                          Application approved - Lease created
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}