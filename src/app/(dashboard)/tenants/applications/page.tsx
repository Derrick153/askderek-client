"use client";

import { useUser } from "@clerk/nextjs";
import { useGetApplicationsQuery } from "@/state/api";
import { format } from "date-fns";
import {
  FileText, MapPin, Calendar, CheckCircle, XCircle,
  Clock, Home, ArrowRight, Search,
} from "lucide-react";
import Link from "next/link";

function StatusBadge({ status }: { status: string }) {
  const base = "px-3 py-1.5 rounded-full text-xs font-black tracking-widest uppercase flex items-center gap-1.5 border whitespace-nowrap";
  if (status === "Approved") return <span className={`${base} bg-emerald-950 text-emerald-400 border-emerald-800`}><CheckCircle className="w-3.5 h-3.5" />Approved</span>;
  if (status === "Denied") return <span className={`${base} bg-red-950 text-red-400 border-red-800`}><XCircle className="w-3.5 h-3.5" />Denied</span>;
  return <span className={`${base} bg-amber-950 text-amber-400 border-amber-800`}><Clock className="w-3.5 h-3.5" />Pending</span>;
}

function ApplicationCard({ app }: { app: any }) {
  return (
    <div className={`group bg-zinc-900 border rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 ${
      app.status === "Approved" ? "border-emerald-800/50 hover:border-emerald-600/50" :
      app.status === "Denied" ? "border-zinc-800 hover:border-zinc-700" :
      "border-amber-800/50 hover:border-amber-600/50"
    }`}>
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <div className="sm:w-52 h-44 sm:h-auto relative overflow-hidden flex-shrink-0">
          <img
            src={app.property?.photoUrls?.[0] || "/placeholder-property.jpg"}
            alt={app.property?.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3">
            <span className="bg-black/70 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-xs font-black">
              GH₵{app.property?.pricePerMonth?.toLocaleString()}/mo
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-black text-white text-base leading-tight mb-1">{app.property?.name}</h3>
              <div className="flex items-center gap-1.5 text-zinc-500">
                <MapPin className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                <span className="text-sm">{app.property?.location?.city}, {app.property?.location?.state}</span>
              </div>
            </div>
            <StatusBadge status={app.status} />
          </div>

          <div className="flex items-center gap-2 text-zinc-600 text-xs">
            <Calendar className="w-3.5 h-3.5" />
            <span>Applied {app.applicationDate ? format(new Date(app.applicationDate), "MMM dd, yyyy") : "N/A"}</span>
          </div>

          {/* Status Message */}
          {app.status === "Approved" && (
            <div className="bg-emerald-950/60 border border-emerald-800/50 rounded-xl p-3 flex items-center justify-between gap-3 mt-auto">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-black text-emerald-300">Approved — Lease Active</p>
                  <p className="text-xs text-emerald-700">You can now pay rent via the platform</p>
                </div>
              </div>
              <Link href="/tenants/residences" className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-xs font-black whitespace-nowrap transition-colors">
                Pay Rent <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {app.status === "Pending" && (
            <div className="bg-amber-950/40 border border-amber-800/40 rounded-xl p-3 flex items-center gap-2 mt-auto">
              <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 animate-pulse" />
              <p className="text-sm font-bold text-amber-300/80">Awaiting landlord review</p>
            </div>
          )}

          {app.status === "Denied" && (
            <div className="bg-red-950/40 border border-red-800/40 rounded-xl p-3 flex items-center justify-between gap-3 mt-auto">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-sm font-bold text-red-300/80">Application not successful</p>
              </div>
              <Link href="/search" className="flex items-center gap-1 text-orange-400 hover:text-orange-300 text-xs font-black whitespace-nowrap transition-colors">
                Find more <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TenantApplicationsPage() {
  const { user, isLoaded } = useUser();
  const { data: applications, isLoading } = useGetApplicationsQuery(
    { userId: user?.id, userType: "tenant" },
    { skip: !user?.id }
  );

  const pending = applications?.filter((a: any) => a.status === "Pending") || [];
  const approved = applications?.filter((a: any) => a.status === "Approved") || [];
  const denied = applications?.filter((a: any) => a.status === "Denied") || [];

  if (!isLoaded || isLoading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-zinc-500 text-sm">Loading applications...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 bg-orange-600 rounded-lg flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs font-black text-orange-500 tracking-widest uppercase">Rental Applications</span>
            </div>
            <h1 className="text-3xl font-black text-white">My Applications</h1>
            <p className="text-zinc-500 text-sm mt-1">{applications?.length || 0} total applications</p>
          </div>
          <Link
            href="/search"
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all"
          >
            <Search className="w-4 h-4" />Browse Properties
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Pending", value: pending.length, color: "text-amber-400" },
            { label: "Approved", value: approved.length, color: "text-emerald-400" },
            { label: "Denied", value: denied.length, color: "text-red-400" },
          ].map((s) => (
            <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs font-black text-zinc-600 tracking-widest uppercase mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Empty */}
        {!applications || applications.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-2xl p-16 text-center">
            <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Home className="w-8 h-8 text-zinc-600" />
            </div>
            <h2 className="text-xl font-black text-white mb-2">No Applications Yet</h2>
            <p className="text-zinc-500 text-sm max-w-sm mx-auto mb-6">
              Browse properties in Tarkwa and apply to find your home.
            </p>
            <Link href="/search" className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-xl font-black text-sm transition-all">
              <Search className="w-4 h-4" />Find Properties
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {pending.length > 0 && (
              <section>
                <h2 className="text-xs font-black text-amber-400 tracking-widest uppercase mb-4 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />Pending ({pending.length})
                </h2>
                <div className="space-y-3">{pending.map((a: any) => <ApplicationCard key={a.id} app={a} />)}</div>
              </section>
            )}
            {approved.length > 0 && (
              <section>
                <h2 className="text-xs font-black text-emerald-400 tracking-widest uppercase mb-4 flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5" />Approved ({approved.length})
                </h2>
                <div className="space-y-3">{approved.map((a: any) => <ApplicationCard key={a.id} app={a} />)}</div>
              </section>
            )}
            {denied.length > 0 && (
              <section>
                <h2 className="text-xs font-black text-red-400 tracking-widest uppercase mb-4 flex items-center gap-2">
                  <XCircle className="w-3.5 h-3.5" />Denied ({denied.length})
                </h2>
                <div className="space-y-3">{denied.map((a: any) => <ApplicationCard key={a.id} app={a} />)}</div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}