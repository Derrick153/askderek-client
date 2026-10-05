"use client";

import { useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  useGetManagerPropertiesQuery,
  useGetReportingOverviewQuery,
} from "@/state/api";
import type { ReportingOverview } from "@/state/api";
import {
  AlertTriangle,
  BedDouble,
  CalendarCheck,
  CheckCircle2,
  Clock,
  DollarSign,
  Gauge,
  RefreshCw,
} from "lucide-react";
import {
  BedStatusBar,
  BookingsBreakdown,
  Meter,
  SectionCard,
  SimpleBars,
  StatTile,
} from "@/components/reports/ReportParts";
import {
  RANGE_PRESETS,
  formatDate,
  formatMoney,
  formatPercent,
  formatTime,
  rangeForPreset,
} from "@/components/reports/reportHelpers";

// ---------------------------------------------------------------------------
// Step 19 - Executive Overview for managers.
// All numbers come from ONE server call (GET /api/reports/overview); this page
// only displays them. Beds and rooms are a live snapshot; money and bookings
// follow the selected date range.
// ---------------------------------------------------------------------------

export default function ManagerReportsPage() {
  const { user } = useUser();
  const [preset, setPreset] = useState("30d");
  const [propertyId, setPropertyId] = useState<number | null>(null);

  // Memoised so the date range does not change on every render (that would refetch forever).
  const range = useMemo(() => rangeForPreset(preset), [preset]);

  const { data: propertiesRaw } = useGetManagerPropertiesQuery(user?.id ?? "", {
    skip: !user?.id,
  });
  const properties: any[] = Array.isArray(propertiesRaw)
    ? propertiesRaw
    : ((propertiesRaw as any)?.data ?? []);

  const args = useMemo(
    () =>
      propertyId !== null
        ? { propertyId: propertyId, from: range.from, to: range.to }
        : { managerClerkId: user?.id, from: range.from, to: range.to },
    [propertyId, user?.id, range]
  );

  const { data, isFetching, isError, refetch } = useGetReportingOverviewQuery(args, {
    skip: !user?.id,
  });

  const scopeLabel =
    propertyId === null
      ? "All your properties"
      : (properties.find((p: any) => p.id === propertyId)?.name ?? "Selected property");

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">How your properties are performing</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching || !user?.id}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw className={"w-4 h-4" + (isFetching ? " animate-spin" : "")} />
          Refresh
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {RANGE_PRESETS.map((r) => (
            <button
              key={r.key}
              onClick={() => setPreset(r.key)}
              className={
                "h-9 px-3 rounded-full text-sm font-medium border " +
                (preset === r.key
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50")
              }
            >
              {r.label}
            </button>
          ))}
        </div>
        <select
          aria-label="Property"
          value={propertyId === null ? "" : String(propertyId)}
          onChange={(e) => setPropertyId(e.target.value === "" ? null : Number(e.target.value))}
          className="h-10 w-full sm:w-64 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700"
        >
          <option value="">All my properties</option>
          {properties.map((p: any) => (
            <option key={p.id} value={String(p.id)}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {data ? (
        <p className="text-xs text-gray-500">
          {scopeLabel} | {formatDate(data.range.from)} to {formatDate(data.range.to)} | updated{" "}
          {formatTime(data.generatedAt)}
        </p>
      ) : null}

      {isError && !data ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">The report could not be loaded</p>
            <p className="text-sm text-red-700 mt-0.5">Check your connection and try again.</p>
            <button onClick={() => refetch()} className="mt-3 text-sm font-medium text-red-800 underline">
              Try again
            </button>
          </div>
        </div>
      ) : null}

      {!data && !isError ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse bg-gray-200 rounded-2xl h-28" />
            ))}
          </div>
          <div className="animate-pulse bg-gray-200 rounded-2xl h-64" />
        </div>
      ) : null}

      {data ? <ReportBody data={data} isFetching={isFetching} /> : null}
    </div>
  );
}

function ReportBody({ data, isFetching }: { data: ReportingOverview; isFetching: boolean }) {
  const occ = data.occupancy;
  const rev = data.revenue;
  const appr = data.approval;
  const canc = data.cancellation;
  const room = data.roomUtilization;

  const moneyChart = [
    { name: "Hostel", value: rev.receivedByProduct.hostel },
    { name: "Rent", value: rev.receivedByProduct.rent },
    { name: "Other", value: rev.receivedByProduct.other },
  ];
  const roomChart = [
    { name: "At capacity", value: room.atCapacity },
    { name: "Partly full", value: room.partiallyOccupied },
    { name: "Empty", value: room.unoccupied },
  ];
  const moneyRows = [
    { label: "Billed in this period", value: rev.bookingValue },
    { label: "Received", value: rev.received },
    { label: "Still owed (rent and fees)", value: rev.outstandingBreakdown.ledger },
    { label: "Approved hostel bookings not yet paid", value: rev.outstandingBreakdown.hostelAwaitingPayment },
    { label: "Failed payments", value: rev.failed },
    { label: "Refunded", value: rev.refunded },
  ];

  return (
    <div className={"space-y-6 transition-opacity " + (isFetching ? "opacity-60" : "opacity-100")}>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatTile
          icon={Gauge}
          label="Occupancy"
          value={formatPercent(occ.occupancyRate)}
          hint={occ.totalBeds > 0 ? occ.occupied + " of " + occ.totalBeds + " beds occupied" : "No beds set up yet"}
        />
        <StatTile icon={DollarSign} label="Money received" value={formatMoney(rev.received)} hint="Collected in this period" />
        <StatTile icon={Clock} label="Still owed" value={formatMoney(rev.outstanding)} hint="Unpaid right now" />
        <StatTile icon={CheckCircle2} label="Collection rate" value={formatPercent(data.collectionRate)} hint="Of the money that fell due" />
        <StatTile icon={CalendarCheck} label="New bookings" value={String(data.bookings.total)} hint="Hostel, short stay and lease" />
        <StatTile icon={BedDouble} label="Total beds" value={String(occ.totalBeds)} hint={occ.available + " available now"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Beds right now" subtitle="A live snapshot, not changed by the date range">
          <BedStatusBar occupancy={occ} />
        </SectionCard>

        <SectionCard title="Money collected" subtitle="Received in this period, by product">
          <SimpleBars data={moneyChart} money />
        </SectionCard>

        <SectionCard title="How full the rooms are" subtitle="A live snapshot of room use">
          <SimpleBars data={roomChart} unit="rooms" />
          {room.underutilized > 0 ? (
            <p className="mt-3 text-xs text-gray-500">{room.underutilized} room(s) are less than half full.</p>
          ) : null}
        </SectionCard>

        <SectionCard title="Money details" subtitle="Billed, collected and still owed">
          <dl className="space-y-3">
            {moneyRows.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-3 text-sm">
                <dt className="text-gray-600">{row.label}</dt>
                <dd className="font-semibold text-gray-900 shrink-0">{formatMoney(row.value)}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>
      </div>

      <SectionCard title="Approvals and cancellations" subtitle="Requests that were decided and bookings that fell through, in this period">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Meter
            label="Hostel approval rate"
            rate={appr.hostel.rate}
            detail={appr.hostel.decided === 0 ? "No decisions in this period" : appr.hostel.approved + " approved, " + appr.hostel.rejected + " rejected"}
          />
          <Meter
            label="Lease application approval rate"
            rate={appr.leaseApplication.rate}
            detail={appr.leaseApplication.decided === 0 ? "No decisions in this period" : appr.leaseApplication.approved + " approved, " + appr.leaseApplication.denied + " denied"}
          />
          <Meter
            label="Hostel cancellation rate"
            rate={canc.hostel.rate}
            detail={canc.hostel.total === 0 ? "No hostel bookings in this period" : canc.hostel.cancelled + " of " + canc.hostel.total + " cancelled"}
          />
          <Meter
            label="Short-stay cancellation rate"
            rate={canc.shortStay.rate}
            detail={canc.shortStay.total === 0 ? "No short-stay bookings in this period" : canc.shortStay.cancelled + " of " + canc.shortStay.total + " cancelled"}
          />
        </div>
      </SectionCard>

      <SectionCard title="Bookings by status" subtitle="Created in this period">
        <BookingsBreakdown bookings={data.bookings} />
      </SectionCard>

      <p className="text-xs text-gray-400">
        Beds and rooms show the situation right now. Money and bookings follow the date range you picked.
      </p>
    </div>
  );
}