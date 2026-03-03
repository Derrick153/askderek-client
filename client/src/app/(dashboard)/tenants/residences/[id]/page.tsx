"use client";

import { useUser } from "@clerk/nextjs";
import {
  useGetPropertyQuery,
  useGetPropertyLeasesQuery,
  useGetPaymentsQuery,
  useInitializePaymentMutation,
} from "@/state/api";
import { Lease, Payment } from "@/types/prismaTypes";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { format, differenceInDays } from "date-fns";
import {
  MapPin, MessageCircle, Phone, Download,
  ChevronRight, CreditCard, Home, ArrowLeft,
} from "lucide-react";

// ─── STATUS DOT ───────────────────────────────────────────────────────────────
function StatusDot({ status }: { status: string }) {
  const map: Record<string, { dot: string; label: string }> = {
    Paid:          { dot: "bg-emerald-500", label: "Paid" },
    Pending:       { dot: "bg-amber-400",   label: "Pending" },
    Overdue:       { dot: "bg-red-500",     label: "Overdue" },
    PartiallyPaid: { dot: "bg-orange-400",  label: "Partial" },
  };
  const c = map[status] || { dot: "bg-gray-400", label: status };
  return (
    <span className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
      <span className="text-sm font-semibold text-gray-700">{c.label}</span>
    </span>
  );
}

// ─── PAYMENT DETAIL MODAL ─────────────────────────────────────────────────────
function PaymentDetailModal({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const headerColor =
    payment.paymentStatus === "Paid" ? "bg-emerald-500" :
    payment.paymentStatus === "Overdue" ? "bg-red-500" : "bg-amber-400";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className={`px-6 py-5 ${headerColor}`}>
          <p className="text-white/80 text-xs font-black tracking-widest uppercase mb-1">Invoice #{payment.id}</p>
          <p className="text-white text-4xl font-black">GH₵{payment.amountDue?.toLocaleString()}</p>
          <p className="text-white/80 text-sm mt-1">Due {format(new Date(payment.dueDate), "MMMM dd, yyyy")}</p>
        </div>

        <div className="px-6 py-5 space-y-0 divide-y divide-gray-100">
          {[
            ["Status", payment.paymentStatus],
            ["Amount Due", `GH₵${payment.amountDue?.toLocaleString()}`],
            ["Amount Paid", `GH₵${payment.amountPaid?.toLocaleString() || "0"}`],
            ["Due Date", format(new Date(payment.dueDate), "MMM dd, yyyy")],
            ...(payment.paymentDate ? [["Paid On", format(new Date(payment.paymentDate), "MMM dd, yyyy")]] : []),
            ...(payment.paystackReference ? [["Reference", payment.paystackReference]] : []),
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between py-3">
              <span className="text-sm text-gray-500">{label}</span>
              <span className="text-sm font-black text-gray-900">{value}</span>
            </div>
          ))}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold text-sm transition-all">
            Close
          </button>
          <button className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all">
            <Download className="w-4 h-4" />Receipt
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PAYMENT METHOD BUTTON ────────────────────────────────────────────────────
function PayMethod({ label, sub, border, onClick, loading }: {
  label: string; sub: string; border: string; onClick: () => void; loading: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex-1 min-w-[130px] border-2 ${border} bg-white rounded-2xl px-3 py-4 flex flex-col items-center gap-1 hover:shadow-md active:scale-95 transition-all disabled:opacity-50`}
    >
      {loading
        ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        : <span className="text-sm font-black text-gray-800">{label}</span>
      }
      <span className="text-[11px] text-gray-400 font-medium">{sub}</span>
    </button>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function ResidencePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const { data: property, isLoading: propLoading } = useGetPropertyQuery(Number(id));
  const { data: leases, isLoading: leasesLoading } = useGetPropertyLeasesQuery(Number(id));

  // ✅ FIXED: Clerk user.id — replaces broken cognitoInfo
  const currentLease = leases?.find((l: Lease) => l.tenantClerkId === user?.id) ?? leases?.[0];

  const { data: payments, isLoading: paymentsLoading } = useGetPaymentsQuery(
    currentLease?.id ?? 0,
    { skip: !currentLease?.id }
  );

  const [initializePayment] = useInitializePaymentMutation();

  const handlePay = async () => {
    if (!currentLease || !user?.primaryEmailAddress?.emailAddress) return;
    setPayLoading(true);
    setPayError(null);
    try {
      const result = await initializePayment({
        leaseId: currentLease.id,
        amount: currentLease.rent,
        email: user.primaryEmailAddress.emailAddress,
      }).unwrap();
      if (result.data?.authorization_url) {
        window.location.href = result.data.authorization_url;
      } else {
        throw new Error("No payment URL received");
      }
    } catch (err: any) {
      setPayError(err?.data?.message || "Payment failed. Try again.");
      setPayLoading(false);
    }
  };

  if (!isLoaded || propLoading || leasesLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    </div>
  );

  const sorted = [...(payments || [])].sort(
    (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
  );
  const daysLeft = currentLease ? differenceInDays(new Date(currentLease.endDate), new Date()) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {selectedPayment && (
        <PaymentDetailModal payment={selectedPayment} onClose={() => setSelectedPayment(null)} />
      )}

      {/* Nav */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-black text-gray-900 truncate">{property?.name || "My Residence"}</h1>
            {property?.location && (
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-orange-500 flex-shrink-0" />
                {property.location.city}, {property.location.state}
              </p>
            )}
          </div>
          {property?.manager && (
            <div className="flex gap-2">
              <a href={`https://wa.me/${property.manager.phoneNumber?.replace(/^0/, "233")}`} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 bg-[#25D366] rounded-lg flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </a>
              <a href={`tel:${property.manager.phoneNumber}`}
                className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Phone className="w-4 h-4 text-white" />
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* Property + Lease Summary */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
          {property?.photoUrls?.[0] && (
            <div className="h-44 relative overflow-hidden">
              <img src={property.photoUrls[0]} alt={property.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-3 left-4 flex gap-2">
                {currentLease && <span className="bg-emerald-500 text-white text-xs font-black px-3 py-1 rounded-full">Active Lease</span>}
                {daysLeft > 0 && daysLeft <= 30 && <span className="bg-orange-500 text-white text-xs font-black px-3 py-1 rounded-full">{daysLeft}d left</span>}
              </div>
            </div>
          )}

          {currentLease ? (
            <div className="p-4 grid grid-cols-2 gap-3">
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3">
                <p className="text-xs text-orange-600 font-bold mb-0.5">Monthly Rent</p>
                <p className="text-xl font-black text-orange-700">GH₵{currentLease.rent?.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3">
                <p className="text-xs text-gray-500 font-bold mb-0.5">Security Deposit</p>
                <p className="text-xl font-black text-gray-800">GH₵{currentLease.deposit?.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3">
                <p className="text-xs text-gray-500 font-bold mb-0.5">Lease Start</p>
                <p className="text-sm font-black text-gray-800">{format(new Date(currentLease.startDate), "MMM dd, yyyy")}</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3">
                <p className="text-xs text-gray-500 font-bold mb-0.5">Lease End</p>
                <p className="text-sm font-black text-gray-800">{format(new Date(currentLease.endDate), "MMM dd, yyyy")}</p>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <Home className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-black text-sm">No active lease</p>
              <p className="text-gray-400 text-xs mt-1">Awaiting landlord approval</p>
            </div>
          )}
        </div>

        {/* ─── PAYMENTS CARD ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Make Payment */}
          <div className="px-5 pt-5 pb-5 border-b border-gray-100">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-black text-gray-900">Make payment</h2>
              <span className="text-xs text-orange-500 font-bold">Show other payment methods</span>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              {currentLease ? `GH₵${currentLease.rent?.toLocaleString()} due monthly · secured by Paystack` : "Get lease approved to enable payments"}
            </p>

            <div className="flex flex-wrap gap-3">
              <PayMethod label="MTN MoMo" sub="Pay now" border="border-yellow-300" onClick={handlePay} loading={payLoading} />
              <PayMethod label="Vodafone" sub="Pay now" border="border-red-300" onClick={handlePay} loading={payLoading} />
              <PayMethod label="Debit Card" sub="Pay now" border="border-blue-300" onClick={handlePay} loading={payLoading} />
              <PayMethod label="Bank" sub="Pay now" border="border-gray-300" onClick={handlePay} loading={payLoading} />
            </div>

            {payError && (
              <p className="mt-3 text-sm text-red-600 font-semibold bg-red-50 border border-red-200 rounded-xl px-4 py-2">
                {payError}
              </p>
            )}
          </div>

          {/* Payment History */}
          <div className="px-5 pt-4 pb-2">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-black text-gray-900">Payments history</h3>
                <p className="text-xs text-gray-400">{sorted.length} transaction{sorted.length !== 1 ? "s" : ""}</p>
              </div>
              <button className="text-xs text-gray-400 hover:text-orange-500 font-bold flex items-center gap-1 transition-colors">
                <Download className="w-3.5 h-3.5" />Download all
              </button>
            </div>

            {/* Column headers */}
            {sorted.length > 0 && (
              <div className="grid grid-cols-4 gap-2 px-1 pb-2">
                {["Status", "Amount", "Date", ""].map((h) => (
                  <p key={h} className="text-[11px] font-black text-gray-400 uppercase tracking-wider">{h}</p>
                ))}
              </div>
            )}
          </div>

          {/* Rows */}
          {sorted.length === 0 ? (
            <div className="py-16 text-center px-5 pb-8">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-700 font-black">No payment history yet</p>
              <p className="text-gray-400 text-sm mt-1">
                {currentLease
                  ? "Tap a payment method above to make your first payment"
                  : "Your payments will appear here once your lease is active"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 pb-2">
              {sorted.map((payment) => (
                <button
                  key={payment.id}
                  onClick={() => setSelectedPayment(payment)}
                  className="w-full grid grid-cols-4 gap-2 items-center px-5 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                >
                  <StatusDot status={payment.paymentStatus} />
                  <span className="text-sm font-black text-gray-900">
                    GH₵{payment.amountDue?.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-500">
                    {format(new Date(payment.dueDate), "dd MMM yyyy")}
                  </span>
                  <span className="flex items-center justify-end gap-0.5 text-xs text-orange-500 font-black">
                    Details<ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Pagination */}
          {sorted.length > 7 && (
            <div className="flex items-center justify-center gap-2 py-4 border-t border-gray-100">
              {[1, 2, 3, 4].map((n) => (
                <button key={n} className={`w-8 h-8 rounded-lg text-sm font-black transition-colors ${n === 1 ? "bg-orange-600 text-white" : "text-gray-400 hover:bg-gray-100"}`}>{n}</button>
              ))}
              <span className="text-gray-400 font-bold">›</span>
            </div>
          )}
        </div>

        {/* Manual MoMo instructions */}
        <div className="bg-orange-50 border border-orange-200 rounded-2xl px-5 py-4">
          <p className="text-sm font-black text-orange-900 mb-2">Paying manually via MoMo?</p>
          <div className="space-y-1.5">
            {[
              "Send to 0558 153 803 · Ask Derek Rentals",
              "Screenshot your payment confirmation",
              "Send to landlord on WhatsApp",
              "Status updates to Paid within 5–10 min",
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-4 h-4 bg-orange-200 text-orange-900 text-[10px] font-black rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-xs text-orange-700 font-semibold">{s}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}