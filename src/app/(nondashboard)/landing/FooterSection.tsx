"use client";

import React from "react";
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
  Home
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
  { icon: <Facebook className="w-5 h-5" />, href: "https://facebook.com/askderek", label: "Facebook" },
  { icon: <Twitter className="w-5 h-5" />, href: "https://twitter.com/askderek", label: "Twitter" },
  { icon: <Instagram className="w-5 h-5" />, href: "https://instagram.com/askderek", label: "Instagram" },
  { icon: <Linkedin className="w-5 h-5" />, href: "https://linkedin.com/company/askderek", label: "LinkedIn" },
];

const Footer = () => {
  const prefersReducedMotion = useReducedMotion();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
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
              Find verified homes in Tarkwa & Takoradi. No agents. No scams. Just real homes with honest prices.
            </p>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full text-xs border border-white/10">
                <Shield className="w-3 h-3 text-green-400" />
                <span className="text-gray-300">100% Verified</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full text-xs border border-white/10">
                <Home className="w-3 h-3 text-blue-400" />
                <span className="text-gray-300">1000+ Homes</span>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-3 text-sm text-gray-400">
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <span>Tarkwa, Western Region, Ghana</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <a href="tel:+233123456789" className="hover:text-orange-400 transition-colors">
                  +233 (0) 558 153 803
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <a href="mailto:hello@askderek.com" className="hover:text-orange-400 transition-colors">
                  askderek7@gmail.com
                </a>
              </div>
            </div>
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
            <span>© {new Date().getFullYear()} Ask Derek.</span>
            <span className="flex items-center gap-1">
              Made with <Heart className="w-4 h-4 text-red-500 fill-red-500" /> in Ghana
            </span>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <motion.a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                whileHover={!prefersReducedMotion ? { scale: 1.1, y: -2 } : undefined}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-orange-500/50 text-gray-400 hover:text-orange-400 transition-all duration-300"
              >
                {social.icon}
              </motion.a>
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
      </div>
    </footer>
  );
};

export default Footer;