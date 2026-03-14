"use client";

import { useGetAdminAllManagersQuery, useGetAdminAllTenantsQuery } from "@/state/api";
import { useState } from "react";
import { Shield, Users } from "lucide-react";

const AdminUsers = () => {
  const [tab, setTab] = useState<"managers" | "tenants">("managers");
  const { data: managers, isLoading: loadingManagers } = useGetAdminAllManagersQuery();
  const { data: tenants, isLoading: loadingTenants } = useGetAdminAllTenantsQuery();

  const isLoading = loadingManagers || loadingTenants;

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 mt-1">Manage all landlords and tenants on AskDerek</p>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setTab("managers")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${tab === "managers" ? "bg-orange-600 text-white" : "bg-white text-gray-600 border border-gray-200"}`}
        >
          <Shield className="w-4 h-4" />
          Landlords ({managers?.length || 0})
        </button>
        <button
          onClick={() => setTab("tenants")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${tab === "tenants" ? "bg-orange-600 text-white" : "bg-white text-gray-600 border border-gray-200"}`}
        >
          <Users className="w-4 h-4" />
          Tenants ({tenants?.length || 0})
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Name</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Email</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Phone</th>
              {tab === "managers" && (
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Verified</th>
              )}
            </tr>
          </thead>
          <tbody>
            {(tab === "managers" ? managers : tenants)?.map((user: any) => (
              <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">{user.name}</td>
                <td className="px-5 py-3 text-gray-500">{user.email}</td>
                <td className="px-5 py-3 text-gray-500">{user.phoneNumber}</td>
                {tab === "managers" && (
                  <td className="px-5 py-3">
                    {user.isVerified ? (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">Verified</span>
                    ) : (
                      <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs font-semibold">Unverified</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;