"use client";

import Image from "next/image";
import React, { useState, useEffect, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { setFilters } from "@/state";

/* ===========================
   CONSTANTS
=========================== */

const TARKWA_LOCATIONS = [
  "New Atuabo",
  "Tamso",
  "Cyanide",
  "UMaT Hostels",
  "Kwabedu",
  "Low Cost",
  "Brahabebom",
  "Nsuta",
  "Bonsa",
  "Aboso",
  "Bonsawire",
  "Kyekyewere",
  "Efuanta",
  "Akoon",
  "Bankyim",
  "Nzema Line",
  "Zongo",
  "Tarkwa & Aboso",
  "Government Hill",
  "Teberebe",
];

const AUTO_QUERIES = [
  "Find verified rooms in New Atuabo…",
  "Search UMaT hostels with real photos…",
  "Apartments in Tamso — no agents…",
  "Houses in Kwabedu, exact locations…",
  "Trusted rentals in Nsuta & Aboso…",
];

/* ===========================
   COMPONENT
=========================== */

const HeroSection = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const [searchQuery, setSearchQuery] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [queryIndex, setQueryIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  /* ===========================
     TYPEWRITER EFFECT — FIXED
  =========================== */

  useEffect(() => {
    if (reduceMotion) return;

    const currentText = AUTO_QUERIES[queryIndex];

    // Pause between finish typing and start deleting
    if (isPaused) {
      const pauseTimer = setTimeout(() => {
        setIsPaused(false);
        setIsDeleting(true);
      }, 2000);
      return () => clearTimeout(pauseTimer);
    }

    const speed = isDeleting ? 40 : 80;

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        const next = charIndex + 1;
        setPlaceholder(currentText.slice(0, next));

        if (next >= currentText.length) {
          setIsPaused(true); // pause before deleting
        } else {
          setCharIndex(next);
        }
      } else {
        const next = charIndex - 1;
        setPlaceholder(currentText.slice(0, Math.max(0, next)));

        if (next <= 0) {
          // move to next query
          setIsDeleting(false);
          setCharIndex(0);
          setPlaceholder("");
          setQueryIndex((prev) => (prev + 1) % AUTO_QUERIES.length);
        } else {
          setCharIndex(next);
        }
      }
    }, speed);

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, isPaused, queryIndex, reduceMotion]);

  /* ===========================
     SEARCH HANDLER — FIXED
  =========================== */

  const handleLocationSearch = useCallback(
    (forcedQuery?: string) => {
      const queryToSearch = (forcedQuery || searchQuery).trim();
      if (!queryToSearch) return;

      // No coordinates needed — backend searches by city name
      dispatch(setFilters({ location: queryToSearch }));
      router.push(`/search?location=${encodeURIComponent(queryToSearch)}`);
    },
    [searchQuery, dispatch, router]
  );

  /* ===========================
     RENDER
  =========================== */

  return (
    <section className="relative h-screen min-h-[850px] overflow-hidden bg-slate-900">

      {/* Background */}
      <motion.div
        initial={{ scale: 1.1 }}
        animate={!reduceMotion ? { scale: 1 } : undefined}
        transition={{ duration: 15, repeat: Infinity, repeatType: "reverse" }}
        className="absolute inset-0"
      >
        <Image
          src="/Layout.jpg"
          alt="Verified homes in Tarkwa"
          fill
          priority
          className="object-cover opacity-50"
        />
      </motion.div>

      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-transparent to-slate-900" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 text-center pt-20">

        {/* Brand */}
        <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter leading-none mb-6">
          ASK <span className="text-orange-500 italic">DEREK</span>
        </h1>

        {/* Search */}
        <div className="relative w-full max-w-2xl">
          <label htmlFor="location-search" className="sr-only">
            Search by location in Tarkwa
          </label>

          <div className="relative flex bg-white rounded-2xl overflow-hidden shadow-2xl p-1">
            <Input
              id="location-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLocationSearch()}
              placeholder={placeholder}
              className="w-full h-14 md:h-16 px-6 text-lg text-slate-900 border-none focus-visible:ring-0 placeholder:text-slate-400"
            />
            <Button
              onClick={() => handleLocationSearch()}
              className="h-14 md:h-16 px-10 bg-orange-500 hover:bg-orange-600 text-white font-bold uppercase tracking-widest rounded-xl transition-all"
            >
              Search
            </Button>
          </div>
        </div>

        {/* Trust Signals — below search, small and simple */}
        <div className="mt-5 flex flex-wrap justify-center gap-6 text-xs text-slate-400">
          <span>✔ Location Verified</span>
          <span>✔ Real Photos Only</span>
          <span>✔ No Agent Middlemen</span>
          <span>✔ Transparent Pricing. No Scams.</span>
        </div>

        {/* Location Chips */}
        <div className="mt-12 max-w-4xl w-full">
          <p className="text-white/60 text-[10px] uppercase tracking-[0.5em] mb-8 font-black italic">
            Browse popular neighborhoods
          </p>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {TARKWA_LOCATIONS.map((loc, index) => (
              <motion.button
                key={loc}
                whileHover={{
                  scale: 1.08,
                  boxShadow: "0 0 25px rgba(249,115,22,0.4)",
                }}
                whileTap={{ scale: 0.95 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => handleLocationSearch(loc)}
                className="px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold uppercase text-slate-300 backdrop-blur-sm hover:bg-white/10 hover:border-orange-500/50 transition-all"
              >
                {loc}
              </motion.button>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

export default HeroSection;