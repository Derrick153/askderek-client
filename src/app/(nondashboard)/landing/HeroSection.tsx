"use client";

import Image from "next/image";
import React, { useState, useEffect } from "react";
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
  const [error, setError] = useState("");

  /* ===========================
     TYPEWRITER EFFECT
  =========================== */

  useEffect(() => {
    if (reduceMotion) return;

    const currentText = AUTO_QUERIES[queryIndex];
    const speed = isDeleting ? 40 : 80;

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        setPlaceholder(currentText.slice(0, charIndex + 1));
        setCharIndex((prev) => prev + 1);

        if (charIndex === currentText.length) {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        setPlaceholder(currentText.slice(0, charIndex - 1));
        setCharIndex((prev) => prev - 1);

        if (charIndex === 0) {
          setIsDeleting(false);
          setQueryIndex((prev) => (prev + 1) % AUTO_QUERIES.length);
        }
      }
    }, speed);

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, queryIndex, reduceMotion]);

  /* ===========================
     SEARCH HANDLER
  =========================== */

  const handleLocationSearch = async (forcedQuery?: string) => {
    const queryToSearch = (forcedQuery || searchQuery).trim();
    if (!queryToSearch) return;

    setError("");

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          queryToSearch + " Tarkwa Ghana"
        )}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}`
      );

      const data = await response.json();

      if (!data.features?.length) {
        setError("No verified listings found for this location.");
        return;
      }

      const [lng, lat] = data.features[0].center;

      dispatch(
        setFilters({
          location: queryToSearch,
          coordinates: [lat, lng],
        })
      );

      router.push(`/search?location=${queryToSearch}&lat=${lat}&lng=${lng}`);
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

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
          src="/landing-splash.jpg"
          alt="Verified homes in Tarkwa"
          fill
          priority
          className="object-cover opacity-50"
        />
      </motion.div>

      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-transparent to-slate-900" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 text-center pt-20">
        {/* Badge */}
        <span className="mb-6 px-6 py-2 rounded-full border border-secondary-500/40 bg-secondary-500/10 text-secondary-400 text-[10px] font-bold tracking-[0.4em] uppercase">
          Built in Tarkwa • Verified in Tarkwa
        </span>

        {/* Brand */}
        <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter leading-none mb-6">
          ASK <span className="text-secondary-500 italic">DEREK</span>
        </h1>

        {/* Value Proposition */}
        <p className="max-w-2xl text-lg md:text-xl text-slate-300 mb-10 font-light">
          Real, verified homes and hostels — exact locations, real photos,
          transparent pricing. No agents. No scams.
        </p>

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
              className="h-14 md:h-16 px-10 bg-secondary-500 hover:bg-black text-white font-bold uppercase tracking-widest rounded-xl transition-all"
            >
              Search
            </Button>
          </div>

          {error && (
            <p className="mt-3 text-xs text-red-400 text-center">{error}</p>
          )}
        </div>

        {/* Trust Signals */}
        <div className="mt-6 flex flex-wrap justify-center gap-6 text-xs text-slate-300">
          <span>✔ Location Verified</span>
          <span>✔ Real Photos Only</span>
          <span>✔ No Agent Middlemen</span>
        </div>

        {/* Location Chips */}
        <div className="mt-16 max-w-4xl w-full">
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
                className="px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold uppercase text-slate-300 backdrop-blur-sm"
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
