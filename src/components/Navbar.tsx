"use client";

import { NAVBAR_HEIGHT } from "@/lib/constants";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { SidebarTrigger } from "./ui/sidebar";
import { Heart, Plus, Menu, X } from "lucide-react";

/* ─────────────────────────────────────────────
   LOGO — preserves the "AD" monogram from the
   original design (the A-frame + D silhouette)
───────────────────────────────────────────── */
const ADLogo = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className="flex-shrink-0"
  >
    <rect width="40" height="40" rx="10" fill="#C2410C" />
    {/* A-frame */}
    <path
      d="M13 27L20 11L27 27"
      stroke="white"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1="15.5"
      y1="22"
      x2="24.5"
      y2="22"
      stroke="white"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    {/* D silhouette */}
    <path
      d="M22 14H26C28.2 14 30 15.8 30 18V22C30 24.2 28.2 26 26 26H22V14Z"
      fill="white"
      fillOpacity="0.22"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

/* ─────────────────────────────────────────────
   NAV LINKS
───────────────────────────────────────────── */
const NAV_LINKS = [
  { label: "Rent",       href: "/search?type=rent" },
  { label: "Sale",       href: "/search?type=sale" },
  { label: "Short Stay", href: "/search?type=shortStay" },
  { label: "Land",       href: "/search?type=land" },
] as const;

/* ─────────────────────────────────────────────
   ANIMATED UNDERLINE INDICATOR
   Tracks the active nav link with a sliding
   pill using a ResizeObserver — zero layout
   thrash, silky 60 fps.
───────────────────────────────────────────── */
type NavItem = { label: string; href: string };

function NavLinks({
  links,
  dashboardHref,
  isDashboard,
  pathname,
}: {
  links: readonly NavItem[];
  dashboardHref: string;
  isDashboard: boolean;
  pathname: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef    = useRef<HTMLAnchorElement | null>(null);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  const updatePill = () => {
    if (!activeRef.current || !containerRef.current) {
      setPill(null);
      return;
    }
    const cRect = containerRef.current.getBoundingClientRect();
    const aRect = activeRef.current.getBoundingClientRect();
    setPill({ left: aRect.left - cRect.left, width: aRect.width });
  };

  useEffect(() => {
    updatePill();
    const ro = new ResizeObserver(updatePill);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [pathname]);

  const isLinkActive = (href: string) =>
    pathname.startsWith(href.split("?")[0]) &&
    (href.includes("?") ? pathname.includes(href.split("?")[1]) : true);

  const isDashActive = isDashboard;

  return (
    <div ref={containerRef} className="relative hidden md:flex items-center gap-1">
      {/* sliding pill */}
      {pill && (
        <span
          aria-hidden="true"
          className="absolute top-0 bottom-0 bg-orange-50 rounded-lg transition-all duration-200 ease-out"
          style={{ left: pill.left, width: pill.width }}
        />
      )}

      {links.map((link) => {
        const active = isLinkActive(link.href);
        return (
          <Link
            key={link.label}
            href={link.href}
            ref={active ? (el) => { activeRef.current = el; } : undefined}
            className={`relative z-10 px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors duration-150 ${
              active
                ? "text-orange-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {link.label}
          </Link>
        );
      })}

      <SignedIn>
        <Link
          href={dashboardHref}
          ref={isDashActive ? (el) => { activeRef.current = el; } : undefined}
          className={`relative z-10 px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors duration-150 ${
            isDashActive
              ? "text-orange-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Dashboard
        </Link>
      </SignedIn>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN NAVBAR
───────────────────────────────────────────── */
const Navbar = () => {
  const pathname = usePathname();
  const { user } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled,   setScrolled]   = useState(false);

  const isDashboard =
    pathname.includes("/managers") ||
    pathname.includes("/tenants")  ||
    pathname.includes("/admin");

  const dashboardHref =
    (user?.unsafeMetadata?.userType as string) === "manager"
      ? "/managers/properties"
      : "/tenants/applications";

  /* Scroll shadow */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Close mobile on route change */
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  /* Prevent body scroll when mobile menu is open */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      {/* ── NAVBAR BAR ── */}
      <nav
        className={`
          fixed top-0 left-0 w-full z-[100]
          bg-white/95 backdrop-blur-md
          transition-shadow duration-200
          ${scrolled ? "shadow-[0_1px_12px_rgba(0,0,0,0.08)]" : "border-b border-gray-100"}
        `}
        style={{ height: `${NAVBAR_HEIGHT}px` }}
      >
        <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">

          {/* ── LEFT: Logo ── */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {isDashboard && (
              <div className="md:hidden border-r border-gray-200 pr-3 mr-1">
                <SidebarTrigger className="text-gray-500 hover:bg-gray-100 rounded-lg p-1 transition-colors" />
              </div>
            )}
            <Link
              href="/"
              scroll={false}
              className="flex items-center gap-2.5 hover:opacity-90 transition-opacity group"
            >
              <ADLogo />
              <span className="text-[18px] font-extrabold tracking-tight text-gray-900 leading-none">
                Ask<span className="text-orange-600">Derek</span>
              </span>
            </Link>
          </div>

          {/* ── CENTER: Nav links ── */}
          {!isDashboard && (
            <NavLinks
              links={NAV_LINKS}
              dashboardHref={dashboardHref}
              isDashboard={isDashboard}
              pathname={pathname}
            />
          )}

          {/* ── RIGHT: Actions ── */}
          <div className="flex items-center gap-1.5 flex-shrink-0">

            {/* Wishlist */}
            <SignedIn>
              <Link
                href="/tenants/favorites"
                className="
                  hidden sm:flex items-center justify-center
                  w-9 h-9 rounded-lg
                  text-gray-500 hover:text-orange-600 hover:bg-orange-50
                  transition-colors duration-150
                "
                aria-label="Saved properties"
              >
                <Heart className="w-[18px] h-[18px]" strokeWidth={2} />
              </Link>
            </SignedIn>

            {/* Post Property CTA */}
            <SignedIn>
              <Link
                href="/managers/newproperty"
                className="
                  hidden sm:flex items-center gap-1.5
                  h-9 px-4
                  bg-orange-600 hover:bg-orange-700 active:bg-orange-800
                  text-white text-[12px] font-bold
                  rounded-lg
                  shadow-sm shadow-orange-200/80
                  transition-all duration-150
                  hover:shadow-md hover:shadow-orange-200
                  hover:-translate-y-px active:translate-y-0
                "
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                Post Property
              </Link>
            </SignedIn>

            {/* Sign In */}
            <SignedOut>
              <SignInButton mode="modal">
                <button className="
                  h-9 px-5
                  bg-orange-600 hover:bg-orange-700 active:bg-orange-800
                  text-white text-[12px] font-bold
                  rounded-lg
                  shadow-sm shadow-orange-200/80
                  transition-all duration-150
                  hover:shadow-md hover:shadow-orange-200
                  hover:-translate-y-px active:translate-y-0
                ">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>

            {/* Avatar */}
            <SignedIn>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox:
                      "h-9 w-9 ring-2 ring-transparent hover:ring-orange-200 transition-all duration-150 rounded-lg",
                    userButtonPopoverCard:
                      "shadow-xl border border-gray-100 rounded-xl",
                    userButtonPopoverActionButton:
                      "rounded-lg text-[13px]",
                  },
                }}
              />
            </SignedIn>

            {/* Mobile toggle */}
            {!isDashboard && (
              <button
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
                className="
                  md:hidden flex items-center justify-center
                  w-9 h-9 ml-0.5 rounded-lg
                  text-gray-600 hover:bg-gray-100
                  transition-colors duration-150
                "
                onClick={() => setMobileOpen((v) => !v)}
              >
                {mobileOpen
                  ? <X  className="w-5 h-5" />
                  : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── MOBILE MENU ── */}
      {!isDashboard && (
        <>
          {/* Backdrop */}
          <div
            aria-hidden="true"
            className={`
              fixed inset-0 z-[98] bg-black/30 md:hidden
              transition-opacity duration-200
              ${mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
            `}
            onClick={() => setMobileOpen(false)}
          />

          {/* Panel */}
          <div
            className={`
              fixed top-0 left-0 right-0 z-[99]
              bg-white shadow-xl pb-5 px-4 md:hidden
              transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
              ${mobileOpen ? "translate-y-0" : "-translate-y-full"}
            `}
            style={{ paddingTop: `${NAVBAR_HEIGHT + 8}px` }}
          >
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => {
                const active =
                  pathname.startsWith(link.href.split("?")[0]) &&
                  (link.href.includes("?")
                    ? pathname.includes(link.href.split("?")[1])
                    : true);
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    className={`
                      px-4 py-3 rounded-xl text-[14px] font-semibold transition-colors
                      ${active
                        ? "bg-orange-50 text-orange-600"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"}
                    `}
                  >
                    {link.label}
                  </Link>
                );
              })}

              <SignedIn>
                <Link
                  href={dashboardHref}
                  className="px-4 py-3 rounded-xl text-[14px] font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/tenants/favorites"
                  className="px-4 py-3 rounded-xl text-[14px] font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  Saved Properties
                </Link>

                <div className="h-px bg-gray-100 my-1" />

                <Link
                  href="/managers/newproperty"
                  className="
                    flex items-center justify-center gap-2
                    h-11 bg-orange-600 hover:bg-orange-700
                    text-white text-[13px] font-bold
                    rounded-xl transition-colors shadow-sm
                  "
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  Post Property
                </Link>
              </SignedIn>

              <SignedOut>
                <div className="h-px bg-gray-100 my-1" />
                <SignInButton mode="modal">
                  <button className="
                    w-full h-11
                    bg-orange-600 hover:bg-orange-700
                    text-white text-[13px] font-bold
                    rounded-xl transition-colors shadow-sm
                  ">
                    Sign In
                  </button>
                </SignInButton>
              </SignedOut>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Navbar;