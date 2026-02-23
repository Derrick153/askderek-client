"use client";

import { useUser } from "@clerk/nextjs";
import { useGetManagerPropertiesQuery } from "@/state/api";
import Link from "next/link";
import {
  Building2, Plus, MapPin, Bed, Bath, Eye,
  TrendingUp, Users, DollarSign, Layers, ArrowRight, Zap,
} from "lucide-react";

function StatCard({ label, value, icon: Icon, sub }: any) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex items-center justify-between">
      <div>
        <p className="text-xs font-black text-zinc-500 tracking-widest uppercase mb-1">{label}</p>
        <p className="text-3xl font-black text-white">{value}</p>
        {sub && <p className="text-xs text-zinc-600 mt-1">{sub}</p>}
      </div>
      <div className="w-11 h-11 bg-orange-600/15 border border-orange-600/30 rounded-xl flex items-center justify-center">
        <Icon className="w-5 h-5 text-orange-500" />
      </div>
    </div>
  );
}

function PropertyCard({ property }: { property: any }) {
  const isAvailable = property.availabilityStatus === "available";
  const pendingCount = property.applications?.length || 0;

  return (
    <div className="group bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-orange-500/40 hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300">
      {/* Image */}
      <div className="relative h-52 overflow-hidden">
        <img
          src={property.photoUrls?.[0] || "/placeholder-property.jpg"}
          alt={property.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-black tracking-widest uppercase ${isAvailable ? "bg-emerald-600 text-white" : "bg-zinc-700 text-zinc-300"}`}>
            {isAvailable ? "Available" : "Occupied"}
          </span>
          {pendingCount > 0 && (
            <span className="bg-orange-600 text-white px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1">
              <Zap className="w-3 h-3" />{pendingCount} pending
            </span>
          )}
        </div>

        {/* Price */}
        <div className="absolute bottom-3 left-3">
          <span className="bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-sm font-black">
            GH₵{property.pricePerMonth?.toLocaleString()}<span className="text-zinc-400 font-normal text-xs">/mo</span>
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-black text-white text-base mb-1 leading-tight">{property.name}</h3>
        <div className="flex items-center gap-1.5 text-zinc-500 mb-4">
          <MapPin className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
          <span className="text-sm truncate">{property.location?.city}, {property.location?.state}</span>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-sm text-zinc-500 mb-4 pb-4 border-b border-zinc-800">
          <span className="flex items-center gap-1.5"><Bed className="w-3.5 h-3.5" />{property.beds} bed</span>
          <span className="flex items-center gap-1.5"><Bath className="w-3.5 h-3.5" />{property.baths} bath</span>
          <span className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" />GH₵{property.securityDeposit?.toLocaleString()} dep.</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Link
            href={`/search/${property.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white py-2.5 rounded-xl text-sm font-bold transition-all"
          >
            <Eye className="w-4 h-4" />View
          </Link>
          <Link
            href="/managers/applications"
            className="flex-1 flex items-center justify-center gap-1.5 bg-orange-600 hover:bg-orange-500 text-white py-2.5 rounded-xl text-sm font-black transition-all"
          >
            <Users className="w-4 h-4" />Applications
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ManagerPropertiesPage() {
  const { user, isLoaded } = useUser();
  const { data: properties, isLoading } = useGetManagerPropertiesQuery(
    user?.id || "",
    { skip: !user?.id }
  );

  if (!isLoaded || isLoading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-zinc-500 text-sm">Loading properties...</p>
      </div>
    </div>
  );

  const total = properties?.length || 0;
  const available = properties?.filter((p: any) => p.availabilityStatus === "available").length || 0;
  const monthlyValue = properties?.reduce((s: number, p: any) => s + (p.pricePerMonth || 0), 0) || 0;
  const pendingTotal = properties?.reduce((s: number, p: any) => s + (p.applications?.length || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-zinc-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 bg-orange-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs font-black text-orange-500 tracking-widest uppercase">Property Portfolio</span>
            </div>
            <h1 className="text-3xl font-black text-white">My Properties</h1>
            <p className="text-zinc-500 text-sm mt-1">{total} listings in Tarkwa, Ghana</p>
          </div>
          <Link
            href="/managers/newproperty"
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-xl font-black text-sm transition-all shadow-lg shadow-orange-900/40"
          >
            <Plus className="w-4 h-4" />Add Property
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Listed" value={total} icon={Layers} />
          <StatCard label="Available" value={available} icon={TrendingUp} sub={`${total - available} occupied`} />
          <StatCard label="Pending Apps" value={pendingTotal} icon={Users} />
          <StatCard label="Monthly Value" value={`GH₵${(monthlyValue / 1000).toFixed(1)}k`} icon={DollarSign} />
        </div>

        {/* Empty State */}
        {total === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 border-dashed rounded-2xl p-16 text-center">
            <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Building2 className="w-8 h-8 text-zinc-600" />
            </div>
            <h2 className="text-xl font-black text-white mb-2">No Properties Listed</h2>
            <p className="text-zinc-500 text-sm max-w-sm mx-auto mb-6">
              Add your first property to start receiving applications from tenants in Tarkwa.
            </p>
            <Link
              href="/managers/newproperty"
              className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-xl font-black text-sm transition-all"
            >
              <Plus className="w-4 h-4" />List Your First Property
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {properties.map((property: any) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}