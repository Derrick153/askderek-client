"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  Shield, 
  Heart, 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  Target, 
  Award, 
  Home,
  Lightbulb,
  MapPin,
  Clock
} from "lucide-react";

const AboutPage = () => {
  // REAL stats - Starting humble and honest
  const stats = [
    { 
      label: "Launching In", 
      value: "Tarkwa", 
      icon: <MapPin className="w-6 h-6" />,
      subtitle: "Western Region"
    },
    { 
      label: "Founded", 
      value: "2026", 
      icon: <Clock className="w-6 h-6" />,
      subtitle: "January"
    },
    { 
      label: "Vision", 
      value: "Ghana", 
      icon: <Target className="w-6 h-6" />,
      subtitle: "& Beyond"
    },
    { 
      label: "Mission", 
      value: "100%", 
      icon: <Shield className="w-6 h-6" />,
      subtitle: "Verified Homes"
    },
  ];

  const values = [
    { 
      icon: <Shield className="w-8 h-8" />, 
      title: "Every Property Verified", 
      description: "I personally visit each property, meet the landlord, verify ownership documents, and take real photos. No fake listings, no scams, no surprises. If it's on Ask Derek, it's real and verified." 
    },
    { 
      icon: <Heart className="w-8 h-8" />, 
      title: "Built By a Ghanaian, For Ghanaians", 
      description: "I completed my NSS at Tarkwa Goldfields and saw firsthand how people struggle to find safe homes. I understand the challenges because I lived them. This platform is built with that experience in mind." 
    },
    { 
      icon: <Users className="w-8 h-8" />, 
      title: "No Middlemen, No Extra Fees", 
      description: "Connect directly with property owners. No agents taking big commissions. No hidden charges. Just honest connections between renters and landlords, with Ask Derek ensuring everything is legitimate." 
    },
    { 
      icon: <TrendingUp className="w-8 h-8" />, 
      title: "Growing With Purpose", 
      description: "Starting in Tarkwa, expanding to Takoradi, then across Western Region. My goal: make verified, safe housing accessible to every Ghanaian. With hard work and God's blessing, we'll grow together." 
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      
      {/* Hero Section - THE REAL STORY */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-blue-500/5" />
        
        <div className="max-w-6xl mx-auto relative">
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6 }} 
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 rounded-full text-orange-700 font-semibold text-sm mb-6">
              <Heart className="w-4 h-4 fill-orange-700" />
              <span>Our Story</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight mb-6">
              Making Home Finding <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-orange-400">
                Safe & Honest
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-8">
              Eliminating rental scams in Ghana, one verified property at a time. 
              Starting from Tarkwa, building trust across the nation.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats Section - REAL, HUMBLE NUMBERS */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <motion.div 
                key={stat.label} 
                initial={{ opacity: 0, y: 20 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                viewport={{ once: true }} 
                transition={{ delay: index * 0.1 }} 
                className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow"
              >
                <div className="text-orange-600 mb-3">{stat.icon}</div>
                <div className="text-3xl md:text-4xl font-black text-gray-900 mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
                <div className="text-xs text-gray-400 mt-1">{stat.subtitle}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* The Real Story Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-black mb-6">
              How <span className="text-orange-600">Ask Derek</span> Started
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-6 text-lg text-gray-700 leading-relaxed"
          >
            <div className="bg-gradient-to-br from-orange-50 to-white rounded-2xl p-8 border border-orange-100">
              <div className="flex items-start gap-4">
                <div className="text-orange-600 flex-shrink-0">
                  <Lightbulb className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    The Problem I Witnessed
                  </h3>
                  <p className="mb-4">
                    My name is Derek. I completed my National Service (NSS) at Tarkwa Goldfields 
                    on December 31st, 2025. During my time there, I saw something that troubled me deeply.
                  </p>
                  <p className="mb-4">
                    <span className="font-semibold text-gray-900">People were getting scammed.</span> Friends, 
                    colleagues, families - all struggling to find safe, legitimate homes to rent. Fake photos, 
                    dishonest landlords, properties that didn't exist, surprise fees, poor conditions hidden 
                    until moving day.
                  </p>
                  <p>
                    I watched good people lose their hard-earned money to scammers. I watched families 
                    waste time viewing properties that weren't as advertised. I watched the stress and 
                    frustration of home hunting in Ghana.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-8 border border-blue-100">
              <div className="flex items-start gap-4">
                <div className="text-blue-600 flex-shrink-0">
                  <Target className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    My Solution
                  </h3>
                  <p className="mb-4">
                    I decided to build something to fix this problem. Not someday in the future - 
                    right now. <span className="font-semibold text-gray-900">Ask Derek</span> is my 
                    answer to the rental scam crisis in Ghana.
                  </p>
                  <p className="mb-4">
                    The concept is simple but powerful: <span className="font-semibold text-gray-900">
                    Every single property gets personally verified by me.</span> I visit the location. 
                    I meet the landlord. I check ownership documents. I take real, honest photos. 
                    I verify the condition, the price, the terms - everything.
                  </p>
                  <p>
                    If a property is on Ask Derek, you can trust it's real, safe, and exactly as described. 
                    No scams. No fake photos. No surprises. Just honest, verified homes.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-white rounded-2xl p-8 border border-green-100">
              <div className="flex items-start gap-4">
                <div className="text-green-600 flex-shrink-0">
                  <TrendingUp className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    The Vision
                  </h3>
                  <p className="mb-4">
                    <span className="font-semibold text-gray-900">Phase 1:</span> Launch in Tarkwa 
                    (where I know the community and the housing market best).
                  </p>
                  <p className="mb-4">
                    <span className="font-semibold text-gray-900">Phase 2:</span> Expand to Takoradi 
                    and cover all of Western Region.
                  </p>
                  <p className="mb-4">
                    <span className="font-semibold text-gray-900">Phase 3:</span> Grow across Ghana - 
                    making verified housing accessible in every major city and town.
                  </p>
                  <p className="mb-4">
                    <span className="font-semibold text-gray-900">The Big Dream:</span> With God's 
                    blessing and hard work, I want to build my own real estate properties one day - 
                    quality homes and land that serve Ghanaians with integrity. But first, I'm starting 
                    here, with this platform, earning trust and building a foundation.
                  </p>
                  <p className="font-semibold text-green-700">
                    This is just the beginning. Every journey starts with a single step, and Ask Derek 
                    is my first step toward transforming Ghana's housing market.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* What We Stand For */}
      <section className="py-20 px-6 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0 }} 
            whileInView={{ opacity: 1 }} 
            viewport={{ once: true }} 
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              What <span className="text-orange-600">We Stand For</span>
            </h2>
            <p className="text-xl text-gray-600">
              These aren't just words - they're the promises I make to every user
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {values.map((value, index) => (
              <motion.div 
                key={value.title} 
                initial={{ opacity: 0, y: 20 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                viewport={{ once: true }} 
                transition={{ delay: index * 0.1 }} 
                className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:border-orange-200 transition-all group"
              >
                <div className="text-orange-600 mb-4 group-hover:scale-110 transition-transform">
                  {value.icon}
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">
                  {value.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {value.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Trust Us Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-black mb-6">
              Why <span className="text-orange-600">Trust</span> Ask Derek?
            </h2>
          </motion.div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex items-start gap-4 bg-gradient-to-r from-orange-50 to-white p-6 rounded-xl border border-orange-100"
            >
              <CheckCircle2 className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  I'm One of You
                </h3>
                <p className="text-gray-600">
                  I'm not some big company or foreign investor. I'm a young Ghanaian graduate 
                  who just finished NSS. I understand the struggle because I lived it. I built 
                  this to solve a problem we all face.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="flex items-start gap-4 bg-gradient-to-r from-orange-50 to-white p-6 rounded-xl border border-orange-100"
            >
              <CheckCircle2 className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  I Stake My Name On It
                </h3>
                <p className="text-gray-600">
                  It's called "Ask Derek" because I personally stand behind every listing. 
                  My reputation is on the line. If I verify a property, it means I've been there, 
                  checked it, and I'm confident it's legitimate.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="flex items-start gap-4 bg-gradient-to-r from-orange-50 to-white p-6 rounded-xl border border-orange-100"
            >
              <CheckCircle2 className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No Corporate BS
                </h3>
                <p className="text-gray-600">
                  I'm self-funded. No investors pressuring me to cut corners or maximize profits. 
                  This allows me to focus on what matters: building trust, verifying properties 
                  properly, and serving users with integrity.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="flex items-start gap-4 bg-gradient-to-r from-orange-50 to-white p-6 rounded-xl border border-orange-100"
            >
              <CheckCircle2 className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  You Can Reach Me Directly
                </h3>
                <p className="text-gray-600">
                  Got questions? Concerns? Feedback? Message me on WhatsApp. I respond personally. 
                  No automated bots, no call centers. Just real communication with the person 
                  building this platform.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-orange-600 to-orange-500 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-black mb-6">
              Ready to Find Your Safe Home?
            </h2>
            <p className="text-xl mb-8 text-orange-100">
              Be among the first to use Ghana's most trusted property verification platform. 
              Every home, personally verified.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="/search" 
                className="px-8 py-4 bg-white text-orange-600 rounded-xl font-bold hover:bg-orange-50 transition-all shadow-lg hover:shadow-xl"
              >
                Browse Properties
              </a>
              <a 
                href="https://wa.me/233558153803?text=Hi%20Derek!%20I%20want%20to%20learn%20more%20about%20Ask%20Derek" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="px-8 py-4 bg-orange-700 text-white rounded-xl font-bold hover:bg-orange-800 transition-all shadow-lg border-2 border-white/30"
              >
                Chat With Derek on WhatsApp
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final Note */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <p className="text-lg text-gray-700 italic leading-relaxed">
              "I started Ask Derek because I believe every Ghanaian deserves to find a safe home 
              without fear of scams or dishonesty. This is just the beginning of our journey. 
              With your trust and God's blessing, we'll grow together and transform how Ghana 
              finds homes."
            </p>
            <p className="mt-4 text-gray-900 font-bold">
              - Derek, Founder
            </p>
          </motion.div>
        </div>
      </section>

    </div>
  );
};

export default AboutPage;