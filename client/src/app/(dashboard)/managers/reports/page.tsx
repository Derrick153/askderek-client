"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useUser } from "@clerk/nextjs";
import {
  useGetManagerPropertiesQuery,
  useGetReportingOverviewQuery,
  useGetReportingTrendsQuery,
  useGetReportingHostelQuery,
  useGetReportingAttentionQuery,
  useGetReportingAnomaliesQuery,
  askReportsFresh,
} from "@/state/api";
import type { ReportingOverview, ReportingTrends } from "@/state/api";
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
  OccupancyLine,
  SectionCard,
  SimpleBars,
  StatTile,
  TrendColumns,
} from "@/components/reports/ReportParts";
import {
  CHART_COLORS,
  RANGE_PRESETS,
  formatDate,
  formatMoney,
  formatPercent,
  rangeForPreset,
} from "@/components/reports/reportHelpers";
import RecordsPanel, { RecordsLink } from "@/components/reports/RecordsPanel";
import type { RecordsRequest } from "@/components/reports/RecordsPanel";
import { HostelInsights } from "@/components/reports/HostelInsights";
import AttentionCenter from "@/components/reports/AttentionCenter";
import UnusualChanges from "@/components/reports/UnusualChanges";
import ExportMenu from "@/components/reports/ExportMenu";
import SavedReportsMenu from "@/components/reports/SavedReportsMenu";
import type { SavedReport } from "@/state/savedReportsApi";
import { FreshnessBar, SnapshotNote } from "@/components/reports/FreshnessBar";

// ---------------------------------------------------------------------------
// Step 19 - Executive Overview + Trends for managers.
// All numbers come from the server (GET /api/reports/overview and /trends);
// this page only displays them. Beds and rooms are a live snapshot; money and
// bookings follow the selected date range.
// ---------------------------------------------------------------------------

type Granularity = "day" | "week" | "month";

export default function ManagerReportsPage() {
  const { user } = useUser();
  const [preset, setPreset] = useState("30d");
  const [propertyId, setPropertyId] = useState<number | null>(null);
  const [granularityChoice, setGranularityChoice] = useState<Granularity | null>(null);
  const [records, setRecords] = useState<RecordsRequest | null>(null);

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

  // What needs attention is requested right after the overview (before trends and hostel insights):
  // it is the part a manager acts on, and it still never hits the free database at the same moment
  // as the other heavy requests.
  const attentionArgs = useMemo(
    () => (propertyId !== null ? { propertyId: propertyId } : { managerClerkId: user?.id }),
    [propertyId, user?.id]
  );
  const {
    data: attention,
    isFetching: attentionFetching,
    isError: attentionError,
    refetch: refetchAttention,
  } = useGetReportingAttentionQuery(attentionArgs, { skip: !user?.id || !data });

  // Saved reports (Phase 12): open a saved view of this page, and tell the menu a property's name.
  const savedPropertyName = (id: number): string | null => {
    const found = properties.find((p: any) => p.id === id);
    return found && typeof found.name === "string" ? found.name : null;
  };
  const applySavedReport = (report: SavedReport): string | null => {
    const wanted = report.filters.propertyId;
    const stillMine = wanted === null || properties.some((p: any) => p.id === wanted);
    setPreset(report.filters.preset);
    setPropertyId(stillMine ? wanted : null);
    if (report.reportType === "overview") {
      setGranularityChoice(report.filters.granularity);
      setRecords(null);
    } else {
      setRecords({
        metric: report.filters.metric,
        status: report.filters.status,
        ay: report.filters.ay,
        semester: report.filters.semester,
        title: report.filters.title,
      });
    }
    return stillMine ? null : "That property is no longer in your list, so all your properties are shown.";
  };

  // Daily for short ranges, weekly for 90 days - unless the manager picks one.
  const granularity: Granularity = granularityChoice ?? (preset === "90d" ? "week" : "day");

  // Trends are requested only after the overview has arrived, so the first load
  // never sends both heavy requests to the database at the same moment.
  const trendArgs = useMemo(() => ({ ...args, granularity }), [args, granularity]);
  const {
    data: trends,
    isFetching: trendsFetching,
    isError: trendsError,
    refetch: refetchTrends,
  } = useGetReportingTrendsQuery(trendArgs, { skip: !user?.id || !data || (!attention && !attentionError) });

  // Hostel insights are requested last (after the overview and trends), so the free database is never asked for all three at once.
  const {
    data: hostel,
    isFetching: hostelFetching,
    isError: hostelError,
    refetch: refetchHostel,
  } = useGetReportingHostelQuery(args, {
    skip: !user?.id || !data || (!trends && !trendsError),
  });

  // Unusual changes are requested last: they add the most database work, so they wait until the
  // overview, attention list, trends and hostel insights are all in (or have failed).
  const {
    data: anomalies,
    isFetching: anomaliesFetching,
    isError: anomaliesError,
    refetch: refetchAnomalies,
  } = useGetReportingAnomaliesQuery(attentionArgs, {
    skip: !user?.id || !data || (!hostel && !hostelError),
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
        <div className="relative flex flex-wrap items-center gap-2">
          <SavedReportsMenu
            current={{ preset: preset, propertyId: propertyId, granularity: granularityChoice }}
            onApply={applySavedReport}
            propertyName={savedPropertyName}
            disabled={!user?.id || !propertiesRaw}
          />
          <ExportMenu
            range={range}
            scope={propertyId !== null ? { propertyId: propertyId } : { managerClerkId: user?.id }}
            granularity={granularity}
            scopeLabel={scopeLabel}
            disabled={!user?.id}
          />
        <button
          onClick={() => {
            askReportsFresh();
            refetch();
            if (data) refetchTrends();
            if (data) refetchHostel();
            if (data) refetchAttention();
            if (data) refetchAnomalies();
          }}
          disabled={isFetching || !user?.id}
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw className={"w-4 h-4" + (isFetching ? " animate-spin" : "")} />
          Refresh
        </button>
        </div>
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
        <FreshnessBar
          summary={scopeLabel + " | " + formatDate(data.range.from) + " to " + formatDate(data.range.to)}
          stamps={[data.generatedAt, trends?.generatedAt, hostel?.generatedAt, attention?.asOf, anomalies?.asOf]}
          isFetching={isFetching || hostelFetching || attentionFetching || anomaliesFetching}
          onRefresh={() => {
            askReportsFresh();
            refetch();
            if (data) refetchTrends();
            if (data) refetchHostel();
            if (data) refetchAttention();
            if (data) refetchAnomalies();
          }}
        />
      ) : null}

      {!(isError && !data) ? (
        <AttentionCenter
          attention={attention}
          isFetching={attentionFetching}
          isError={attentionError}
          waiting={!data}
          onRetry={() => refetchAttention()}
        />
      ) : null}

      {!(isError && !data) ? (
        <UnusualChanges
          anomalies={anomalies}
          isFetching={anomaliesFetching}
          isError={anomaliesError}
          waiting={!data || (!hostel && !hostelError)}
          onRetry={() => refetchAnomalies()}
        />
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

      {data ? (
        <ReportBody onOpen={setRecords} data={data}
          isFetching={isFetching}
          hostelSection={<HostelInsights hostel={hostel} isFetching={hostelFetching} isError={hostelError} onRetry={() => refetchHostel()} onOpen={setRecords} />}
        trendsSection={
            <TrendsSection
              trends={trends}
              isFetching={trendsFetching}
              isError={trendsError}
              granularity={granularity}
              onGranularityChange={setGranularityChoice}
              onRetry={() => refetchTrends()}
            />
          }
        />
      ) : null}

      {records ? (
        <RecordsPanel
          key={JSON.stringify(records)}
          request={records}
          scope={propertyId !== null ? { propertyId: propertyId } : { managerClerkId: user?.id }}
          range={range}
          preset={preset}
          onClose={() => setRecords(null)}
        />
      ) : null}
    </div>
  );
}

const GRANULARITIES: { key: Granularity; label: string }[] = [
  { key: "day", label: "Daily" },
  { key: "week", label: "Weekly" },
  { key: "month", label: "Monthly" },
];

function TrendsSection({
  trends,
  isFetching,
  isError,
  granularity,
  onGranularityChange,
  onRetry,
}: {
  trends: ReportingTrends | undefined;
  isFetching: boolean;
  isError: boolean;
  granularity: Granularity;
  onGranularityChange: (g: Granularity) => void;
  onRetry: () => void;
}) {
  // One colour per product, the same in every chart: Hostel blue, Short stay orange, Rent / lease green.
  const moneySeries = [
    { key: "moneyHostel", label: "Hostel", color: CHART_COLORS.blue },
    { key: "moneyRent", label: "Rent", color: CHART_COLORS.aqua },
  ];
  const bookingSeries = [
    { key: "bookingsHostel", label: "Hostel", color: CHART_COLORS.blue },
    { key: "bookingsShortStay", label: "Short stay", color: CHART_COLORS.orange },
    { key: "bookingsLease", label: "Rental lease", color: CHART_COLORS.aqua },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Trends</h2>
          <p className="text-sm text-gray-500">How things moved over the period you picked</p>
        </div>
        <div className="flex gap-2">
          {GRANULARITIES.map((g) => (
            <button
              key={g.key}
              onClick={() => onGranularityChange(g.key)}
              aria-pressed={granularity === g.key}
              className={
                "h-9 px-3 rounded-full text-sm font-medium border " +
                (granularity === g.key
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50")
              }
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {isError && !trends ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">The trends could not be loaded</p>
            <p className="text-sm text-red-700 mt-0.5">The rest of the report is fine. Try again in a moment.</p>
            <button onClick={onRetry} className="mt-3 text-sm font-medium text-red-800 underline">
              Try again
            </button>
          </div>
        </div>
      ) : null}

      {!trends && !isError ? <div className="animate-pulse bg-gray-200 rounded-2xl h-64" /> : null}

      {trends ? (
        <div className={"space-y-3 transition-opacity " + (isFetching ? "opacity-60" : "opacity-100")}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title="Money collected over time" subtitle="Received, by product">
              <TrendColumns data={trends.buckets} series={moneySeries} granularity={trends.granularity} money />
            </SectionCard>
            <SectionCard title="New bookings over time" subtitle="Created in each period">
              <TrendColumns data={trends.buckets} series={bookingSeries} granularity={trends.granularity} />
            </SectionCard>
            <div className="lg:col-span-2">
              <SectionCard title="Occupancy over time" subtitle="Share of beds occupied, from the nightly bed snapshots">
                <OccupancyLine points={trends.occupancy} />
                <SnapshotNote points={trends.occupancy} rangeTo={trends.range.to} />
              </SectionCard>
            </div>
          </div>
          {trends.granularity !== "day" ? (
            <p className="text-xs text-gray-400">
              The first and last bars can cover only part of a week or month.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function ReportBody({
  data,
  isFetching,
  trendsSection,
  hostelSection,
  onOpen,
}: {
  data: ReportingOverview;
  isFetching: boolean;
  trendsSection: ReactNode;
  hostelSection: ReactNode;
  onOpen: (request: RecordsRequest) => void;
}) {
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
    { label: "Received", value: rev.received, metric: "received" },
    { label: "Still owed (rent and fees)", value: rev.outstandingBreakdown.ledger, metric: "outstanding_ledger" },
    { label: "Approved hostel bookings not yet paid", value: rev.outstandingBreakdown.hostelAwaitingPayment, metric: "outstanding_hostel" },
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
          onClick={occ.occupied > 0 ? () => onOpen({ metric: "beds", status: "OCCUPIED", title: "Occupied beds" }) : undefined}
        />
        <StatTile icon={DollarSign} label="Money received" value={formatMoney(rev.received)} hint="Collected in this period" onClick={rev.received > 0 ? () => onOpen({ metric: "received", title: "Money received" }) : undefined} />
        <StatTile icon={Clock} label="Still owed" value={formatMoney(rev.outstanding)} hint="Unpaid right now" />
        <StatTile icon={CheckCircle2} label="Collection rate" value={formatPercent(data.collectionRate)} hint="Of the money that fell due" />
        <StatTile icon={CalendarCheck} label="New bookings" value={String(data.bookings.total)} hint="Hostel, short stay and lease" />
        <StatTile icon={BedDouble} label="Total beds" value={String(occ.totalBeds)} hint={occ.available + " available now"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Beds right now" subtitle="A live snapshot, not changed by the date range">
          <BedStatusBar occupancy={occ} />
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {occ.occupied > 0 ? <RecordsLink onClick={() => onOpen({ metric: "beds", status: "OCCUPIED", title: "Occupied beds" })}>See occupied</RecordsLink> : null}
            {occ.reserved > 0 ? <RecordsLink onClick={() => onOpen({ metric: "beds", status: "RESERVED", title: "Reserved beds" })}>See reserved</RecordsLink> : null}
            {occ.available > 0 ? <RecordsLink onClick={() => onOpen({ metric: "beds", status: "AVAILABLE", title: "Available beds" })}>See available</RecordsLink> : null}
            {occ.maintenance > 0 ? <RecordsLink onClick={() => onOpen({ metric: "beds", status: "MAINTENANCE", title: "Beds in maintenance" })}>See maintenance</RecordsLink> : null}
          </div>
        </SectionCard>

        <SectionCard title="Money collected" subtitle="Received in this period, by product">
          <SimpleBars data={moneyChart} money />
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {rev.receivedByProduct.hostel > 0 ? <RecordsLink onClick={() => onOpen({ metric: "received_hostel", title: "Money received - hostel" })}>See hostel payments</RecordsLink> : null}
            {rev.receivedByProduct.rent > 0 ? <RecordsLink onClick={() => onOpen({ metric: "received_rent", title: "Money received - rent" })}>See rent payments</RecordsLink> : null}
          </div>
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
              <div
                key={row.label}
                className={"flex items-baseline justify-between gap-3 text-sm" + (row.metric ? " cursor-pointer rounded-lg -mx-2 px-2 py-1.5 hover:bg-gray-50" : "")}
                role={row.metric ? "button" : undefined}
                tabIndex={row.metric ? 0 : undefined}
                onClick={row.metric ? () => onOpen({ metric: row.metric as string, title: row.label }) : undefined}
                onKeyDown={
                  row.metric
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onOpen({ metric: row.metric as string, title: row.label });
                        }
                      }
                    : undefined
                }
              >
                <dt className="text-gray-600">{row.label}</dt>
                <dd className="font-semibold text-gray-900 shrink-0">{formatMoney(row.value)}{row.metric ? <span className="ml-1 text-blue-600">{"\u203A"}</span> : null}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>
      </div>

      {trendsSection}
      {hostelSection}

      <SectionCard title="Approvals and cancellations" subtitle="Requests that were decided and bookings that fell through, in this period">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <Meter
              label="Hostel approval rate"
              rate={appr.hostel.rate}
              detail={appr.hostel.decided === 0 ? "No decisions in this period" : appr.hostel.approved + " approved, " + appr.hostel.rejected + " rejected"}
            />
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {appr.hostel.approved > 0 ? <RecordsLink onClick={() => onOpen({ metric: "approvals_hostel_approved", title: "Hostel bookings approved" })}>See approved</RecordsLink> : null}
              {appr.hostel.rejected > 0 ? <RecordsLink onClick={() => onOpen({ metric: "approvals_hostel_rejected", title: "Hostel bookings rejected" })}>See rejected</RecordsLink> : null}
            </div>
          </div>
          <div>
            <Meter
              label="Lease application approval rate"
              rate={appr.leaseApplication.rate}
              detail={appr.leaseApplication.decided === 0 ? "No decisions in this period" : appr.leaseApplication.approved + " approved, " + appr.leaseApplication.denied + " denied"}
            />
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {appr.leaseApplication.approved > 0 ? <RecordsLink onClick={() => onOpen({ metric: "approvals_application_approved", title: "Lease applications approved" })}>See approved</RecordsLink> : null}
              {appr.leaseApplication.denied > 0 ? <RecordsLink onClick={() => onOpen({ metric: "approvals_application_denied", title: "Lease applications denied" })}>See denied</RecordsLink> : null}
            </div>
          </div>
          <div>
            <Meter
              label="Hostel cancellation rate"
              rate={canc.hostel.rate}
              detail={canc.hostel.total === 0 ? "No hostel bookings in this period" : canc.hostel.cancelled + " of " + canc.hostel.total + " cancelled"}
            />
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {canc.hostel.cancelled > 0 ? <RecordsLink onClick={() => onOpen({ metric: "bookings_hostel", status: "CANCELLED", title: "Hostel bookings cancelled" })}>See cancelled</RecordsLink> : null}
            </div>
          </div>
          <div>
            <Meter
              label="Short-stay cancellation rate"
              rate={canc.shortStay.rate}
              detail={canc.shortStay.total === 0 ? "No short-stay bookings in this period" : canc.shortStay.cancelled + " of " + canc.shortStay.total + " cancelled"}
            />
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {canc.shortStay.cancelled > 0 ? <RecordsLink onClick={() => onOpen({ metric: "bookings_short_stay", status: "CANCELLED", title: "Short-stay bookings cancelled" })}>See cancelled</RecordsLink> : null}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Bookings by status" subtitle="Created in this period">
        <BookingsBreakdown bookings={data.bookings} onOpen={onOpen} />
      </SectionCard>

      <p className="text-xs text-gray-400">
        Beds and rooms show the situation right now. Money and bookings follow the date range you picked. Tap a figure or a See link to open the records behind it.
      </p>
    </div>
  );
}