"use client";

import { useState, useMemo } from "react";
import {
  useGetAdminAllPropertiesQuery,
  useRestorePropertyMutation,
  useTriggerPendingRemovalMutation,
  useMarkPropertyAsSoldMutation,
} from "@/state/api";
import { useGetAdminQuery } from "@/state/api";
import { useUser }          from "@clerk/nextjs";
import SoftDeleteModal      from "@/components/SoftDeleteModal";
import MarkAsSoldModal      from "@/components/MarkAsSoldModal";
import ListingTypeBadge     from "@/components/ListingTypeBadge";
import PropertyStatusBadge  from "@/components/PropertyStatusBadge";
import {
  Gavel,
  Search,
  RefreshCw,
  TrendingUp,
  Home,
  Tag,
  Archive,
  RotateCcw,
  Trash2,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
//  /admin/sales/page.tsx
//  Admin sale management — view, mark sold, archive, restore properties.
// ─────────────────────────────────────────────────────────────────────────────

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

const formatGHS = (n?: number) =>
  n != null ? `GHS ${n.toLocaleString("en-GH", { minimumFractionDigits: 0 })}` : "—";

const FILTERS = [
  { label: "All",          value: "all"            },
  { label: "For Sale",     value: "FOR_SALE"       },
  { label: "Sold",         value: "SOLD"           },
  { label: "Archived",     value: "ARCHIVED"       },
  { label: "Pending Del",  value: "PENDING_REMOVAL"},
];

export default function AdminSalesPage() {
  const { user }   = useUser();
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("all");
  const [deleteTarget,  setDeleteTarget]  = useState<any>(null);
  const [soldTarget,    setSoldTarget]    = useState<any>(null);

  const { data: adminRaw }      = useGetAdminQuery(user?.id ?? "", { skip: !user?.id });
  const adminDbId: number       = (adminRaw as any)?.id ?? 1;

  const { data: propsRaw, isLoading, refetch } = useGetAdminAllPropertiesQuery({} as any);
  const [restoreProperty]         = useRestorePropertyMutation();
  const [triggerPendingRemoval]   = useTriggerPendingRemovalMutation();
  const [markPropertyAsSold]      = useMarkPropertyAsSoldMutation();

  const properties: any[] = useMemo(() => {
    if (!propsRaw) return [];
    if (Array.isArray(propsRaw)) return propsRaw;
    return (propsRaw as any).data ?? (propsRaw as any).properties ?? [];
  }, [propsRaw]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return properties.filter((p: any) => {
      const matchSearch = !q || p.name?.toLowerCase().includes(q) || p.location?.city?.toLowerCase().includes(q);
      const matchFilter =
        filter === "all" ||
        p.listingType    === filter ||
        p.listingStatus  === filter;
      return matchSearch && matchFilter;
    });
  }, [properties, search, filter]);

  const forSaleCount  = properties.filter((p: any) => p.listingType === "FOR_SALE").length;
  const soldCount     = properties.filter((p: any) => p.listingStatus === "SOLD").length;
  const archivedCount = properties.filter((p: any) => p.listingStatus === "ARCHIVED").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sales Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage property listings, sales and removals</p>
          </div>
          <button onClick={() => refetch()} className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Tag,      label: "For Sale", value: forSaleCount,  bg: "bg-emerald-50", color: "text-emerald-600" },
            { icon: Gavel,    label: "Sold",     value: soldCount,     bg: "bg-blue-50",    color: "text-blue-600"    },
            { icon: Archive,  label: "Archived", value: archivedCount, bg: "bg-gray-100",   color: "text-gray-500"    },
          ].map(({ icon: Icon, label, value, bg, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search properties..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                    filter === f.value
                      ? "bg-orange-600 text-white border-orange-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Properties table */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <Home className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-base font-bold text-gray-900 mb-1">No properties found</p>
            <p className="text-sm text-gray-500">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {["Property", "Type", "Status", "Price", "Actions"].map((h) => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((p: any) => (
                    <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900 truncate max-w-[200px]">{p.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {p.location?.city}, {p.location?.region}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <ListingTypeBadge type={p.listingType ?? p.propertyType} size="sm" />
                      </td>
                      <td className="px-5 py-4">
                        <PropertyStatusBadge status={p.listingStatus ?? p.status ?? "AVAILABLE"} size="sm" />
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900">{formatGHS(p.pricePerMonth ?? p.askingPrice)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {p.listingStatus !== "SOLD" && (
                            <button
                              onClick={() => setSoldTarget(p)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg transition-colors"
                            >
                              <Gavel className="w-3 h-3" />
                              Sold
                            </button>
                          )}
                          {p.listingStatus === "ARCHIVED" || p.listingStatus === "PENDING_REMOVAL" ? (
                            <button
                              onClick={() => restoreProperty({ propertyId: p.id, adminDbId })}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Restore
                            </button>
                          ) : (
                            <button
                              onClick={() => setDeleteTarget(p)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                              Remove
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {deleteTarget && (
        <SoftDeleteModal
          propertyId={deleteTarget.id}
          propertyName={deleteTarget.name}
          adminDbId={adminDbId}
          isOpen
          onClose={() => setDeleteTarget(null)}
          onConfirm={async (data) => {
            await triggerPendingRemoval(data);
            setDeleteTarget(null);
            refetch();
          }}
        />
      )}

      {soldTarget && (
        <MarkAsSoldModal
          propertyId={soldTarget.id}
          propertyName={soldTarget.name}
          askingPrice={soldTarget.pricePerMonth ?? soldTarget.askingPrice}
          isOpen
          onClose={() => setSoldTarget(null)}
          onConfirm={async (data) => {
            await markPropertyAsSold(data);
            setSoldTarget(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}