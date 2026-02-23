"use client";

import { useUser } from "@clerk/nextjs";
import { useGetApplicationsQuery, useUpdateApplicationStatusMutation } from "@/state/api";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import {
  FileText, MapPin, Calendar, User, Mail, Phone,
  CheckCircle, XCircle, Clock, Bell, AlertCircle, MessageCircle,
  Home, TrendingUp, Zap,
} from "lucide-react";

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const base = "px-3 py-1.5 rounded-full text-xs font-black tracking-widest uppercase flex items-center gap-1.5 whitespace-nowrap border";
  if (status === "Approved") return <span className={`${base} bg-emerald-950 text-emerald-400 border-emerald-800`}><CheckCircle className="w-3.5 h-3.5" />Approved</span>;
  if (status === "Denied") return <span className={`${base} bg-red-950 text-red-400 border-red-800`}><XCircle className="w-3.5 h-3.5" />Denied</span>;
  return <span className={`${base} bg-amber-950 text-amber-400 border-amber-800`}><Clock className="w-3.5 h-3.5" />Pending</span>;
}

// ─── APPLICATION CARD ─────────────────────────────────────────────────────────
function ApplicationCard({ application, onUpdateStatus, isUpdating, processingId, highlight }: any) {
  const isProcessing = isUpdating && processingId === application.id;

  return (
    <div className={`group relative bg-zinc-900 rounded-2xl overflow-hidden border transition-all duration-300 hover:border-orange-500/50 hover:shadow-2xl hover:shadow-orange-500/10 ${highlight ? "border-orange-500/70 shadow-lg shadow-orange-500/10" : "border-zinc-800"}`}>
      {highlight && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600" />
      )}

      <div className="flex flex-col lg:flex-row">
        {/* Image */}
        <div className="lg:w-72 h-52 lg:h-auto relative overflow-hidden flex-shrink-0">
          <img
            src={application.property?.photoUrls?.[0] || "/placeholder-property.jpg"}
            alt={application.property?.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-4 left-4">
            <span className="bg-orange-600 text-white px-3 py-1.5 rounded-lg text-sm font-black tracking-tight">
              GH₵{application.property?.pricePerMonth?.toLocaleString()}/mo
            </span>
          </div>
          {highlight && (
            <div className="absolute top-4 right-4">
              <span className="bg-red-600 text-white px-2.5 py-1 rounded-lg text-xs font-black tracking-widest animate-pulse">NEW</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-6 flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-white mb-1 leading-tight">{application.property?.name}</h3>
              <div className="flex items-center gap-1.5 text-zinc-400">
                <MapPin className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                <span className="text-sm">{application.property?.location?.city}, {application.property?.location?.state}</span>
              </div>
            </div>
            <StatusBadge status={application.status} />
          </div>

          {/* Applicant Grid */}
          <div className="bg-zinc-800/60 rounded-xl p-4 border border-zinc-700/50">
            <p className="text-xs font-black text-zinc-500 tracking-widest uppercase mb-3 flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-orange-500" />Applicant Details
            </p>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
              <div className="flex items-center gap-2 min-w-0">
                <User className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                <span className="text-sm text-white font-semibold truncate">{application.name || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                <span className="text-sm text-zinc-300 truncate">{application.email || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <Phone className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                <span className="text-sm text-zinc-300">{application.phoneNumber || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <Calendar className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                <span className="text-sm text-zinc-300">
                  {application.applicationDate ? format(new Date(application.applicationDate), "MMM dd, yyyy") : "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Message */}
          {application.message && (
            <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl px-4 py-3">
              <p className="text-sm text-blue-300 italic leading-relaxed">"{application.message}"</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 mt-auto pt-4 border-t border-zinc-800">
            {application.phoneNumber && (
              <a
                href={`https://wa.me/${application.phoneNumber?.replace(/^0/, "233")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] px-4 py-2 rounded-xl font-bold text-sm transition-all"
              >
                <MessageCircle className="w-4 h-4" />WhatsApp
              </a>
            )}

            {application.status === "Pending" && (
              <>
                <button
                  onClick={() => onUpdateStatus(application.id, "Approved")}
                  disabled={isProcessing}
                  className="flex-1 min-w-[140px] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/40"
                >
                  {isProcessing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Approve & Create Lease
                </button>
                <button
                  onClick={() => onUpdateStatus(application.id, "Denied")}
                  disabled={isProcessing}
                  className="flex-1 min-w-[100px] bg-zinc-800 hover:bg-red-950 border border-zinc-700 hover:border-red-800 disabled:opacity-50 text-zinc-300 hover:text-red-400 px-5 py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all"
                >
                  <XCircle className="w-4 h-4" />Deny
                </button>
              </>
            )}

            {application.status === "Approved" && (
              <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-800/50 px-4 py-2.5 rounded-xl">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-black text-emerald-300">Lease Created</p>
                  <p className="text-xs text-emerald-600">Tenant can now pay rent on the platform</p>
                </div>
              </div>
            )}

            {application.status === "Denied" && (
              <div className="flex items-center gap-2 bg-red-950/60 border border-red-800/50 px-4 py-2.5 rounded-xl">
                <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-sm font-black text-red-300">Application Denied</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, pulse }: any) {
  return (
    <div className={`relative bg-zinc-900 rounded-2xl p-6 border ${pulse ? "border-amber-600/60 shadow-lg shadow-amber-900/20" : "border-zinc-800"} overflow-hidden`}>
      {pulse && <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-600 to-orange-600" />}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black text-zinc-500 tracking-widest uppercase mb-2">{label}</p>
          <p className="text-4xl font-black text-white">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ManagerApplicationsPage() {
  const { user, isLoaded } = useUser();
  const userId = user?.id;

  const { data: applications, isLoading, error } = useGetApplicationsQuery(
    { userId, userType: "manager" },
    { skip: !userId }
  );

  const [updateStatus, { isLoading: isUpdating }] = useUpdateApplicationStatusMutation();
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [notified, setNotified] = useState(false);

  const pendingApps = applications?.filter((a: any) => a.status === "Pending") || [];
  const approvedApps = applications?.filter((a: any) => a.status === "Approved") || [];
  const deniedApps = applications?.filter((a: any) => a.status === "Denied") || [];

  useEffect(() => {
    if (applications && !notified && pendingApps.length > 0) {
      toast.info(`${pendingApps.length} application${pendingApps.length !== 1 ? "s" : ""} waiting for review`, { duration: 5000 });
      setNotified(true);
    }
  }, [applications, notified, pendingApps.length]);

  const handleUpdateStatus = async (applicationId: number, newStatus: string) => {
    setProcessingId(applicationId);
    try {
      await updateStatus({ id: applicationId, status: newStatus }).unwrap();
      if (newStatus === "Approved") {
        toast.success("Lease created automatically — tenant can now pay rent", { duration: 5000 });
      } else {
        toast.success("Application denied");
      }
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to update. Try again.");
    } finally {
      setProcessingId(null);
    }
  };

  if (!isLoaded || isLoading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-zinc-500 text-sm font-semibold tracking-wide">Loading applications...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center max-w-sm">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-black text-white mb-2">Failed to Load</h2>
        <p className="text-zinc-500 text-sm mb-6">Check your connection and try again.</p>
        <button onClick={() => window.location.reload()} className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all">
          Reload Page
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-black text-orange-500 tracking-widest uppercase">Rental Applications</span>
            </div>
            <h1 className="text-3xl font-black text-white">Applications</h1>
            <p className="text-zinc-500 text-sm mt-1">{applications?.length || 0} total across all your properties</p>
          </div>
          {pendingApps.length > 0 && (
            <div className="flex items-center gap-2 bg-amber-600/10 border border-amber-600/40 text-amber-400 px-4 py-2 rounded-xl">
              <Bell className="w-4 h-4 animate-pulse" />
              <span className="font-black text-sm">{pendingApps.length} need review</span>
            </div>
          )}
        </div>

        {/* Urgent Banner */}
        {pendingApps.length > 0 && (
          <div className="relative bg-gradient-to-r from-orange-950/80 to-red-950/80 border border-orange-800/50 rounded-2xl p-5 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(234,88,12,0.15),transparent_60%)]" />
            <div className="relative flex items-center gap-4">
              <div className="w-10 h-10 bg-orange-600/20 border border-orange-600/40 rounded-xl flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="font-black text-white">Action Required</p>
                <p className="text-orange-300/80 text-sm">
                  {pendingApps.length} pending application{pendingApps.length !== 1 ? "s" : ""} — approve to automatically generate lease agreements and payment records.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Pending Review" value={pendingApps.length} icon={Clock} color="bg-amber-600" pulse={pendingApps.length > 0} />
          <StatCard label="Approved" value={approvedApps.length} icon={CheckCircle} color="bg-emerald-600" />
          <StatCard label="Denied" value={deniedApps.length} icon={XCircle} color="bg-red-700" />
        </div>

        {/* Empty State */}
        {!applications || applications.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-16 text-center">
            <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Home className="w-8 h-8 text-zinc-600" />
            </div>
            <h2 className="text-xl font-black text-white mb-2">No Applications Yet</h2>
            <p className="text-zinc-500 text-sm max-w-sm mx-auto">
              When tenants apply to your properties in Tarkwa, they will appear here for your review.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {pendingApps.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-sm font-black text-amber-400 tracking-widest uppercase mb-4">
                  <Clock className="w-4 h-4" />Pending Review ({pendingApps.length})
                </h2>
                <div className="space-y-4">
                  {pendingApps.map((app: any) => (
                    <ApplicationCard key={app.id} application={app} onUpdateStatus={handleUpdateStatus} isUpdating={isUpdating} processingId={processingId} highlight />
                  ))}
                </div>
              </section>
            )}

            {approvedApps.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-sm font-black text-emerald-400 tracking-widest uppercase mb-4">
                  <CheckCircle className="w-4 h-4" />Approved ({approvedApps.length})
                </h2>
                <div className="space-y-4">
                  {approvedApps.map((app: any) => (
                    <ApplicationCard key={app.id} application={app} onUpdateStatus={handleUpdateStatus} isUpdating={isUpdating} processingId={processingId} highlight={false} />
                  ))}
                </div>
              </section>
            )}

            {deniedApps.length > 0 && (
              <section>
                <h2 className="flex items-center gap-2 text-sm font-black text-red-400 tracking-widest uppercase mb-4">
                  <XCircle className="w-4 h-4" />Denied ({deniedApps.length})
                </h2>
                <div className="space-y-4">
                  {deniedApps.map((app: any) => (
                    <ApplicationCard key={app.id} application={app} onUpdateStatus={handleUpdateStatus} isUpdating={isUpdating} processingId={processingId} highlight={false} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}