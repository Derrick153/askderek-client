"use client";

import { useGetDashboardStatsQuery } from "@/state/api";
import { Shield, Users, Building2, FileText, AlertTriangle, CheckCircle, Clock, TrendingUp } from "lucide-react";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetDashboardStatsQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-orange-600" />
          <h1 className="text-3xl font-black text-gray-900">Admin Dashboard</h1>
        </div>
        <p className="text-gray-600">Welcome back, Administrator 🇬🇭</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <Building2 className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-black text-gray-900">{stats?.properties?.total || 0}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-600">Total Properties</h3>
          <p className="text-xs text-amber-600 mt-1">{stats?.properties?.pending || 0} pending</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 text-green-600" />
            <span className="text-2xl font-black text-gray-900">{stats?.managers?.total || 0}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-600">Total Landlords</h3>
          <p className="text-xs text-emerald-600 mt-1">{stats?.managers?.verified || 0} verified</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <FileText className="w-8 h-8 text-purple-600" />
            <span className="text-2xl font-black text-gray-900">{stats?.applications?.total || 0}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-600">Applications</h3>
          <p className="text-xs text-amber-600 mt-1">{stats?.applications?.pending || 0} pending</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <span className="text-2xl font-black text-gray-900">{stats?.reports?.total || 0}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-600">Reports</h3>
          <p className="text-xs text-red-600 mt-1">{stats?.reports?.unresolved || 0} unresolved</p>
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 text-indigo-600" />
            <span className="text-2xl font-black text-gray-900">{stats?.tenants?.total || 0}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-600">Total Tenants</h3>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
            <span className="text-2xl font-black text-gray-900">{stats?.properties?.approved || 0}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-600">Approved Properties</h3>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-orange-600" />
            <span className="text-2xl font-black text-gray-900">GH₵{stats?.revenue?.total?.toLocaleString() || 0}</span>
          </div>
          <h3 className="text-sm font-semibold text-gray-600">Total Revenue</h3>
        </div>
      </div>

      {/* Welcome Banner */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
        <h2 className="text-lg font-black text-orange-900 mb-2">🎉 Admin Panel Active</h2>
        <p className="text-orange-700 text-sm">
          You have full administrator access to AskDerek. 
          Manage properties, verify landlords, and keep the platform safe. 🇬🇭
        </p>
      </div>
    </div>
  );
}