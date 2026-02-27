"use client";

import { NAVBAR_HEIGHT } from "@/lib/constants";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { usePathname, useRouter } from "next/navigation";
import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { SidebarTrigger } from "./ui/sidebar";

/* ─────────────────────────────────────────────
   AD LOGO
───────────────────────────────────────────── */
const ADLogo = () => (
  <svg
    width="38"
    height="38"
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="AskDerek"
    className="flex-shrink-0"
  >
    <rect width="40" height="40" rx="10" fill="#EA580C" />
    <path
      d="M13 27L20 11L27 27"
      stroke="white"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1="15.5" y1="22"
      x2="24.5" y2="22"
      stroke="white"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <path
      d="M22 14H26C28.2 14 30 15.8 30 18V22C30 24.2 28.2 26 26 26H22V14Z"
      fill="white"
      fillOpacity="0.2"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

/* ─────────────────────────────────────────────
   ROLLING TICKER
   Akwaban = Welcome in Akan (Twi)
───────────────────────────────────────────── */
const MESSAGES = [
  "Akwaban — Welcome to AskDerek",
  "Your Home in Tarkwa Starts Here",
  "Real Homes. Real Owners. Real Ghana.",
  "Find Your Place. No Stress. No Scams.",
];

const RollingTicker = () => {
  const [index, setIndex] = useState(0);
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setShow(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % MESSAGES.length);
        setShow(true);
      }, 350);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden md:flex items-center gap-2 overflow-hidden max-w-xs lg:max-w-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0 animate-pulse" />
      <span
        className="text-[11px] font-semibold text-slate-400 whitespace-nowrap truncate"
        style={{
          opacity: show ? 1 : 0,
          transform: show ? "translateY(0)" : "translateY(-5px)",
          transition: "opacity 0.3s ease, transform 0.3s ease",
        }}
      >
        {MESSAGES[index]}
      </span>
    </div>
  );
};

/* ─────────────────────────────────────────────
   NAVBAR
───────────────────────────────────────────── */
const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();

  const isDashboard =
    pathname.includes("/managers") || pathname.includes("/tenants");

  const dashboardHref =
    (user?.unsafeMetadata?.userType as string) === "manager"
      ? "/managers/properties"
      : "/tenants/applications";

  return (
    <nav
      className="fixed top-0 left-0 w-full z-[100] border-b border-white/[0.06] bg-slate-950/90 backdrop-blur-xl"
      style={{ height: `${NAVBAR_HEIGHT}px` }}
    >
      <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-4">

        {/* LEFT */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {isDashboard && (
            <div className="md:hidden border-r border-white/10 pr-3">
              <SidebarTrigger className="text-white hover:bg-white/10 transition-colors rounded-lg p-1" />
            </div>
          )}
          <Link
            href="/"
            scroll={false}
            className="flex items-center gap-2.5 hover:opacity-85 transition-opacity"
          >
            <ADLogo />
            <div className="flex flex-col leading-none">
              <span className="text-[8px] font-black text-orange-500 tracking-[0.4em] uppercase">
                Ghana
              </span>
              <span className="text-[18px] sm:text-[20px] font-black text-white tracking-tight leading-none uppercase">
                ASK<span className="text-orange-500 italic">DEREK</span>
              </span>
            </div>
          </Link>
        </div>

        {/* CENTER */}
        {!isDashboard && <RollingTicker />}

        {/* RIGHT */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <SignedOut>
            <SignInButton mode="modal">
              <Button className="h-9 px-5 sm:px-6 bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-black uppercase tracking-widest rounded-lg border-b-2 border-orange-700 active:border-b-0 active:translate-y-px transition-all duration-150 shadow-md shadow-orange-950/40">
                Sign In
              </Button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <div className="flex items-center gap-3 pl-3 border-l border-white/10">
              <button
                onClick={() => router.push(dashboardHref)}
                className="hidden sm:block text-[10px] font-black text-slate-500 hover:text-orange-500 uppercase tracking-widest transition-colors duration-150"
              >
                Dashboard
              </button>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox:
                      "h-9 w-9 ring-2 ring-orange-500/20 hover:ring-orange-500/60 transition-all rounded-lg",
                    userButtonPopoverCard:
                      "bg-slate-900 border border-white/10 shadow-2xl",
                  },
                }}
              />
            </div>
          </SignedIn>
        </div>

      </div>
    </nav>
  );
};

export default Navbar;