"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { 
  MapPin, 
  Mail, 
  Phone, 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin,
  Heart,
  ArrowUp,
  Shield,
  Home,
  Send,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MessageSquare
} from "lucide-react";

interface FooterLink {
  label: string;
  href: string;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

const footerSections: FooterSection[] = [
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Our Story", href: "/story" },
      { label: "How It Works", href: "/how-it-works" },
      { label: "Careers", href: "/careers" },
    ],
  },
  {
    title: "For Renters",
    links: [
      { label: "Search Homes", href: "/search" },
      { label: "Browse Areas", href: "/areas" },
      { label: "How to Rent", href: "/guide/renting" },
      { label: "FAQs", href: "/faqs" },
    ],
  },
  {
    title: "For Landlords",
    links: [
      { label: "List Your Property", href: "/list-property" },
      { label: "Pricing", href: "/pricing" },
      { label: "Verification Process", href: "/verification" },
      { label: "Landlord Guide", href: "/guide/landlords" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Cookie Policy", href: "/cookies" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
];

const socialLinks = [
  { 
    icon: <Facebook className="w-5 h-5" />, 
    href: "https://facebook.com", 
    label: "Facebook",
    comingSoon: true 
  },
  { 
    icon: <Twitter className="w-5 h-5" />, 
    href: "https://twitter.com", 
    label: "Twitter",
    comingSoon: true 
  },
  { 
    icon: <Instagram className="w-5 h-5" />, 
    href: "https://instagram.com", 
    label: "Instagram",
    comingSoon: true 
  },
  { 
    icon: <Linkedin className="w-5 h-5" />, 
    href: "https://linkedin.com", 
    label: "LinkedIn",
    comingSoon: true 
  },
];

const FooterSection = () => {
  const prefersReducedMotion = useReducedMotion();
  const [email, setEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [subscribeMessage, setSubscribeMessage] = useState("");

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleWhatsApp = () => {
    // Remove leading zero and add Ghana country code
    const phoneNumber = "233558153803";
    const message = encodeURIComponent("Hello Ask Derek! I'm interested in finding a home.");
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setSubscribeStatus("error");
      setSubscribeMessage("Please enter a valid email address");
      return;
    }

    setSubscribeStatus("loading");

    try {
      // TODO: Replace with your actual newsletter API endpoint
      // For now, this sends to a mailto link as backup
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      }).catch(() => {
        // Fallback: Open email client
        window.location.href = `mailto:askderek7@gmail.com?subject=Newsletter Subscription&body=Please subscribe this email: ${email}`;
        return { ok: true };
      });

      if (response.ok) {
        setSubscribeStatus("success");
        setSubscribeMessage("Thank you! You're now subscribed to our updates.");
        setEmail("");
        
        // Reset after 5 seconds
        setTimeout(() => {
          setSubscribeStatus("idle");
          setSubscribeMessage("");
        }, 5000);
      } else {
        throw new Error("Subscription failed");
      }
    } catch (error) {
      setSubscribeStatus("error");
      setSubscribeMessage("Something went wrong. Please try again or contact us directly.");
    }
  };

  return (
    <footer className="relative bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white overflow-hidden">
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent" />

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <motion.div
          className="absolute -top-40 -left-40 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl"
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
        <motion.div
          className="absolute -bottom-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"
          animate={!prefersReducedMotion ? {
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.3, 0.2],
          } : undefined}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 xl:px-16">
        
        {/* Newsletter Section - New Feature */}
        <div className="py-12 border-b border-white/10">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h3 className="text-2xl font-bold mb-3">Stay Updated with New Listings</h3>
              <p className="text-gray-400 mb-6">
                Get weekly updates on verified homes homes across all 16 regions of Ghana. No spam, just quality listings.
              </p>
              
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <div className="flex-1 relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-gray-500 transition-all"
                    disabled={subscribeStatus === "loading"}
                  />
                </div>
                <motion.button
                  type="submit"
                  whileHover={!prefersReducedMotion ? { scale: 1.02 } : undefined}
                  whileTap={{ scale: 0.98 }}
                  disabled={subscribeStatus === "loading"}
                  className="px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {subscribeStatus === "loading" ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      />
                      <span>Subscribing...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Subscribe</span>
                    </>
                  )}
                </motion.button>
              </form>

              {/* Subscription Status Messages */}
              {subscribeStatus === "success" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center justify-center gap-2 text-green-400"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{subscribeMessage}</span>
                </motion.div>
              )}

              {subscribeStatus === "error" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-center gap-2 text-red-400"
                >
                  <AlertCircle className="w-5 h-5" />
                  <span>{subscribeMessage}</span>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12">
          
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-block mb-6 group">
              <motion.div
                whileHover={!prefersReducedMotion ? { scale: 1.05 } : undefined}
                transition={{ duration: 0.2 }}
              >
                <h3 className="text-3xl font-black tracking-tight">
                  ASK <span className="text-orange-500 italic">DEREK</span>
                </h3>
              </motion.div>
            </Link>
            
            <p className="text-gray-400 mb-6 leading-relaxed">
              Find verified homes anywhere in Ghana. No agents. No scams. Just real homes with honest prices.
            </p>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full text-xs border border-white/10">
                <Shield className="w-3 h-3 text-green-400" />
                <span className="text-gray-300">100% Verified</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full text-xs border border-white/10">
                <Home className="w-3 h-3 text-blue-400" />
                <span className="text-gray-300">Growing Daily</span>
              </div>
            </div>

            {/* Contact Info - All Functional */}
            <div className="space-y-3 text-sm text-gray-400">
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span> Ghana 🇬🇭</span>
              </div>
              
              {/* WhatsApp Contact Button */}
              <motion.button
                onClick={handleWhatsApp}
                whileHover={!prefersReducedMotion ? { scale: 1.02 } : undefined}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3 hover:text-orange-400 transition-colors cursor-pointer group w-full text-left"
              >
                <Phone className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span className="group-hover:underline">+233 558 153 803</span>
                <MessageSquare className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>

              {/* Email Contact */}
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <a 
                  href="mailto:askderek7@gmail.com" 
                  className="hover:text-orange-400 transition-colors hover:underline"
                >
                  askderek7@gmail.com
                </a>
              </div>
            </div>

            {/* Quick WhatsApp CTA */}
            <motion.a
              href={`https://wa.me/233558153803?text=${encodeURIComponent("Hello Ask Derek! I'm interested in finding a home.")}`}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={!prefersReducedMotion ? { scale: 1.02 } : undefined}
              whileTap={{ scale: 0.98 }}
              className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-sm transition-all group"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat on WhatsApp</span>
              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.a>
          </div>

          {/* Footer Links */}
          {footerSections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">
                {section.title}
              </h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-gray-400 hover:text-orange-400 transition-colors text-sm inline-flex items-center group"
                    >
                      <span className="group-hover:translate-x-1 transition-transform inline-block">
                        {link.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-white/10" />

        {/* Bottom Bar */}
        <div className="py-8 flex flex-col md:flex-row justify-between items-center gap-6">
          
          {/* Copyright */}
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>© 2026 Ask Derek. All rights reserved.</span>
            <span className="hidden sm:flex items-center gap-1">
              Made with <Heart className="w-4 h-4 text-red-500 fill-red-500" /> in Ghana
            </span>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <div key={social.label} className="relative group">
                <motion.a
                  href={social.comingSoon ? "#" : social.href}
                  target={social.comingSoon ? undefined : "_blank"}
                  rel={social.comingSoon ? undefined : "noopener noreferrer"}
                  aria-label={social.label}
                  onClick={(e) => {
                    if (social.comingSoon) {
                      e.preventDefault();
                    }
                  }}
                  whileHover={!prefersReducedMotion ? { scale: 1.1, y: -2 } : undefined}
                  whileTap={{ scale: 0.95 }}
                  className={`w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-orange-500/50 text-gray-400 hover:text-orange-400 transition-all duration-300 ${
                    social.comingSoon ? 'cursor-not-allowed opacity-50' : ''
                  }`}
                >
                  {social.icon}
                </motion.a>
                {social.comingSoon && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Coming Soon
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Scroll to Top Button */}
          <motion.button
            onClick={scrollToTop}
            whileHover={!prefersReducedMotion ? { scale: 1.05 } : undefined}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 hover:border-orange-500/50 rounded-lg text-orange-400 text-sm font-medium transition-all duration-300"
            aria-label="Scroll to top"
          >
            <span>Back to Top</span>
            <ArrowUp className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Trust Footer - New Feature */}
        <div className="border-t border-white/10 py-6">
          <div className="flex flex-wrap justify-center items-center gap-6 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-500" />
              <span>SSL Secured</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-500" />
              <span>Verified Listings Only</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-500" />
              <span>Built for Ghanaians</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
