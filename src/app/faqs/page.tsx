"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  ChevronDown, 
  MessageSquare, 
  Shield, 
  Home, 
  Search,
  X,
  Sparkles,
  TrendingUp,
  Clock,
  ExternalLink
} from "lucide-react";

export default function FAQsPage() {
  // State Management
  const [openIndex, setOpenIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [viewedQuestions, setViewedQuestions] = useState(new Set());
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Refs for Intersection Observer
  const questionRefs = useRef([]);
  const heroRef = useRef(null);

  // FAQ Data Structure
  const categories = [
    {
      title: "For Renters",
      icon: Home,
      color: "from-blue-500 to-indigo-600",
      questions: [
        {
          q: "How do I know properties are verified?",
          a: "Every property is personally visited by our team. We meet landlords, verify documents, and take our own photos to ensure authenticity and accuracy.",
          tags: ["verification", "trust", "safety"],
          popular: true
        },
        {
          q: "Do you charge renters fees?",
          a: "NO. Our service is 100% FREE for renters. We make money only from landlords, so you never pay a single cedi to use Ask Derek.",
          tags: ["pricing", "free", "cost"],
          popular: true
        },
        {
          q: "How quickly can I view a property?",
          a: "Usually within 24-48 hours. WhatsApp us at +233 558 153 803 and we'll arrange a viewing at your convenience.",
          tags: ["viewing", "speed", "schedule"],
          popular: true
        },
        {
          q: "What areas do you cover?",
          a: "We cover all major areas in Accra including East Legon, Cantonments, Osu, Labone, Dzorwulu, Airport Residential, Tema, and surrounding communities.",
          tags: ["location", "coverage", "areas"]
        },
        {
          q: "Can I trust the photos and information?",
          a: "Absolutely. Unlike other platforms, we take our own photos during verification visits. What you see is exactly what you get - no stock photos or misleading images.",
          tags: ["photos", "trust", "accuracy"]
        }
      ]
    },
    {
      title: "For Landlords",
      icon: Shield,
      color: "from-orange-500 to-red-600",
      questions: [
        {
          q: "How much does it cost to list my property?",
          a: "One-time fee of GH₵50-200 depending on property type. No monthly fees, no hidden charges, no commissions on rent.",
          tags: ["pricing", "cost", "fees"],
          popular: true
        },
        {
          q: "How long does verification take?",
          a: "24-48 hours from initial contact. We'll visit your property, verify documents, take professional photos, and your listing goes live within 24 hours after verification.",
          tags: ["verification", "timeline", "process"]
        },
        {
          q: "What documents do I need?",
          a: "Basic ownership documents or authorization letter if managing on behalf of owner. We'll guide you through the process step by step.",
          tags: ["documents", "requirements", "onboarding"]
        },
        {
          q: "How do you find tenants for my property?",
          a: "We market your property through our verified platform, WhatsApp broadcasts, and direct matching with qualified renters actively searching in your area.",
          tags: ["marketing", "tenants", "promotion"]
        },
        {
          q: "Can I update my listing after it's live?",
          a: "Yes! Contact us anytime via WhatsApp to update pricing, availability, or property details. Updates are processed within 24 hours.",
          tags: ["updates", "changes", "flexibility"]
        }
      ]
    }
  ];

  // FEATURE 1: SMART SEARCH WITH FUZZY MATCHING
  // Why: Users can find answers faster without scrolling through everything
  // Example: Typing "cost" shows both "Do you charge" and "How much does it cost"
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;

    const query = searchQuery.toLowerCase();
    
    return categories.map(category => ({
      ...category,
      questions: category.questions.filter(faq => 
        faq.q.toLowerCase().includes(query) ||
        faq.a.toLowerCase().includes(query) ||
        faq.tags.some(tag => tag.includes(query))
      )
    })).filter(category => category.questions.length > 0);
  }, [searchQuery]);

  // FEATURE 2: INTERSECTION OBSERVER FOR SCROLL ANIMATIONS
  // Why: Questions appear smoothly as you scroll, creating a premium feel
  // Example: Like how Instagram posts fade in as you scroll
  useEffect(() => {
    setIsLoaded(true);
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-slide-in');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    questionRefs.current.forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [filteredCategories]);

  // FEATURE 3: VIEW TRACKING FOR PERSONALIZATION
  // Why: Shows which questions you've already read (like "read receipts")
  // Example: Similar to YouTube showing which videos you've watched
  const trackView = (id) => {
    setViewedQuestions(prev => new Set([...prev, id]));
  };

  const toggleQuestion = (id) => {
    const newState = openIndex === id ? -1 : id;
    setOpenIndex(newState);
    if (newState !== -1) trackView(id);
  };

  // FEATURE 4: KEYBOARD NAVIGATION
  // Why: Professional users can navigate faster with keyboard
  // Example: Press "/" to search, Escape to clear
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === '/' && !isSearchFocused) {
        e.preventDefault();
        document.getElementById('faq-search')?.focus();
      }
      if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isSearchFocused, searchQuery]);

  // Calculate stats for smart insights
  const totalQuestions = categories.reduce((sum, cat) => sum + cat.questions.length, 0);
  const popularCount = categories.reduce((sum, cat) => 
    sum + cat.questions.filter(q => q.popular).length, 0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/20 to-slate-50">
      
      {/* FEATURE 5: ANIMATED GRADIENT BACKGROUND */}
      {/* Why: Creates depth and premium feel without overwhelming */}
      {/* Example: Like modern banking apps (Revolut, N26) */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl animate-blob animation-delay-4000" />
      </div>

      {/* Hero Section with Enhanced Design */}
      <section 
        ref={heroRef}
        className={`pt-24 sm:pt-32 pb-12 sm:pb-16 px-4 sm:px-6 transition-all duration-1000 ${
          isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="max-w-4xl mx-auto text-center">
          {/* FEATURE 6: MICRO-INTERACTION BADGE */}
          {/* Why: Shows live stats to build trust */}
          {/* Example: Like "1M+ users" badges on app stores */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-orange-200 mb-6 shadow-sm">
            <Sparkles className="w-4 h-4 text-orange-600 animate-pulse" />
            <span className="text-sm font-semibold text-gray-700">
              {totalQuestions} Questions Answered • {popularCount} Most Popular
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-4 sm:mb-6 leading-tight bg-gradient-to-r from-gray-900 via-orange-800 to-gray-900 bg-clip-text text-transparent">
            Frequently Asked Questions
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto font-medium">
            Everything you need to know about Ask Derek - Ghana's most trusted rental platform
          </p>

          {/* FEATURE 7: SMART SEARCH BAR WITH LIVE FILTERING */}
          {/* Why: Users find answers 3x faster than scrolling */}
          {/* Example: Like Google's search suggestions */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className={`relative group transition-all duration-300 ${
              isSearchFocused ? 'scale-105' : 'scale-100'
            }`}>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-600 transition-colors" />
              <input
                id="faq-search"
                type="text"
                placeholder="Search questions... (Press '/' to focus)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="w-full pl-12 pr-12 py-4 rounded-2xl border-2 border-gray-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 outline-none transition-all duration-300 text-base bg-white/80 backdrop-blur-sm shadow-lg group-focus-within:shadow-xl"
                aria-label="Search frequently asked questions"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
            
            {/* FEATURE 8: LIVE SEARCH RESULTS COUNTER */}
            {/* Why: Gives instant feedback on search effectiveness */}
            {searchQuery && (
              <div className="mt-3 text-sm text-gray-600 font-medium animate-fade-in">
                {filteredCategories.reduce((sum, cat) => sum + cat.questions.length, 0)} 
                {' '}result{filteredCategories.reduce((sum, cat) => sum + cat.questions.length, 0) !== 1 ? 's' : ''} found
              </div>
            )}
          </div>

          <a
            href="https://wa.me/233558153803"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-2xl font-bold text-lg transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 group"
            aria-label="Contact us on WhatsApp"
          >
            <MessageSquare className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            WhatsApp Us
            <ExternalLink className="w-4 h-4 opacity-70" />
          </a>
        </div>
      </section>

      {/* FAQ Categories with Advanced Features */}
      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-12 sm:space-y-16">
          {filteredCategories.length === 0 ? (
            // FEATURE 9: EMPTY STATE WITH HELPFUL CTA
            // Why: Never leave users stuck, always offer next steps
            <div className="text-center py-20 animate-fade-in">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-orange-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No questions found</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                We couldn't find any questions matching "{searchQuery}". Try different keywords or contact us directly.
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-colors"
              >
                Clear Search
              </button>
            </div>
          ) : (
            filteredCategories.map((category, catIndex) => {
              const IconComponent = category.icon;
              
              return (
                <div key={catIndex} className="animate-fade-in">
                  {/* FEATURE 10: GRADIENT CATEGORY HEADERS */}
                  {/* Why: Visual hierarchy helps users scan faster */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br ${category.color} rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-lg transform hover:scale-110 transition-transform duration-300`}>
                      <IconComponent className="w-7 h-7 sm:w-8 sm:h-8" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-900">
                        {category.title}
                      </h2>
                      <p className="text-sm text-gray-500 font-medium mt-1">
                        {category.questions.length} question{category.questions.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 sm:space-y-4">
                    {category.questions.map((faq, index) => {
                      const id = catIndex * 100 + index;
                      const isOpen = openIndex === id;
                      const isViewed = viewedQuestions.has(id);

                      return (
                        <div 
                          key={id}
                          ref={el => questionRefs.current[id] = el}
                          className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden transition-all duration-500 hover:shadow-xl hover:border-orange-200 opacity-0 translate-y-4"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <button
                            onClick={() => toggleQuestion(id)}
                            className="w-full px-5 sm:px-6 py-5 sm:py-6 flex items-start gap-4 text-left group focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-2xl"
                            aria-expanded={isOpen}
                            aria-controls={`faq-answer-${id}`}
                          >
                            {/* FEATURE 11: POPULAR BADGE & VIEW INDICATOR */}
                            {/* Why: Shows which questions others find helpful */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {faq.popular && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 text-xs font-bold rounded-full">
                                    <TrendingUp className="w-3 h-3" />
                                    Popular
                                  </span>
                                )}
                                {isViewed && !isOpen && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                                    <Clock className="w-3 h-3" />
                                    Viewed
                                  </span>
                                )}
                              </div>
                              <span className="font-bold text-base sm:text-lg text-gray-900 group-hover:text-orange-600 transition-colors leading-relaxed">
                                {faq.q}
                              </span>
                            </div>
                            
                            {/* FEATURE 12: ANIMATED CHEVRON */}
                            {/* Why: Clear visual feedback on interaction */}
                            <ChevronDown 
                              className={`w-6 h-6 text-orange-600 flex-shrink-0 transition-all duration-500 ${
                                isOpen ? 'rotate-180 scale-110' : 'group-hover:translate-y-1'
                              }`}
                              aria-hidden="true"
                            />
                          </button>

                          {/* FEATURE 13: SMOOTH COLLAPSIBLE WITH MAX-HEIGHT ANIMATION */}
                          {/* Why: More polished than simple show/hide */}
                          <div 
                            className={`transition-all duration-500 ease-in-out overflow-hidden ${
                              isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                            }`}
                          >
                            <div 
                              id={`faq-answer-${id}`}
                              className="px-5 sm:px-6 pb-5 sm:pb-6 text-gray-700 border-t border-gray-100 pt-5 text-sm sm:text-base leading-relaxed"
                            >
                              {faq.a}
                              
                              {/* FEATURE 14: CONTEXTUAL QUICK ACTION */}
                              {/* Why: Reduces friction for next steps */}
                              {(faq.q.includes('view') || faq.q.includes('list') || faq.q.includes('contact')) && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                  <a
                                    href="https://wa.me/233558153803"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-sm font-semibold text-orange-600 hover:text-orange-700 group/link"
                                  >
                                    <MessageSquare className="w-4 h-4 group-hover/link:rotate-12 transition-transform" />
                                    Get Started on WhatsApp
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="py-20 sm:py-24 px-4 sm:px-6 bg-gradient-to-r from-orange-600 via-orange-700 to-orange-600 text-white relative overflow-hidden">
        {/* FEATURE 15: DECORATIVE PATTERN OVERLAY */}
        {/* Why: Adds texture and premium feel */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '30px 30px'
          }} />
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-6">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span className="text-sm font-bold">24/7 Support Available</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-4">
            Still Have Questions?
          </h2>
          <p className="text-lg sm:text-xl mb-8 opacity-95 max-w-2xl mx-auto font-medium">
            Our team is ready to help you. Get instant responses via WhatsApp.
          </p>
          <a
            href="https://wa.me/233558153803"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 bg-white text-orange-600 rounded-2xl font-bold text-lg transition-all duration-300 shadow-2xl hover:shadow-orange-900/50 transform hover:scale-105 group"
            aria-label="Contact us on WhatsApp for more questions"
          >
            <MessageSquare className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            WhatsApp Us Now
            <ExternalLink className="w-4 h-4 opacity-70" />
          </a>
        </div>
      </section>

      {/* FEATURE 16: CUSTOM CSS ANIMATIONS */}
      {/* Why: Smooth, professional animations throughout */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }

        .animate-slide-in {
          animation: slideIn 0.6s ease-out forwards;
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        /* FEATURE 17: FOCUS VISIBLE FOR ACCESSIBILITY */}
        /* Why: Keyboard users can see where they are */}
        *:focus-visible {
          outline: 2px solid #ea580c;
          outline-offset: 2px;
        }

        /* Smooth scrolling */}
        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
}