"use client";

import Image from "next/image";
import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { Search, UserPlus, ArrowRight, Shield, MapPin, Sparkles } from "lucide-react";

const CallToActionSection = () => {
  const prefersReducedMotion = useReducedMotion();
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background Image with Loading State */}
      <div className="absolute inset-0">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 animate-pulse" />
        )}
        <Image
          src="/landing-call-to-action.jpg"
          alt="Find your home in Tarkwa"
          fill
          className={`object-cover object-center transition-opacity duration-700 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          priority
        />
        
        {/* Enhanced Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/70 to-black/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      </div>

      {/* Animated Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl"
          animate={!prefersReducedMotion ? {
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3],
          } : undefined}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"
          animate={!prefersReducedMotion ? {
            scale: [1, 1.4, 1],
            opacity: [0.2, 0.4, 0.2],
          } : undefined}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative max-w-4xl xl:max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 xl:px-16"
      >
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 md:gap-12">
          
          {/* Left Side - Headline & Stats */}
          <div className="flex-1 text-center md:text-left">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="inline-block mb-6"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 backdrop-blur-sm rounded-full text-sm font-medium text-orange-300 border border-orange-500/30">
                <Sparkles className="w-4 h-4" />
                Ready to Find Your Home?
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight"
            >
              Stop Searching.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
                Start Living.
              </span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="text-lg text-gray-300 mb-6 leading-relaxed max-w-xl"
            >
              Join hundreds of people in Tarkwa who found their perfect homes without agent stress. Verified listings, real photos, transparent prices.
            </motion.p>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap justify-center md:justify-start gap-4 mb-8 md:mb-0"
            >
              {[
                { icon: <Shield className="w-4 h-4" />, text: "100% Verified" },
                { icon: <MapPin className="w-4 h-4" />, text: "Exact Locations" },
                { icon: <Sparkles className="w-4 h-4" />, text: "No Agent Fees" },
              ].map((badge, index) => (
                <motion.div
                  key={badge.text}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white border border-white/20"
                >
                  {badge.icon}
                  <span className="font-medium">{badge.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Right Side - CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="flex-shrink-0"
          >
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
              <p className="text-white text-lg mb-6 text-center font-medium">
                Ready to find your home?
              </p>

              <div className="flex flex-col gap-4">
                {/* Primary CTA - Search */}
                <motion.button
                  onClick={handleScrollToTop}
                  whileHover={!prefersReducedMotion ? { scale: 1.02 } : undefined}
                  whileTap={{ scale: 0.98 }}
                  className="group relative flex items-center justify-center gap-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl px-8 py-4 font-bold text-lg shadow-lg hover:shadow-orange-500/50 transition-all duration-300 overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    <Search className="w-5 h-5" />
                    Start Searching Now
                    <motion.div
                      animate={!prefersReducedMotion ? { x: [0, 5, 0] } : undefined}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <ArrowRight className="w-5 h-5" />
                    </motion.div>
                  </span>
                  
                  {/* Shine effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={!prefersReducedMotion ? {
                      x: [-200, 200],
                    } : undefined}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 1,
                    }}
                  />
                </motion.button>

                {/* Secondary CTA - Sign Up */}
                <Link href="/signup" scroll={false}>
                  <motion.button
                    whileHover={!prefersReducedMotion ? { scale: 1.02 } : undefined}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center gap-3 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border-2 border-white/30 hover:border-white/50 rounded-xl px-8 py-4 font-bold text-lg transition-all duration-300"
                  >
                    <UserPlus className="w-5 h-5" />
                    Create Free Account
                  </motion.button>
                </Link>
              </div>

              {/* Fine print */}
              <p className="text-center text-white/60 text-xs mt-4">
                Free to use. No credit card needed.
              </p>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Bottom decorative line */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.5, delay: 0.5 }}
      />
    </section>
  );
};

export default CallToActionSection;