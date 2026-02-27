"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Search, Shield, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// Type-safe data structure
interface Feature {
  id: string;
  imageSrc: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  linkText: string;
  linkHref: string;
  accentColor: string;
  stats?: string;
}

const features: Feature[] = [
  {
    id: "verified",
    imageSrc: "/landing-search3.png", // Your actual image
    icon: <Shield className="w-6 h-6" />,
    title: "Every Home is Checked & Trusted",
    description: "We visit and verify every property before it's listed. See what real people say about each home. No fake listings, ever.",
    linkText: "See Verified Homes",
    linkHref: "/explore",
    accentColor: "from-blue-500 to-cyan-500",
    stats: "100% Verified",
  },
  {
    id: "browse",
    imageSrc: "/landing-search2.png", // Your actual image
    icon: <Search className="w-6 h-6" />,
    title: "Find Your Home in Minutes, Not Days",
    description: "Search by location, price, or room type. Filter exactly what you need. See real photos and honest reviews from actual tenants.",
    linkText: "Start Searching",
    linkHref: "/search",
    accentColor: "from-purple-500 to-pink-500",
    stats: "1000+ Homes",
  },
  {
    id: "advanced",
    imageSrc: "/landing-search1.png", // Your actual image
    icon: <Sparkles className="w-6 h-6" />,
    title: "Know What's Available Right Now",
    description: "See which homes are actually free to rent today. Get the exact address before you waste time. No surprises, no agent tricks.",
    linkText: "See What's Free",
    linkHref: "/discover",
    accentColor: "from-emerald-500 to-teal-500",
    stats: "Updated Daily",
  },
];

const FeaturesSection = () => {
  const prefersReducedMotion = useReducedMotion();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const cardVariants: any = {
    hidden: { 
      opacity: 0, 
      y: prefersReducedMotion ? 0 : 30,
      scale: prefersReducedMotion ? 1 : 0.95,
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <section 
      className="relative py-24 px-6 sm:px-8 lg:px-12 xl:px-16 bg-gradient-to-b from-white via-gray-50 to-white overflow-hidden"
      aria-labelledby="features-heading"
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100 rounded-full blur-3xl opacity-30"
          animate={!prefersReducedMotion ? {
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.2, 0.3],
          } : undefined}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-100 rounded-full blur-3xl opacity-30"
          animate={!prefersReducedMotion ? {
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.2, 0.3],
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
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
        className="relative max-w-4xl xl:max-w-7xl mx-auto"
      >
        {/* Header Section */}
        <motion.div variants={cardVariants} className="text-center mb-16">
          <motion.div
            className="inline-block mb-4"
            whileHover={!prefersReducedMotion ? { scale: 1.05 } : undefined}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-50 to-orange-100 rounded-full text-sm font-medium text-orange-700 border border-orange-200">
              <Sparkles className="w-4 h-4 text-orange-500" />
              Smart Search Features
            </span>
          </motion.div>
          
          <h2 
            id="features-heading"
            className="text-4xl sm:text-5xl font-bold mb-4 text-gray-900"
          >
            Find Your Perfect Home
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Quickly find the home you want using our effective search filters and intelligent recommendations
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 xl:gap-10">
          {features.map((feature) => (
            <FeatureCard
              key={feature.id}
              feature={feature}
              variants={cardVariants}
              isHovered={hoveredCard === feature.id}
              onHoverStart={() => setHoveredCard(feature.id)}
              onHoverEnd={() => setHoveredCard(null)}
              prefersReducedMotion={prefersReducedMotion}
            />
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div 
          variants={cardVariants}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-gray-700">
              No agents. No scams. Just verified homes in Tarkwa.
            </span>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

const FeatureCard = ({
  feature,
  variants,
  isHovered,
  onHoverStart,
  onHoverEnd,
  prefersReducedMotion,
}: {
  feature: Feature;
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
        className="relative h-full bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300"
        whileHover={!prefersReducedMotion ? { 
          y: -8,
        } : undefined}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Gradient accent bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.accentColor}`} />
        
        {/* Stats badge */}
        {feature.stats && (
          <motion.div 
            className="absolute top-4 right-4 z-10 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-full text-xs font-bold text-gray-700 shadow-lg border border-gray-200"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            {feature.stats}
          </motion.div>
        )}
        
        <div className="p-6">
          {/* Icon badge */}
          <motion.div
            className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${feature.accentColor} mb-4 shadow-lg`}
            whileHover={!prefersReducedMotion ? { rotate: 360 } : undefined}
            transition={{ duration: 0.6 }}
          >
            <div className="text-white">
              {feature.icon}
            </div>
          </motion.div>

          {/* Image container */}
          <div className="relative rounded-xl mb-6 overflow-hidden bg-gray-50 aspect-square">
            {!imageError ? (
              <Image
                src={feature.imageSrc}
                alt={feature.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                onError={() => setImageError(true)}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-2">{feature.icon}</div>
                  <p className="text-sm">Image placeholder</p>
                </div>
              </div>
            )}
            
            {/* Overlay on hover */}
            <div className={`absolute inset-0 bg-gradient-to-t ${feature.accentColor} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
          </div>

          {/* Content */}
          <h3 className="text-xl font-semibold mb-3 text-gray-900 group-hover:text-gray-700 transition-colors">
            {feature.title}
          </h3>
          <p className="text-gray-600 mb-6 leading-relaxed text-sm">
            {feature.description}
          </p>

          {/* CTA Link - Next.js Link component */}
          <Link
            href={feature.linkHref}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border-2 border-gray-200 font-medium text-gray-700 hover:border-gray-900 hover:text-gray-900 hover:bg-gray-50 transition-all duration-200 group/link"
            aria-label={`${feature.linkText} ${feature.title}`}
          >
            <span>{feature.linkText}</span>
            <motion.div
              animate={!prefersReducedMotion ? { x: isHovered ? 4 : 0 } : undefined}
              transition={{ duration: 0.2 }}
            >
              <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
            </motion.div>
          </Link>
        </div>

        {/* Shimmer effect on hover */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
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

export default FeaturesSection;