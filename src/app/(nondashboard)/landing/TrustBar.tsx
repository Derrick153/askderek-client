"use client";

import React from "react";
import { ShieldCheck, Phone, Lock, Headphones } from "lucide-react";

/* ─────────────────────────────────────────────
   TRUST ITEMS CONFIG
───────────────────────────────────────────── */
const TRUST_ITEMS = [
  {
    icon:        ShieldCheck,
    iconColor:   "text-green-600",
    iconBg:      "bg-green-50",
    label:       "Verified Listings",
    description: "No fake ads",
  },
  {
    icon:        Phone,
    iconColor:   "text-blue-600",
    iconBg:      "bg-blue-50",
    label:       "Direct Contact",
    description: "Chat with owners",
  },
  {
    icon:        Lock,
    iconColor:   "text-orange-600",
    iconBg:      "bg-orange-50",
    label:       "Secure & Safe",
    description: "Trusted platform",
  },
  {
    icon:        Headphones,
    iconColor:   "text-purple-600",
    iconBg:      "bg-purple-50",
    label:       "24/7 Support",
    description: "We're here to help",
  },
] as const;

/* ─────────────────────────────────────────────
   TRUST BAR
   Place at: src/app/(nondashboard)/landing/TrustBar.tsx
   Import in page.tsx after RecentlyAdded
───────────────────────────────────────────── */
export default function TrustBar() {
  return (
    <section className="py-10 px-4 sm:px-6 lg:px-8 bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {TRUST_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100"
              >
                <div className={`w-10 h-10 rounded-lg ${item.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${item.iconColor}`} />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-gray-900 leading-tight">
                    {item.label}
                  </p>
                  <p className="text-[11px] text-gray-500 leading-tight mt-0.5">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}