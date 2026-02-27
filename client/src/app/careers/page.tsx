"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Briefcase, 
  MapPin, 
  Clock,
  TrendingUp,
  Users,
  Heart,
  CheckCircle2,
  Send,
  DollarSign,
  Calendar,
  Award,
  Target,
  Sparkles
} from "lucide-react";

const CareersPage = () => {
  const [selectedJob, setSelectedJob] = useState<number | null>(null);

  // REAL JOB OPENINGS - Only what you actually need right now
  const jobs = [
    {
      id: 1,
      title: "Property Verification Agent",
      location: "Takoradi, Western Region",
      type: "Full-time",
      salary: "GH₵800 - GH₵1,200/month + Commission",
      posted: "Just posted",
      description: "Help us expand Ask Derek to Takoradi! We need someone local who can visit properties, verify listings, meet landlords, and help renters find safe, quality homes.",
      responsibilities: [
        "Visit and photograph properties in Takoradi and surrounding areas",
        "Meet landlords to verify ownership and property condition",
        "Update property listings with accurate, honest information",
        "Respond to renter questions via WhatsApp and phone calls",
        "Build trust with property owners in the community",
        "Arrange and conduct property viewings"
      ],
      requirements: [
        "Must live in or near Takoradi",
        "Own a smartphone with good camera quality",
        "Speak English and Twi/Fante fluently",
        "Honest, reliable, and punctual personality",
        "Have motorcycle or car (we provide fuel allowance)",
        "Know Takoradi neighborhoods well"
      ],
      benefits: [
        "Monthly salary PLUS commission for every successful rental",
        "Fuel/transport reimbursement",
        "Phone and data allowance",
        "Flexible schedule - work around your life",
        "Grow with the company as we expand to more cities",
        "Be part of something meaningful - helping Ghanaians find safe homes"
      ],
      urgent: true
    },
    {
      id: 2,
      title: "Future Opportunities",
      location: "Tarkwa & Takoradi",
      type: "Various roles",
      salary: "Based on role",
      posted: "Opening soon",
      description: "As Ask Derek grows, we'll need customer service reps, social media managers, and more team members. Submit your CV now to be considered when these roles open.",
      responsibilities: [
        "Roles will include customer service, marketing, operations",
        "Help maintain quality standards across the platform",
        "Support property agents and customers",
        "Grow the Ask Derek brand in Western Region and beyond"
      ],
      requirements: [
        "Live in Tarkwa or Takoradi area",
        "Strong communication skills",
        "Passionate about real estate and helping people",
        "Willing to learn and grow with a startup",
        "Computer literate (basic Google Sheets, WhatsApp)"
      ],
      benefits: [
        "Competitive salary based on role",
        "Ground floor opportunity - shape the company",
        "Learn real estate and business skills",
        "Career advancement as we grow",
        "Be part of Ghana's housing solution"
      ],
      urgent: false,
      comingSoon: true
    }
  ];

  const perks = [
    {
      icon: <Heart className="w-6 h-6" />,
      title: "Meaningful Mission",
      description: "I started Ask Derek after seeing people struggle to find safe, verified homes during my NSS at Tarkwa Goldfields. Every person you help is a real family avoiding scams and finding peace of mind."
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Real Growth Opportunity",
      description: "We're starting in Tarkwa, expanding to Takoradi, with plans for all of Ghana. Join early and grow into leadership roles as we expand. This is just the beginning."
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Direct Impact",
      description: "Small team means your work matters immediately. No bureaucracy, no red tape. You work directly with the founder, and your ideas shape the company."
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "Build Something Lasting",
      description: "This isn't just a job - it's building infrastructure Ghana needs. With God's blessing and hard work, we're creating something that will serve generations."
    }
  ];

  const handleApply = (jobTitle: string) => {
    const subject = encodeURIComponent(`Job Application: ${jobTitle}`);
    const body = encodeURIComponent(`Dear Derek,

I am applying for the ${jobTitle} position at Ask Derek.

Full Name: 
Current Location: 
Phone Number: 
Email Address:

Why I'm interested in Ask Derek:


Why I'm the right fit for this role:


My relevant experience:


When can I start:

Available for interview: Yes / No

Thank you for considering my application.`);
    
    window.location.href = `mailto:askderek7@gmail.com?subject=${subject}&body=${body}`;
  };

  const handleWhatsAppApply = (jobTitle: string) => {
    const message = encodeURIComponent(`Hello Derek! I'm interested in the ${jobTitle} position at Ask Derek. Can we discuss the opportunity?`);
    window.open(`https://wa.me/233558153803?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      
      {/* Hero Section - YOUR REAL STORY */}
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
              <Briefcase className="w-4 h-4" />
              <span>We're Hiring - Join Our Mission</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight mb-6">
              Help Build <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-orange-400">
                Ghana's Housing Future
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-4">
              I'm Derek. I just completed my NSS at Tarkwa Goldfields in December 2025. 
              While there, I saw too many people struggle to find safe, verified homes.
            </p>

            <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed mb-8">
              <span className="font-semibold text-gray-900">Ask Derek</span> is my solution: a platform where every property is verified, 
              every landlord is real, and every Ghanaian can find quality housing with confidence. 
              We're starting in Tarkwa, expanding to Takoradi, and with God's grace, serving all of Ghana and beyond.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="#openings"
                className="px-8 py-4 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg"
              >
                See Open Positions
              </a>
              <button
                onClick={() => handleWhatsAppApply("General Inquiry")}
                className="px-8 py-4 bg-white text-orange-600 border-2 border-orange-600 rounded-xl font-bold hover:bg-orange-50 transition-all"
              >
                Chat on WhatsApp
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why Join Us */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              Why Join <span className="text-orange-600">Ask Derek?</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              This is more than a job - it's a chance to solve a real problem affecting 
              millions of Ghanaians every day
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {perks.map((perk, index) => (
              <motion.div
                key={perk.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:border-orange-200 transition-all"
              >
                <div className="text-orange-600 mb-4">
                  {perk.icon}
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">
                  {perk.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {perk.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section id="openings" className="py-20 px-6 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              Open <span className="text-orange-600">Positions</span>
            </h2>
            <p className="text-xl text-gray-600">
              {jobs.filter(j => !j.comingSoon).length} active opening - Apply today!
            </p>
          </motion.div>

          <div className="space-y-6">
            {jobs.map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white rounded-2xl shadow-lg border-2 transition-all overflow-hidden ${
                  job.urgent 
                    ? 'border-orange-500 ring-2 ring-orange-200' 
                    : 'border-gray-100 hover:border-orange-200'
                }`}
              >
                {/* Job Header */}
                <div 
                  className="p-6 cursor-pointer"
                  onClick={() => setSelectedJob(selectedJob === job.id ? null : job.id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-2xl font-black text-gray-900">
                          {job.title}
                        </h3>
                        {job.urgent && (
                          <span className="px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-full">
                            HIRING NOW
                          </span>
                        )}
                        {job.comingSoon && (
                          <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                            COMING SOON
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-orange-600" />
                          <span>{job.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-orange-600" />
                          <span>{job.type}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <span className="font-semibold text-green-700">{job.salary}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{job.posted}</span>
                        </div>
                      </div>

                      <p className="text-gray-700 leading-relaxed">
                        {job.description}
                      </p>
                    </div>
                    
                    <button className="ml-4 text-orange-600 hover:text-orange-700 font-semibold whitespace-nowrap">
                      {selectedJob === job.id ? '↑ Hide' : '↓ Details'}
                    </button>
                  </div>
                </div>

                {/* Job Details (Expandable) */}
                {selectedJob === job.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-6 pb-6 border-t border-gray-100"
                  >
                    <div className="grid md:grid-cols-3 gap-8 py-6">
                      {/* Responsibilities */}
                      <div>
                        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <Target className="w-5 h-5 text-orange-600" />
                          What You'll Do
                        </h4>
                        <ul className="space-y-2">
                          {job.responsibilities.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Requirements */}
                      <div>
                        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-orange-600" />
                          What We Need
                        </h4>
                        <ul className="space-y-2">
                          {job.requirements.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                              <CheckCircle2 className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Benefits */}
                      <div>
                        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <Award className="w-5 h-5 text-orange-600" />
                          What You Get
                        </h4>
                        <ul className="space-y-2">
                          {job.benefits.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                              <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Apply Buttons */}
                    {!job.comingSoon && (
                      <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-100">
                        <button
                          onClick={() => handleApply(job.title)}
                          className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                        >
                          <Send className="w-5 h-5" />
                          Apply via Email
                        </button>
                        <button
                          onClick={() => handleWhatsAppApply(job.title)}
                          className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg"
                        >
                          <Send className="w-5 h-5" />
                          Apply via WhatsApp
                        </button>
                      </div>
                    )}

                    {job.comingSoon && (
                      <div className="pt-6 border-t border-gray-100">
                        <button
                          onClick={() => handleApply("Future Opportunities - Interested")}
                          className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                        >
                          <Send className="w-5 h-5" />
                          Submit CV for Future Roles
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* General Application Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-black mb-6">
              Have Other Skills?
            </h2>
            <p className="text-xl text-gray-600 mb-4">
              Maybe you're a developer, designer, marketer, or real estate professional. 
              Even if we don't have an opening now, I'd love to hear from you.
            </p>
            <p className="text-lg text-gray-600 mb-8">
              Send me your CV and let's talk about how you can be part of Ask Derek's journey.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => handleApply("General Application - Other Skills")}
                className="px-8 py-4 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg"
              >
                Send Your CV
              </button>
              <button
                onClick={() => handleWhatsAppApply("General Inquiry")}
                className="px-8 py-4 bg-white text-orange-600 border-2 border-orange-600 rounded-xl font-bold hover:bg-orange-50 transition-all"
              >
                Let's Talk on WhatsApp
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Values Section - What We Stand For */}
      <section className="py-20 px-6 bg-gradient-to-br from-orange-600 to-orange-500 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-black mb-8">
              What We Believe
            </h2>
            <div className="grid md:grid-cols-3 gap-8 text-left">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <h3 className="text-2xl font-bold mb-3">🎯 Honesty First</h3>
                <p className="text-orange-50">
                  Every property verified. Every landlord checked. No shortcuts. 
                  We build trust by being truthful, always.
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <h3 className="text-2xl font-bold mb-3">💪 Work Smart</h3>
                <p className="text-orange-50">
                  We're a small team building something big. Your effort matters. 
                  Take ownership, solve problems, make impact.
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <h3 className="text-2xl font-bold mb-3">🙏 Trust God</h3>
                <p className="text-orange-50">
                  With hard work and God's blessing, we'll grow from Tarkwa 
                  to serve all of Ghana and beyond. Have faith.
                </p>
              </div>
            </div>
            
            <div className="mt-12 bg-white/10 backdrop-blur-sm rounded-xl p-8">
              <p className="text-xl text-orange-50 leading-relaxed">
                <span className="font-bold text-white">Real talk:</span> Ask Derek is self-funded. 
                I'm building this with my own resources because I believe in it. 
                No investors yet, no fancy office - just real work solving a real problem. 
                If you join now, you're not just getting a job. You're building something from the ground up 
                that could change how millions of Ghanaians find homes.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-6 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4 text-gray-900">
            Ready to Build Something Meaningful?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Whether you're applying for a specific role or just want to connect, 
            reach out. Let's talk about how we can work together.
          </p>
          <button
            onClick={() => handleWhatsAppApply("I'm Ready to Join Ask Derek")}
            className="px-8 py-4 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg inline-flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
            Start the Conversation
          </button>
        </div>
      </section>

    </div>
  );
};

export default CareersPage;