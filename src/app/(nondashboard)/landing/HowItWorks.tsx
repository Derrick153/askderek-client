"use client";

import React from "react";
import Link from "next/link";
import { Search, MessageCircle, Eye, KeyRound, ArrowRight } from "lucide-react";

/* ─────────────────────────────────────────────
   STEPS CONFIG
───────────────────────────────────────────── */
const STEPS = [
  {
    number:      "1",
    icon:        Search,
    label:       "Search",
    description: "Find what you need",
    color:       "bg-orange-100 text-orange-600",
    line:        true,
  },
  {
    number:      "2",
    icon:        MessageCircle,
    label:       "Contact",
    description: "Talk to the owner",
    color:       "bg-blue-100 text-blue-600",
    line:        true,
  },
  {
    number:      "3",
    icon:        Eye,
    label:       "Visit",
    description: "View the property",
    color:       "bg-green-100 text-green-600",
    line:        true,
  },
  {
    number:      "4",
    icon:        KeyRound,
    label:       "Move In",
    description: "Pay & settle",
    color:       "bg-purple-100 text-purple-600",
    line:        false,
  },
] as const;

/* ─────────────────────────────────────────────
   HOW IT WORKS
   Replaces the steps inside old DiscoverSection
   Place at: src/app/(nondashboard)/landing/HowItWorks.tsx
   Import in page.tsx after TrustBar
───────────────────────────────────────────── */
export default function HowItWorks() {
  return (
    <section className="py-14 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="text-center mb-12">
          <p className="text-[12px] font-bold text-orange-600 uppercase tracking-widest mb-1">
            How It Works
          </p>
          <h2 className="text-[26px] sm:text-[30px] font-extrabold text-gray-900 tracking-tight">
            Find Your Home in 4 Simple Steps
          </h2>
        </div>

        {/* ── Steps ── */}
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-center gap-0">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <React.Fragment key={step.number}>
                {/* Step */}
                <div className="flex flex-col items-center text-center w-full sm:w-[180px] flex-shrink-0 px-2">
                  {/* Circle */}
                  <div className={`w-14 h-14 rounded-full ${step.color} flex items-center justify-center mb-3 relative`}>
                    <Icon className="w-6 h-6" />
                    {/* Number badge */}
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-600 text-white text-[10px] font-extrabold flex items-center justify-center">
                      {step.number}
                    </span>
                  </div>
                  <p className="text-[15px] font-extrabold text-gray-900 leading-tight mb-1">
                    {step.label}
                  </p>
                  <p className="text-[12px] text-gray-500">
                    {step.description}
                  </p>
                </div>

                {/* Connector line — desktop only */}
                {step.line && (
                  <div className="hidden sm:flex items-center flex-1 min-w-[24px] max-w-[60px] mt-[-28px]">
                    <div className="w-full h-[2px] bg-gray-200 relative">
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gray-300" />
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── CTA ── */}
        <div className="mt-12 text-center">
          <Link
            href="/search"
            className="
              inline-flex items-center gap-2
              h-12 px-8
              bg-orange-600 hover:bg-orange-700
              text-white text-[14px] font-bold
              rounded-xl transition-colors duration-150
              shadow-sm shadow-orange-200
            "
          >
            Start Searching Now
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </section>
  );
}