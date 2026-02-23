"use client";

import React, { useState, useEffect, useRef } from "react";
import { Shield, CheckCircle2, ChevronDown, Globe, Scale, FileText, AlertCircle, Printer, Mail, MessageSquare, MapPin, TrendingUp, Users, Building2, Award, ExternalLink, Eye, EyeOff } from "lucide-react";

export default function TermsPage() {
  const [openSections, setOpenSections] = useState(new Set([0]));
  const [readingProgress, setReadingProgress] = useState(0);
  const contentRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const progress = (scrollTop / (documentHeight - windowHeight)) * 100;
      setReadingProgress(Math.min(progress, 100));
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const sections = [
    {
      id: 1,
      title: "Acceptance of Terms",
      icon: CheckCircle2,
      category: "Foundation",
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-4">By accessing and using Ask Derek, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.</p>
          <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-lg">
            <p className="text-sm text-blue-900 font-medium"><strong>What this means:</strong> When you use our platform—whether you're browsing properties in Tarkwa, listing a room in Takoradi, or connecting with renters across Ghana—you're agreeing to play by these rules. Simple as that.</p>
          </div>
        </>
      )
    },
    {
      id: 2,
      title: "Description of Service",
      icon: Building2,
      category: "Foundation",
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-4">Ask Derek is a property listing verification and connection platform currently operating in Ghana. We connect renters with verified property listings and landlords across our service areas.</p>
          <div className="grid sm:grid-cols-2 gap-4 my-6">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-5 rounded-xl border border-orange-200">
              <MapPin className="w-8 h-8 text-orange-600 mb-3" />
              <h4 className="font-bold text-gray-900 mb-2">Current Coverage</h4>
              <p className="text-sm text-gray-700">Tarkwa, Western Region, Ghana</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl border border-green-200">
              <TrendingUp className="w-8 h-8 text-green-600 mb-3" />
              <h4 className="font-bold text-gray-900 mb-2">Expansion Plan</h4>
              <p className="text-sm text-gray-700">Takoradi → Ghana → Global</p>
            </div>
          </div>
          <div className="bg-amber-50 border-l-4 border-amber-600 p-4 rounded-r-lg">
            <p className="text-sm text-amber-900 font-medium"><strong>Important:</strong> We act solely as a facilitator connecting parties. We are not party to any rental agreements. All lease agreements are between landlord and tenant directly.</p>
          </div>
        </>
      )
    },
    {
      id: 3,
      title: "User Responsibilities",
      icon: Users,
      category: "Rights & Duties",
      content: (
        <>
          <div className="space-y-6">
            <div className="bg-white border-2 border-blue-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center"><Users className="w-5 h-5 text-white" /></div>
                <h3 className="text-xl font-bold text-gray-900">For Renters</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" /><span className="text-gray-700">Provide accurate information when inquiring about properties</span></li>
                <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" /><span className="text-gray-700">Conduct your own due diligence before signing any rental agreement</span></li>
                <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" /><span className="text-gray-700">Report any listing discrepancies or issues immediately</span></li>
                <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" /><span className="text-gray-700">Respect property viewing appointments and schedules</span></li>
              </ul>
            </div>
            <div className="bg-white border-2 border-orange-200 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center"><Building2 className="w-5 h-5 text-white" /></div>
                <h3 className="text-xl font-bold text-gray-900">For Landlords</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" /><span className="text-gray-700">Provide accurate and complete property information</span></li>
                <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" /><span className="text-gray-700">Maintain properties exactly as described in listings</span></li>
                <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" /><span className="text-gray-700">Honor all quoted prices and availability dates</span></li>
                <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" /><span className="text-gray-700">Comply with all Ghanaian housing and rental laws</span></li>
                <li className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" /><span className="text-gray-700">Update listing status promptly when property is rented</span></li>
              </ul>
            </div>
          </div>
        </>
      )
    },
    {
      id: 4,
      title: "Verification Process",
      icon: Award,
      category: "Trust & Safety",
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-4">Every property listing on Ask Derek undergoes our rigorous verification process. Our team personally visits each property, meets with landlords, verifies ownership documents, and captures authentic photographs.</p>
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl p-6 my-6">
            <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-orange-600" />Our Verification Includes:</h4>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-2"><span className="text-orange-600 font-bold">✓</span><span className="text-sm text-gray-700">Physical property inspection</span></div>
              <div className="flex items-start gap-2"><span className="text-orange-600 font-bold">✓</span><span className="text-sm text-gray-700">Ownership document verification</span></div>
              <div className="flex items-start gap-2"><span className="text-orange-600 font-bold">✓</span><span className="text-sm text-gray-700">Landlord identity confirmation</span></div>
              <div className="flex items-start gap-2"><span className="text-orange-600 font-bold">✓</span><span className="text-sm text-gray-700">Professional photography</span></div>
              <div className="flex items-start gap-2"><span className="text-orange-600 font-bold">✓</span><span className="text-sm text-gray-700">Pricing accuracy check</span></div>
              <div className="flex items-start gap-2"><span className="text-orange-600 font-bold">✓</span><span className="text-sm text-gray-700">Neighborhood assessment</span></div>
            </div>
          </div>
          <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-900 font-medium mb-2"><strong>Important Disclaimer:</strong></p>
                <p className="text-sm text-red-800">While we verify every listing with utmost care, property conditions can change over time. We cannot guarantee every detail indefinitely. Users must conduct their own due diligence before entering any rental agreement. We are not liable for changes or misrepresentations discovered after our initial verification.</p>
              </div>
            </div>
          </div>
        </>
      )
    },
    {
      id: 5,
      title: "Fees and Payments",
      icon: FileText,
      category: "Financial",
      content: (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center"><Users className="w-6 h-6 text-white" /></div>
                <h3 className="text-xl font-bold text-gray-900">For Renters</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-600" /><span className="text-gray-700 font-semibold">100% FREE Service</span></div>
                <p className="text-sm text-gray-600 ml-7">No browsing fees, no inquiry charges, no viewing costs, no hidden fees. Ever. From Tarkwa to the world, renters never pay.</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-300 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center"><Building2 className="w-6 h-6 text-white" /></div>
                <h3 className="text-xl font-bold text-gray-900">For Landlords</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-2"><CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" /><div><p className="text-gray-700 font-semibold">One-time listing fee</p><p className="text-sm text-gray-600">GH₵50-200 (property type dependent)</p></div></div>
                <div className="flex items-start gap-2"><CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" /><div><p className="text-gray-700 font-semibold">No monthly fees</p><p className="text-sm text-gray-600">Pay once, stay listed</p></div></div>
                <div className="flex items-start gap-2"><CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" /><div><p className="text-gray-700 font-semibold">No commission on rent</p><p className="text-sm text-gray-600">We don't take a cut of your earnings</p></div></div>
              </div>
              <div className="mt-4 p-3 bg-white rounded-lg border border-orange-200">
                <p className="text-xs text-gray-600"><strong>Note:</strong> Fees are non-refundable once verification begins. This covers our team's time, travel, and professional photography.</p>
              </div>
            </div>
          </div>
        </>
      )
    },
    {
      id: 6,
      title: "Limitation of Liability",
      icon: Scale,
      category: "Legal Protection",
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-4">Ask Derek provides services as is without warranties of any kind. We strive for excellence but cannot guarantee perfect outcomes in every situation.</p>
          <div className="bg-gray-50 border-2 border-gray-300 rounded-xl p-6 mb-4">
            <h4 className="font-bold text-gray-900 mb-4">We Are Not Liable For:</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3"><span className="text-gray-400 font-bold text-xl">×</span><span className="text-gray-700">Disputes, disagreements, or conflicts between renters and landlords</span></li>
              <li className="flex items-start gap-3"><span className="text-gray-400 font-bold text-xl">×</span><span className="text-gray-700">Property condition changes that occur after our verification date</span></li>
              <li className="flex items-start gap-3"><span className="text-gray-400 font-bold text-xl">×</span><span className="text-gray-700">Financial losses related to rental transactions or agreements</span></li>
              <li className="flex items-start gap-3"><span className="text-gray-400 font-bold text-xl">×</span><span className="text-gray-700">Landlord or tenant failure to honor agreements</span></li>
              <li className="flex items-start gap-3"><span className="text-gray-400 font-bold text-xl">×</span><span className="text-gray-700">Property damage, theft, or other incidents during tenancy</span></li>
              <li className="flex items-start gap-3"><span className="text-gray-400 font-bold text-xl">×</span><span className="text-gray-700">Issues arising from factors beyond our control or verification scope</span></li>
            </ul>
          </div>
          <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-lg">
            <p className="text-sm text-blue-900 font-medium"><strong>Our Commitment:</strong> While we limit liability for legal protection, we take pride in our service. If issues arise, we'll do our best to mediate and help resolve conflicts fairly—even though we're not legally required to do so.</p>
          </div>
        </>
      )
    },
    {
      id: 7,
      title: "Privacy & Data Protection",
      icon: Shield,
      category: "Privacy",
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-4">Your privacy matters to us. We collect and use personal information only as necessary to provide our services and improve your experience.</p>
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-bold text-green-900 mb-2 flex items-center gap-2"><Eye className="w-4 h-4" />We Collect:</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Contact information (name, phone, email)</li>
                <li>• Property details for listings</li>
                <li>• Communication history</li>
                <li>• Verification documents</li>
              </ul>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-bold text-red-900 mb-2 flex items-center gap-2"><EyeOff className="w-4 h-4" />We Never:</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Sell your data to third parties</li>
                <li>• Share personal info without consent</li>
                <li>• Use data for unrelated purposes</li>
                <li>• Store payment card details</li>
              </ul>
            </div>
          </div>
          <div className="bg-purple-50 border-l-4 border-purple-600 p-4 rounded-r-lg">
            <p className="text-sm text-purple-900 font-medium"><strong>International Standards:</strong> As we expand from Tarkwa to Ghana and globally, we're committed to meeting international data protection standards including GDPR compliance for future European operations.</p>
          </div>
        </>
      )
    },
    {
      id: 8,
      title: "Service Area & Expansion",
      icon: Globe,
      category: "Growth",
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-6">Ask Derek started in Tarkwa with a vision to revolutionize rental markets across Ghana and beyond. These terms govern our operations as we grow.</p>
          <div className="bg-gradient-to-r from-orange-100 via-amber-100 to-yellow-100 border-2 border-orange-300 rounded-xl p-8 mb-6">
            <h4 className="text-2xl font-black text-gray-900 mb-6 text-center">Our Growth Journey</h4>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0"><span className="text-white font-bold">1</span></div>
                <div className="flex-1"><h5 className="font-bold text-gray-900">Tarkwa (Current)</h5><p className="text-sm text-gray-600">Western Region, Ghana - Our foundation</p></div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center flex-shrink-0"><span className="text-white font-bold">2</span></div>
                <div className="flex-1"><h5 className="font-bold text-gray-900">Takoradi (Next)</h5><p className="text-sm text-gray-600">Expanding to Ghana's coastal hub</p></div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center flex-shrink-0"><span className="text-white font-bold">3</span></div>
                <div className="flex-1"><h5 className="font-bold text-gray-900">Ghana-Wide</h5><p className="text-sm text-gray-600">Accra, Kumasi, and beyond</p></div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0"><Globe className="w-6 h-6 text-white" /></div>
                <div className="flex-1"><h5 className="font-bold text-gray-900">Global Vision</h5><p className="text-sm text-gray-600">West Africa, then the world (God willing)</p></div>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-lg">
            <p className="text-sm text-blue-900 font-medium"><strong>Terms Scalability:</strong> These terms are designed to remain valid as we expand. New regions may have additional local requirements, which we'll communicate clearly when launching in those areas.</p>
          </div>
        </>
      )
    },
    {
      id: 9,
      title: "Dispute Resolution",
      icon: Scale,
      category: "Legal Protection",
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-4">We hope you never need this section, but if disputes arise, here's how we handle them:</p>
          <div className="space-y-4">
            <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0"><span className="text-white font-bold">1</span></div>
                <div><h4 className="font-bold text-gray-900 mb-1">Contact Us First</h4><p className="text-sm text-gray-600">Reach out via WhatsApp or email. Many issues are resolved through simple communication within 24-48 hours.</p></div>
              </div>
            </div>
            <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center flex-shrink-0"><span className="text-white font-bold">2</span></div>
                <div><h4 className="font-bold text-gray-900 mb-1">Mediation</h4><p className="text-sm text-gray-600">If direct resolution fails, we'll attempt to mediate between parties fairly and find a mutually acceptable solution.</p></div>
              </div>
            </div>
            <div className="bg-white border-2 border-gray-200 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0"><span className="text-white font-bold">3</span></div>
                <div><h4 className="font-bold text-gray-900 mb-1">Ghanaian Law</h4><p className="text-sm text-gray-600">These terms are governed by the laws of Ghana. Legal disputes fall under the jurisdiction of Ghanaian courts.</p></div>
              </div>
            </div>
          </div>
          <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-300 rounded-lg">
            <p className="text-sm text-gray-700"><strong>Good Faith Commitment:</strong> We believe most disputes arise from misunderstandings, not malice. We approach all conflicts with patience, empathy, and a genuine desire to find fair solutions for everyone involved.</p>
          </div>
        </>
      )
    },
    {
      id: 10,
      title: "Contact Information",
      icon: MessageSquare,
      category: "Support",
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-6">Have questions about these terms? We're here to help clarify anything.</p>
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            <a href="https://wa.me/233558153803" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl group">
              <MessageSquare className="w-8 h-8 group-hover:rotate-12 transition-transform" />
              <div><p className="font-bold text-sm">WhatsApp</p><p className="text-sm opacity-90">+233 558 153 803</p></div>
              <ExternalLink className="w-4 h-4 ml-auto opacity-70" />
            </a>
            <a href="mailto:askderek7@gmail.com" className="flex items-center gap-4 p-5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl group">
              <Mail className="w-8 h-8 group-hover:scale-110 transition-transform" />
              <div><p className="font-bold text-sm">Email</p><p className="text-sm opacity-90">askderek7@gmail.com</p></div>
              <ExternalLink className="w-4 h-4 ml-auto opacity-70" />
            </a>
          </div>
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-300 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <MapPin className="w-6 h-6 text-slate-600 flex-shrink-0 mt-1" />
              <div><h4 className="font-bold text-gray-900 mb-2">Headquarters</h4><p className="text-gray-700">Tarkwa, Western Region<br />Ghana, West Africa</p><p className="text-sm text-gray-500 mt-2 italic">Growing to serve Ghana and the world</p></div>
            </div>
          </div>
        </>
      )
    }
  ];

  const toggleSection = (index) => {
    const newOpenSections = new Set(openSections);
    if (newOpenSections.has(index)) {
      newOpenSections.delete(index);
    } else {
      newOpenSections.add(index);
    }
    setOpenSections(newOpenSections);
  };

  const expandAll = () => setOpenSections(new Set(sections.map((_, i) => i)));
  const collapseAll = () => setOpenSections(new Set());
  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <div className="fixed top-0 left-0 h-1 bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 z-50 transition-all duration-300" style={{ width: readingProgress + '%' }} />
      <section className="pt-24 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"><div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} /></div>
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6 border border-white/20"><Shield className="w-4 h-4 text-orange-400" /><span className="text-sm font-semibold">Legal Document</span></div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-4 sm:mb-6 leading-tight">Terms of <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">Service</span></h1>
          <p className="text-lg sm:text-xl text-gray-300 mb-3">Last Updated: January 29, 2026</p>
          <p className="text-sm text-gray-400 max-w-2xl mx-auto">Building trust from Tarkwa to the world 🇬🇭🌍</p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <button onClick={expandAll} className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-semibold transition-all duration-300"><ChevronDown className="w-4 h-4" />Expand All</button>
            <button onClick={collapseAll} className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-semibold transition-all duration-300"><ChevronDown className="w-4 h-4 rotate-180" />Collapse All</button>
            <button onClick={handlePrint} className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-semibold transition-all duration-300"><Printer className="w-4 h-4" />Print</button>
          </div>
        </div>
      </section>
      <section className="py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-start gap-4">
              <Shield className="w-8 h-8 text-orange-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-xl sm:text-2xl font-black text-orange-900 mb-3">Please Read Carefully</h3>
                <p className="text-gray-800 leading-relaxed mb-4">These Terms of Service govern your use of Ask Derek. By using our platform—whether browsing properties, listing rentals, or connecting with others—you agree to these terms.</p>
                <div className="flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full text-sm font-semibold text-gray-700 border border-orange-200"><CheckCircle2 className="w-4 h-4 text-green-600" />Clear & Fair</span>
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full text-sm font-semibold text-gray-700 border border-orange-200"><Globe className="w-4 h-4 text-blue-600" />International Standard</span>
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full text-sm font-semibold text-gray-700 border border-orange-200"><Scale className="w-4 h-4 text-purple-600" />Legally Binding</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section ref={contentRef} className="py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-4">
          {sections.map((section, index) => {
            const isOpen = openSections.has(index);
            const IconComponent = section.icon;
            return (
              <div key={section.id} className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-orange-300">
                <button onClick={() => toggleSection(index)} className="w-full px-5 sm:px-8 py-5 sm:py-6 flex items-center gap-4 text-left group">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"><IconComponent className="w-6 h-6 text-white" /></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1"><span className="text-xs font-bold text-orange-600 uppercase tracking-wider">{section.category}</span></div>
                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 group-hover:text-orange-600 transition-colors">{section.id}. {section.title}</h2>
                  </div>
                  <ChevronDown className={'w-6 h-6 text-orange-600 flex-shrink-0 transition-all duration-500 ' + (isOpen ? 'rotate-180 scale-110' : 'group-hover:translate-y-1')} />
                </button>
                <div className={'transition-all duration-500 ease-in-out overflow-hidden ' + (isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0')}>
                  <div className="px-5 sm:px-8 pb-6 sm:pb-8 border-t-2 border-gray-100 pt-6">{section.content}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-gradient-to-r from-orange-600 via-orange-700 to-orange-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"><div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} /></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4 sm:mb-6">Questions About These Terms?</h2>
          <p className="text-lg sm:text-xl text-white/90 mb-8 sm:mb-10 font-medium max-w-2xl mx-auto">We're happy to clarify anything. Reach out anytime—we're here to help.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="https://wa.me/233558153803" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg shadow-2xl transition-all duration-300 transform hover:scale-105 group">
              <MessageSquare className="w-6 h-6 group-hover:rotate-12 transition-transform" />WhatsApp Us<ExternalLink className="w-4 h-4 opacity-70" />
            </a>
            <a href="mailto:askderek7@gmail.com" className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-white hover:bg-gray-50 text-orange-600 rounded-xl font-bold text-lg shadow-2xl transition-all duration-300 transform hover:scale-105 group">
              <Mail className="w-6 h-6 group-hover:scale-110 transition-transform" />Email Us<ExternalLink className="w-4 h-4 opacity-70" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
