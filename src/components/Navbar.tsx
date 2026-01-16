"use client";

import { NAVBAR_HEIGHT } from "@/lib/constants";
import Link from "next/link";
import React from "react";
import { Button } from "./ui/button";
import { usePathname } from "next/navigation";
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { SidebarTrigger } from "./ui/sidebar";

const Navbar = () => {
  const pathname = usePathname();

  const isDashboardPage =
    pathname.includes("/managers") || pathname.includes("/tenants");

  return (
    <div
      className="fixed top-0 left-0 w-full z-50 shadow-2xl border-b border-secondary-500/20"
      style={{ height: `${NAVBAR_HEIGHT}px` }}
    >
      <div className="flex justify-between items-center w-full py-4 px-8 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
        {/* LEFT SECTION - Logo & Actions */}
        <div className="flex items-center gap-6 md:gap-8">
          {isDashboardPage && (
            <div className="md:hidden">
              <SidebarTrigger />
            </div>
          )}

          {/* ASK DEREK LOGO */}
          <Link
            href="/"
            className="cursor-pointer hover:opacity-90 transition-all duration-300"
            scroll={false}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-black text-xl">D</span>
              </div>
              <div className="text-2xl font-black tracking-tight">
                ASK{" "}
                <span className="text-secondary-500 italic font-black">
                  DEREK
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* CENTER SECTION - Tagline */}
        {!isDashboardPage && (
          <p className="text-slate-300 hidden lg:block text-sm font-light italic tracking-wide">
            🇬🇭 Find verified homes in Tarkwa • No agents • No scams
          </p>
        )}

        {/* RIGHT SECTION - User Actions */}
        <div className="flex items-center gap-5">
          <SignedOut>
            <SignInButton mode="modal">
              <Button
                variant="outline"
                className="text-white border-2 border-slate-600 bg-transparent hover:bg-white hover:text-slate-900 rounded-lg font-semibold transition-all duration-300"
              >
                Sign In
              </Button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: "h-10 w-10 ring-2 ring-secondary-500/30 hover:ring-secondary-500/60 transition-all"
                }
              }}
            />
          </SignedIn>
        </div>
      </div>
    </div>
  );
};

export default Navbar;