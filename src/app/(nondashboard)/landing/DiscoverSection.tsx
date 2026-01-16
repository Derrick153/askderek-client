"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { Search, Calendar, Heart, ArrowRight, Sparkles } from "lucide-react";

// Type-safe data structure
interface DiscoverStep {
  id: string;
  imageSrc: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  step: number;
  accentColor: string;
}

const discoverSteps: DiscoverStep[] = [
  {
    id: "search",
    imageSrc: "/landing-icon-wand.png",
    icon: <Search className="w-6 h-6" />,
    title: "Search for Your Home",
    description: "Browse verified homes in Tarkwa. Filter by area, price, and room type. See real photos and honest reviews.",
    step: 1,
    accentColor: "from-blue-500 to-cyan-500",
  },
  {
    id: "book",
    imageSrc: "/landing-icon-calendar.png",
    icon: <Calendar className="w-6 h-6" />,
    title: "Contact the Landlord Direct",
    description: "Found what you like? Get the exact address and landlord contact. No agent fees. No middlemen taking your money.",
    step: 2,
    accentColor: "from-purple-500 to-pink-500",
  },
  {
    id: "enjoy",
    imageSrc: "/landing-icon-heart.png",
    icon: <Heart className="w-6 h-6" />,
    title: "Move In & Enjoy",
    description: "Pack your things and move in. You saved money, avoided scams, and found a real verified home in Tarkwa.",
    step: 3,
    accentColor: "from-orange-500 to-red-500",
  },
];

const DiscoverSection = () => {
  const prefersReducedMotion = useReducedMotion();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.2,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants: any = {
    hidden: { 
      opacity: 0, 
      y: prefersReducedMotion ? 0 : 20,
    },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <section className="relative py-20 bg-gradient-to-b from-white via-slate-50 to-white overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 right-1/4 w-72 h-72 bg-orange-100 rounded-full blur-3xl opacity-20"
          animate={!prefersReducedMotion ? {
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2],
          } : undefined}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3, margin: "-50px" }}
        variants={containerVariants}
        className="relative max-w-6xl xl:max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 xl:px-16"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-16 text-center">
          <motion.div
            className="inline-block mb-4"
            whileHover={!prefersReducedMotion ? { scale: 1.05 } : undefined}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-50 to-orange-100 rounded-full text-sm font-medium text-orange-700 border border-orange-200">
              <Sparkles className="w-4 h-4 text-orange-500" />
              How It Works
            </span>
          </motion.div>

          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Find Your Home in 3 Simple Steps
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            No confusing process. No agent wahala. Just simple steps to find your perfect home in Tarkwa.
          </p>
        </motion.div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 relative">
          {/* Connection Lines (Desktop) */}
          <div className="hidden md:block absolute top-20 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-orange-200 to-transparent" 
               style={{ top: '80px' }} 
          />

          {discoverSteps.map((step, index) => (
            <React.Fragment key={step.id}>
              <DiscoverCard
                step={step}
                variants={itemVariants}
                isHovered={hoveredCard === step.id}
                onHoverStart={() => setHoveredCard(step.id)}
                onHoverEnd={() => setHoveredCard(null)}
                prefersReducedMotion={prefersReducedMotion}
              />
              
              {/* Arrow Between Cards (Desktop) */}
              {index < discoverSteps.length - 1 && (
                <motion.div
                  className="hidden md:flex absolute items-center justify-center text-orange-400"
                  style={{
                    left: `${((index + 1) * 33.33) - 4}%`,
                    top: '80px',
                    zIndex: 10,
                  }}
                  animate={!prefersReducedMotion ? {
                    x: [0, 5, 0],
                  } : undefined}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-orange-200">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </motion.div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div 
          variants={itemVariants}
          className="mt-16 text-center"
        >
          <motion.button
            whileHover={!prefersReducedMotion ? { scale: 1.05 } : undefined}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <span>Start Your Search Now</span>
            <ArrowRight className="w-5 h-5" />
          </motion.button>
          
          <p className="mt-4 text-sm text-gray-500">
            Join hundreds of people who found their homes through Ask Derek
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
};

const DiscoverCard = ({
  step,
  variants,
  isHovered,
  onHoverStart,
  onHoverEnd,
  prefersReducedMotion,
}: {
  step: DiscoverStep;
  variants: any;
  isHovered: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  prefersReducedMotion: boolean | null;
}) => {
  const [imageError, setImageError] = useState(false);

  return (
    <motion.article
      variants={variants}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
      className="group relative"
    >
      <motion.div
        className="relative h-full bg-white rounded-2xl border-2 border-gray-100 overflow-hidden shadow-md hover:shadow-2xl transition-shadow duration-300"
        whileHover={!prefersReducedMotion ? { y: -10 } : undefined}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Step Number Badge */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
          <motion.div
            className={`w-12 h-12 rounded-full bg-gradient-to-br ${step.accentColor} flex items-center justify-center text-white font-bold text-xl shadow-lg border-4 border-white`}
            whileHover={!prefersReducedMotion ? { rotate: 360 } : undefined}
            transition={{ duration: 0.6 }}
          >
            {step.step}
          </motion.div>
        </div>

        {/* Gradient accent bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${step.accentColor}`} />

        <div className="px-6 py-12 text-center">
          {/* Icon with fallback */}
          <motion.div
            className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${step.accentColor} mb-6 shadow-lg`}
            whileHover={!prefersReducedMotion ? { scale: 1.1, rotate: 5 } : undefined}
            transition={{ duration: 0.3 }}
          >
            {!imageError ? (
              <Image
                src={step.imageSrc}
                width={32}
                height={32}
                className="w-8 h-8 brightness-0 invert"
                alt={step.title}
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="text-white">
                {step.icon}
              </div>
            )}
          </motion.div>

          {/* Content */}
          <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-orange-600 transition-colors">
            {step.title}
          </h3>
          <p className="text-gray-600 leading-relaxed text-sm">
            {step.description}
          </p>

          {/* Hover indicator */}
          <motion.div
            className="mt-6 flex items-center justify-center gap-2 text-orange-500 font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity"
            animate={!prefersReducedMotion && isHovered ? { x: [0, 5, 0] } : undefined}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <span>Learn More</span>
            <ArrowRight className="w-4 h-4" />
          </motion.div>
        </div>

        {/* Shimmer effect on hover */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
          }}
          animate={!prefersReducedMotion && isHovered ? {
            x: [-200, 400],
          } : undefined}
          transition={{
            duration: 1.5,
            ease: "easeInOut",
          }}
        />
      </motion.div>
    </motion.article>
  );
};

export default DiscoverSection;