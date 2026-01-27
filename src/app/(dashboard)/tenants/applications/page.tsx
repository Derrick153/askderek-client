"use client";

import { useUser } from "@clerk/nextjs";
import { useGetApplicationsQuery } from "@/state/api";
import Link from "next/link";
import { FileText, MapPin, Calendar, CheckCircle, XCircle, Clock, ArrowRight, Home } from "lucide-react";
import { format } from "date-fns";

export default function ApplicationsPage() {
  const { user, isLoaded } = useUser();
  const userId = user?.id;

  const { data: applications, isLoading, error } = useGetApplicationsQuery(
    { userId, userType: "tenant" },
    { skip: !userId }
  );

  if (!isLoaded || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your applications...</p>
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

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "rejected":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Applications</h1>
          <p className="text-gray-600">
            {applications?.length || 0} {applications?.length === 1 ? 'application' : 'applications'} submitted
          </p>
        </div>

        {/* Empty state */}
        {!applications || applications.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow">
            <FileText className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">No applications yet</h2>
            <p className="text-gray-500 mb-6">Start by applying to properties you like!</p>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition"
            >
              Browse Properties
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        ) : (
          /* Applications list */
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
                      alt={application.property?.name || "Property"}
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
                          {application.property?.name || "Property Name"}
                        </h3>
                        <div className="flex items-center gap-2 text-gray-600 mb-2">
                          <MapPin className="w-4 h-4" />
                          <span className="text-sm">
                            {application.property?.location?.city}, {application.property?.location?.state}
                          </span>
                        </div>
                      </div>
                      <div className={getStatusBadge(application.status)}>
                        {getStatusIcon(application.status)}
                        <span className="capitalize">{application.status}</span>
                      </div>
                    </div>

                    {/* Application Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">
                          Applied: {format(new Date(application.createdAt), "MMM dd, yyyy")}
                        </span>
                      </div>
                      {application.moveInDate && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Home className="w-4 h-4" />
                          <span className="text-sm">
                            Move-in: {format(new Date(application.moveInDate), "MMM dd, yyyy")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Message */}
                    {application.message && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <p className="text-sm text-gray-700 italic">"{application.message}"</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
                      <Link
                        href={`/search/${application.property?.id}`}
                        className="text-orange-500 hover:text-orange-600 font-medium text-sm flex items-center gap-1"
                      >
                        View Property
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                      
                      {application.status.toLowerCase() === "approved" && (
                        <span className="text-green-600 text-sm font-semibold">
                          ✓ Lease agreement available
                        </span>
                      )}
                    </div>
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