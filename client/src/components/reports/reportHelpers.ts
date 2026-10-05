// Step 19 - small formatting helpers for the Reports pages.
// Pure functions only (no React) so every report screen formats numbers the same way.

const CEDI = "GH\u20B5";

export function formatMoney(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return CEDI + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// 1,284 / 12.9K / 4.2M style - for chart axes and tight spaces.
export function formatCompact(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  const abs = Math.abs(n);
  if (abs >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (abs >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(Math.round(n));
}

// A rate of null means "nothing to measure in this period" - show that, never a fake 0%.
export function formatPercent(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return "No data";
  return Math.round(rate * 1000) / 10 + "%";
}

export const RANGE_PRESETS = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "month", label: "This month" },
];

// Whole days: starts at 00:00 of the first day, ends at 23:59 of today.
export function rangeForPreset(key: string): { from: string; to: string } {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date();
  if (key === "month") {
    from.setDate(1);
  } else {
    const days = key === "7d" ? 7 : key === "90d" ? 90 : 30;
    from.setDate(from.getDate() - (days - 1));
  }
  from.setHours(0, 0, 0, 0);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// "AWAITING_PAYMENT" -> "Awaiting payment"
export function prettyStatus(status: string): string {
  const s = status.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Chart colours: the validated reference palette (light mode). Do not add colours ad hoc.
export const CHART_COLORS = {
  blue: "#2a78d6",
  orange: "#eb6834",
  aqua: "#1baf7a",
  yellow: "#eda100",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  muted: "#898781",
  ink: "#0b0b0b",
  inkSecondary: "#52514e",
};