"use client";

import { useGetDashboardStatsQuery } from "@/state/api";
import {
  Building2,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Shield,
} from "lucide-react";
import React from "react";

const AdminDashboard = () => {
  const { data: stats, isLoading } = useGetDashboardStatsQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Properties",
      value: stats?.properties?.total || 0,
      sub: `${stats?.properties?.pending || 0} pending approval`,
      icon: Building2,
      color: "bg-blue-50 text-blue-600",
      border: "border-blue-200",
    },
    {
      title: "Approved Properties",
      value: stats?.properties?.approved || 0,
      sub: `${stats?.properties?.rejected || 0} rejected`,
      icon: CheckCircle,
      color: "bg-green-50 text-green-600",
      border: "border-green-200",
    },
    {
      title: "Total Landlords",
      value: stats?.managers?.total || 0,
      sub: `${stats?.managers?.verified || 0} verified`,
      icon: Shield,
      color: "bg-orange-50 text-orange-600",
      border: "border-orange-200",
    },
    {
      title: "Pending Verifications",
      value: stats?.managers?.pendingVerifications || 0,
      sub: "Ghana Card reviews",
      icon: Clock,
      color: "bg-yellow-50 text-yellow-600",
      border: "border-yellow-200",
    },
    {
      title: "Total Tenants",
      value: stats?.tenants?.total || 0,
      sub: "Registered users",
      icon: Users,
      color: "bg-purple-50 text-purple-600",
      border: "border-purple-200",
    },
    {
      title: "Applications",
      value: stats?.applications?.total || 0,
      sub: `${stats?.applications?.pending || 0} pending`,
      icon: FileText,
      color: "bg-indigo-50 text-indigo-600",
      border: "border-indigo-200",
    },
    {
      title: "Unresolved Reports",
      value: stats?.reports?.unresolved || 0,
      sub: `${stats?.reports?.total || 0} total reports`,
      icon: AlertTriangle,
      color: "bg-red-50 text-red-600",
      border: "border-red-200",
    },
    {
      title: "Total Revenue",
      value: `GH₵ ${(stats?.revenue?.total || 0).toLocaleString()}`,
      sub: "All time payments",
      icon: TrendingUp,
      color: "bg-emerald-50 text-emerald-600",
      border: "border-emerald-200",
    },
  ];

  const quickLinks = [
    { label: "Review Pending Properties", href: "/admin/properties", color: "bg-blue-600" },
    { label: "Verify Landlords", href: "/admin/verifications", color: "bg-orange-600" },
    { label: "Manage Reports", href: "/admin/reports", color: "bg-red-600" },
    { label: "View Audit Logs", href: "/admin/audit-logs", color: "bg-gray-700" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Welcome back. Here is what is happening on AskDerek today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className={`bg-white rounded-2xl p-5 border ${card.border} shadow-sm hover:shadow-md transition`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{card.value}</div>
              <div className="text-sm font-medium text-gray-700">{card.title}</div>
              <div className="text-xs text-gray-400 mt-0.5">{card.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Quick Links */}
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map((link, i) => (
          <a
            key={i}
            href={link.href}
            className={`${link.color} text-white rounded-xl px-4 py-3 text-sm font-semibold text-center hover:opacity-90 transition`}
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;