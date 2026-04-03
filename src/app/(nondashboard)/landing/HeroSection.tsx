"use client";

import Image from "next/image";
import React, { useState, useEffect, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { setFilters } from "@/state";
import { Search, MapPin } from "lucide-react";

// ── CONSTANTS ─────────────────────────────────────────────

const GHANA_REGIONS: { name: string; slug: string }[] = [
  { name: "Greater Accra", slug: "greater-accra" },
  { name: "Ashanti", slug: "ashanti" },
  { name: "Western", slug: "western" },
  { name: "Central", slug: "central" },
  { name: "Eastern", slug: "eastern" },
  { name: "Volta", slug: "volta" },
  { name: "Northern", slug: "northern" },
  { name: "Upper East", slug: "upper-east" },
  { name: "Upper West", slug: "upper-west" },
  { name: "Bono", slug: "bono" },
  { name: "Bono East", slug: "bono-east" },
  { name: "Ahafo", slug: "ahafo" },
  { name: "Western North", slug: "western-north" },
  { name: "Oti", slug: "oti" },
  { name: "North East", slug: "north-east" },
  { name: "Savannah", slug: "savannah" },
];

const AUTO_QUERIES: string[] = [
  "Find verified apartments in Accra…",
  "Search self-contained in Kumasi…",
  "Rooms in Tarkwa — no agents…",
  "Houses in Takoradi, real photos…",
  "Trusted rentals anywhere in Ghana…",
  "2-bedroom in Tema with generator…",
  "Affordable rooms near UMaT…",
];

const TRUST_SIGNALS: string[] = [
  "Location verified",
  "Real photos only",
  "No agent fees",
  "Transparent pricing",
];

// ── TYPEWRITER HOOK ───────────────────────────────────────

function useTypewriter(queries: string[], enabled: boolean) {
  const [placeholder, setPlaceholder] = useState("");
  const [queryIndex, setQueryIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const currentText = queries[queryIndex];

    if (isPaused) {
      const t = setTimeout(() => {
        setIsPaused(false);
        setIsDeleting(true);
      }, 2000);
      return () => clearTimeout(t);
    }

    const speed = isDeleting ? 35 : 75;

    const t = setTimeout(() => {
      if (!isDeleting) {
        const next = charIndex + 1;
        setPlaceholder(currentText.slice(0, next));
        if (next >= currentText.length) {
          setCharIndex(next);
          setIsPaused(true);
        } else {
          setCharIndex(next);
        }
      } else {
        const next = charIndex - 1;
        setPlaceholder(currentText.slice(0, Math.max(0, next)));
        if (next <= 0) {
          setIsDeleting(false);
          setCharIndex(0);
          setPlaceholder("");
          setQueryIndex((prev) => (prev + 1) % queries.length);
        } else {
          setCharIndex(next);
        }
      }
    }, speed);

    return () => clearTimeout(t);
  }, [charIndex, isDeleting, isPaused, queryIndex, queries, enabled]);

  return placeholder;
}

// ── HERO SECTION ──────────────────────────────────────────

const HeroSection = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const placeholder = useTypewriter(AUTO_QUERIES, !reduceMotion && !isFocused);

  // ── SEARCH HANDLER ────────────────────────────────────
  const handleSearch = useCallback(
    (query?: string) => {
      const q = (query ?? searchQuery).trim();
      if (!q) return;
      dispatch(setFilters({ location: q }));
      router.push(`/search?location=${encodeURIComponent(q)}`);
    },
    [searchQuery, dispatch, router]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleSearch();
    },
    [handleSearch]
  );

  const handleRegionClick = useCallback(
    (slug: string) => {
      router.push(`/regions/${slug}`);
    },
    [router]
  );

  // ── RENDER ────────────────────────────────────────────
  return (
    <section
      aria-label="AskDerek hero — search rental properties in Ghana"
      className="relative h-screen min-h-[860px] overflow-hidden bg-zinc-950"
    >
      {/* ── BACKGROUND IMAGE ─────────────────────────── */}
      <motion.div
        initial={{ scale: 1.08 }}
        animate={!reduceMotion ? { scale: 1 } : undefined}
        transition={{ duration: 16, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        className="absolute inset-0"
      >
        <Image
          src="/Layout.jpg"
          alt="Verified rental homes in Ghana"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-40"
        />
      </motion.div>

      {/* ── GRADIENT OVERLAY ─────────────────────────── */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/30 to-zinc-950"
      />

      {/* ── CONTENT ──────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 text-center pt-20">

        
        

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl sm:text-7xl md:text-8xl font-black text-white tracking-tighter leading-none mb-4"
        >
          ASK{" "}
          <span className="text-orange-500 italic">DEREK</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-zinc-400 text-base sm:text-lg mb-8 max-w-md"
        >
        
        </motion.p>

        {/* ── SEARCH BAR ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="relative w-full max-w-2xl"
        >
          <label htmlFor="location-search" className="sr-only">
            Search rental properties anywhere in Ghana
          </label>

          <div className={`flex bg-white rounded-2xl overflow-hidden shadow-2xl p-1 transition-all duration-200
            ${isFocused ? "ring-2 ring-orange-500/60" : "ring-1 ring-white/10"}`}>

            <div className="flex items-center pl-4 text-zinc-400 flex-shrink-0">
              <MapPin className="w-5 h-5" />
            </div>

            <Input
              id="location-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={isFocused ? "e.g. East Legon, Kumasi, Tarkwa..." : placeholder}
              autoComplete="off"
              className="w-full h-14 md:h-16 px-4 text-base sm:text-lg text-zinc-900 border-none focus-visible:ring-0 placeholder:text-zinc-400 bg-transparent"
            />

            <Button
              onClick={() => handleSearch()}
              aria-label="Search properties"
              className="h-14 md:h-16 px-6 sm:px-10 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-black uppercase tracking-widest rounded-xl transition-all flex-shrink-0 flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Search</span>
            </Button>
          </div>
        </motion.div>

        {/* ── TRUST SIGNALS ──────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-4 flex flex-wrap justify-center gap-4 sm:gap-6"
        >
          {TRUST_SIGNALS.map((signal) => (
            <span key={signal} className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
              {signal}
            </span>
          ))}
        </motion.div>

        {/* ── REGION CHIPS ───────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-12 max-w-4xl w-full"
        >
          <p className="text-zinc-500 text-[10px] uppercase tracking-[0.4em] mb-5 font-black">
            Browse by region
          </p>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {GHANA_REGIONS.map((region, index) => (
              <motion.button
                key={region.slug}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.03, duration: 0.2 }}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => handleRegionClick(region.slug)}
                aria-label={`Browse properties in ${region.name} Region`}
                className="px-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] sm:text-xs font-bold uppercase text-zinc-400 backdrop-blur-sm hover:bg-orange-500/10 hover:border-orange-500/40 hover:text-orange-400 transition-all duration-150 leading-tight"
              >
                {region.name}
              </motion.button>
            ))}
          </div>

          {/* Browse all regions link */}
          <motion.a
            href="/regions"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="inline-flex items-center gap-1.5 mt-6 text-xs text-zinc-500 hover:text-orange-400 transition-colors font-semibold"
          >
            <MapPin className="w-3.5 h-3.5" />
            View all 16 regions
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;