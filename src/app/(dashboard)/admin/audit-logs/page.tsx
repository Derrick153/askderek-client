"use client";

import { useGetAuditLogsQuery } from "@/state/api";
import { Shield } from "lucide-react";

const AdminAuditLogs = () => {
  const { data: logs, isLoading } = useGetAuditLogsQuery();

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-gray-500 mt-1">Complete history of all admin actions</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Admin</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Action</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Target</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Details</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Date</th>
            </tr>
          </thead>
          <tbody>
            {logs?.map((log: any) => (
              <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-orange-100 rounded-full flex items-center justify-center">
                      <Shield className="w-3.5 h-3.5 text-orange-600" />
                    </div>
                    <span className="font-medium text-gray-900">{log.admin?.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-lg text-xs font-mono font-semibold">
                    {log.action}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-500">{log.target}</td>
                <td className="px-5 py-3 text-gray-400 text-xs">{log.details}</td>
                <td className="px-5 py-3 text-gray-400 text-xs">
                  {new Date(log.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminAuditLogs;