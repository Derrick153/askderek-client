"use client";

// ─────────────────────────────────────────────────────────────────────────────
//  PaymentStatusBadge.tsx
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  status: string;
}

type StatusKey =
  | "paid"
  | "pending"
  | "overdue"
  | "failed"
  | "expired"
  | "partiallypaid";

const statusConfig: Record<
  StatusKey,
  { label: string; className: string }
> = {
  paid: {
    label: "Paid",
    className: "bg-green-100 text-green-800 border border-green-200",
  },
  pending: {
    label: "Pending",
    className: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  },
  overdue: {
    label: "Overdue",
    className: "bg-red-100 text-red-800 border border-red-200",
  },
  failed: {
    label: "Failed",
    className: "bg-red-100 text-red-800 border border-red-200",
  },
  expired: {
    label: "Expired",
    className: "bg-gray-100 text-gray-600 border border-gray-200",
  },
  partiallypaid: {
    label: "Partial",
    className: "bg-blue-100 text-blue-800 border border-blue-200",
  },
};

export default function PaymentStatusBadge({ status }: Props) {
  // Normalize input (VERY important in real apps)
  const normalized = status.replace(/\s+/g, "").toLowerCase() as StatusKey;

  const config = statusConfig[normalized] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600 border border-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}