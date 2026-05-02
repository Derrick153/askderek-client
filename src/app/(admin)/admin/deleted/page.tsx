"use client";

import { useMemo }           from "react";
import { useUser }           from "@clerk/nextjs";
import {
  useGetAdminAllPropertiesQuery,
  useRestorePropertyMutation,
  useGetAdminQuery,
} from "@/state/api";
import ListingTypeBadge      from "@/components/ListingTypeBadge";
import PropertyStatusBadge   from "@/components/PropertyStatusBadge";
import {
  AlertCircle, CheckCircle, RotateCcw, RefreshCw,
} from "lucide-react";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

export default function AdminDeletedPage() {
  const { user } = useUser();
  const { data: adminRaw } = useGetAdminQuery(user?.id ?? "", { skip: !user?.id });
  const adminDbId: number  = (adminRaw as any)?.id ?? 1;

  const { data: propsRaw, isLoading, refetch } = useGetAdminAllPropertiesQuery({} as any);
  const [restoreProperty] = useRestorePropertyMutation();

  const allProperties: any[] = useMemo(() => {
    if (!propsRaw) return [];
    if (Array.isArray(propsRaw)) return propsRaw;
    return (propsRaw as any).data ?? (propsRaw as any).properties ?? [];
  }, [propsRaw]);

  const deletedProperties = allProperties.filter(
    (p: any) =>
      p.listingStatus === "ARCHIVED" ||
      p.listingStatus === "PENDING_REMOVAL" ||
      p.isDeleted
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Deleted Properties</h1>
            <p className="text-sm text-gray-500 mt-0.5">Archived and soft-deleted properties</p>
          </div>
          <button onClick={() => refetch()} className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <AlertCircle className="w-8 h-8 text-rose-500 mb-3" />
            <p className="text-2xl font-bold text-gray-900">{deletedProperties.length}</p>
            <p className="text-sm text-gray-500">Total Removed</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <RotateCcw className="w-8 h-8 text-blue-500 mb-3" />
            <p className="text-2xl font-bold text-gray-900">
              {deletedProperties.filter((p: any) => p.listingStatus === "ARCHIVED").length}
            </p>
            <p className="text-sm text-gray-500">Restorable</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : deletedProperties.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-base font-bold text-gray-900 mb-1">No deleted properties</p>
            <p className="text-sm text-gray-500">All properties are active and clean.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {["Property", "Type", "Status", "Reason", "Actions"].map((h) => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {deletedProperties.map((p: any) => (
                    <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900 truncate max-w-[180px]">{p.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{p.location?.city}, {p.location?.region}</p>
                      </td>
                      <td className="px-5 py-4">
                        <ListingTypeBadge type={p.listingType ?? p.propertyType ?? "RENT"} size="sm" />
                      </td>
                      <td className="px-5 py-4">
                        <PropertyStatusBadge status={p.listingStatus ?? "ARCHIVED"} size="sm" />
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xs text-gray-500 max-w-[160px] truncate">
                          {p.removalReason ?? p.deleteReason ?? "—"}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={async () => { await restoreProperty({ propertyId: p.id, adminDbId }); refetch(); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Restore
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}