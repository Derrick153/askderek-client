"use client";

import { useGetAdminReportsQuery, useResolveReportMutation } from "@/state/api";
import { CheckCircle, AlertTriangle } from "lucide-react";

const AdminReports = () => {
  const { data: reports, isLoading } = useGetAdminReportsQuery();
  const [resolveReport] = useResolveReportMutation();

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reports & Scam Center</h1>
        <p className="text-gray-500 mt-1">{reports?.filter((r: any) => !r.isResolved).length || 0} unresolved reports</p>
      </div>

      {reports?.length === 0 && (
        <div className="bg-white rounded-2xl p-10 text-center border border-gray-200">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No reports yet!</p>
        </div>
      )}

      <div className="space-y-4">
        {reports?.map((report: any) => (
          <div key={report.id} className={`bg-white rounded-2xl p-5 border shadow-sm ${report.isResolved ? "border-green-200 opacity-60" : "border-red-200"}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className={`w-4 h-4 ${report.isResolved ? "text-green-500" : "text-red-500"}`} />
                  <span className="font-bold text-gray-900">{report.reason}</span>
                  {report.isResolved && (
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold">Resolved</span>
                  )}
                </div>
                <p className="text-gray-500 text-sm">{report.description}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Property: {report.property?.name} · Reported: {new Date(report.createdAt).toLocaleDateString()}
                </p>
              </div>
              {!report.isResolved && (
                <button
                  onClick={() => resolveReport(report.id)}
                  className="bg-green-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-green-700 flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark Resolved
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminReports;