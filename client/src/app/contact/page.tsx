"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Mail, 
  Phone, 
  MapPin,
  MessageSquare,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");

  // REAL contact methods - simplified and honest
  const contactMethods = [
    {
      icon: <MessageSquare className="w-8 h-8" />,
      title: "WhatsApp (Fastest)",
      description: "Message Derek directly - I usually respond within 1 hour",
      info: "+233 558 153 803",
      action: "Start Chat",
      link: `https://wa.me/233558153803?text=${encodeURIComponent("Hello Derek! I want to ask about Ask Derek.")}`,
      color: "green"
    },
    {
      icon: <Mail className="w-8 h-8" />,
      title: "Email",
      description: "For detailed questions - I reply within 24 hours",
      info: "askderek7@gmail.com",
      action: "Send Email",
      link: "mailto:askderek7@gmail.com",
      color: "orange"
    },
    {
      icon: <Phone className="w-8 h-8" />,
      title: "Phone Call",
      description: "Mon-Sat, 8AM - 6PM GMT",
      info: "+233 558 153 803",
      action: "Call Now",
      link: "tel:+233558153803",
      color: "blue"
    }
  ];

  // REAL FAQs based on what people actually ask
  const faqs = [
    {
      q: "How do I know the properties are really verified?",
      a: "I personally visit every property. I meet the landlord face-to-face, check their ownership documents, take my own photos, and inspect the condition. Only then does it go on Ask Derek. My name is on this platform - I won't risk my reputation on fake listings."
    },
    {
      q: "Do I have to pay to use Ask Derek?",
      a: "No! Ask Derek is 100% free for renters. You pay nothing to search, view properties, or connect with landlords. I only charge landlords a small fee when they list verified properties."
    },
    {
      q: "How fast can I view a property?",
      a: "Usually within 24-48 hours! Just WhatsApp me which property you're interested in, and I'll coordinate directly with the landlord to schedule a viewing at a time that works for you."
    },
    {
      q: "Which areas do you cover right now?",
      a: "I'm launching in Tarkwa first (where I did my NSS and know the area best). Next up is Takoradi, then other parts of Western Region. Message me to get notified when I launch in your area!"
    },
    {
      q: "What if I have a problem with a property I found on Ask Derek?",
      a: "Contact me immediately on WhatsApp. Since I personally verified the property, I can help resolve issues or mediate with the landlord. Your satisfaction and safety are my priority."
    },
    {
      q: "Can I list my property on Ask Derek?",
      a: "Yes! If you're a property owner in Tarkwa or Takoradi, WhatsApp me. I'll come verify your property for free, and if it meets our standards, we'll list it on the platform."
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.email || !formData.message) {
      setStatus("error");
      setStatusMessage("Please fill in your name, email, and message");
      return;
    }

    setStatus("loading");

    try {
      // Pre-fill email with the form data
      const subject = encodeURIComponent(formData.subject || "Contact Form - Ask Derek");
      const body = encodeURIComponent(`
Hi Derek,

Name: ${formData.name}
Email: ${formData.email}
Phone: ${formData.phone || "Not provided"}

Message:
${formData.message}

---
Sent from Ask Derek Contact Form
      `);

      window.location.href = `mailto:askderek7@gmail.com?subject=${subject}&body=${body}`;

      setStatus("success");
      setStatusMessage("Opening your email app now! If it doesn't open, you can also WhatsApp me directly.");
      
      // Reset form after a delay
      setTimeout(() => {
        setFormData({
          name: "",
          email: "",
          phone: "",
          subject: "",
          message: ""
        });
        setStatus("idle");
        setStatusMessage("");
      }, 5000);

    } catch (error) {
      setStatus("error");
      setStatusMessage("Couldn't open email app. Please WhatsApp me instead - it's faster anyway!");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      
      {/* Hero Section */}
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
              <MessageSquare className="w-4 h-4" />
              <span>Let's Talk</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight mb-6">
              I'm Here to <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-orange-400">
                Help You
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed mb-4">
              Questions about a property? Need help finding a home? Want to list your property?
            </p>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              I'm Derek, the founder. You're not talking to a call center - you're talking directly to me. 
              Let's chat!
            </p>
          </motion.div>
        </div>
      </section>

      {/* Quick Contact Methods - The BEST way to reach Derek */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <h2 className="text-3xl md:text-4xl font-black mb-3">
              Best Ways to <span className="text-orange-600">Reach Me</span>
            </h2>
            <p className="text-lg text-gray-600">
              Pick whichever method works best for you
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {contactMethods.map((method, index) => (
              <motion.a
                key={method.title}
                href={method.link}
                target={method.link.startsWith('http') ? '_blank' : undefined}
                rel={method.link.startsWith('http') ? 'noopener noreferrer' : undefined}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                className="bg-white rounded-2xl p-8 shadow-lg border-2 hover:shadow-xl transition-all group cursor-pointer relative overflow-hidden"
                style={{
                  borderColor: method.color === 'green' ? '#86efac' : method.color === 'orange' ? '#fed7aa' : '#bfdbfe'
                }}
              >
                {/* Best choice badge for WhatsApp */}
                {method.color === 'green' && (
                  <div className="absolute top-4 right-4 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                    FASTEST
                  </div>
                )}

                <div className={`mb-4 group-hover:scale-110 transition-transform`}
                     style={{ color: method.color === 'green' ? '#16a34a' : method.color === 'orange' ? '#ea580c' : '#2563eb' }}>
                  {method.icon}
                </div>
                <h3 className="text-2xl font-bold mb-2 text-gray-900">
                  {method.title}
                </h3>
                <p className="text-gray-600 mb-3 text-sm">
                  {method.description}
                </p>
                <p className="text-base font-semibold text-gray-900 mb-4">
                  {method.info}
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all"
                     style={{
                       backgroundColor: method.color === 'green' ? '#dcfce7' : method.color === 'orange' ? '#ffedd5' : '#dbeafe',
                       color: method.color === 'green' ? '#166534' : method.color === 'orange' ? '#9a3412' : '#1e40af'
                     }}>
                  <span>{method.action}</span>
                  <Send className="w-4 h-4" />
                </div>
              </motion.a>
            ))}
          </div>

          {/* Pro Tip */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6 text-center"
          >
            <p className="text-green-800 font-semibold">
              💡 <span className="font-black">Pro Tip:</span> WhatsApp is the fastest! 
              I usually respond within 1 hour during business hours.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              Or Send a <span className="text-orange-600">Message</span>
            </h2>
            <p className="text-xl text-gray-600">
              Prefer email? Fill this form and I'll get back to you within 24 hours
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            onSubmit={handleSubmit}
            className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-8 shadow-xl border border-gray-100"
          >
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Your Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="e.g. Kwame Mensah"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="kwame@example.com"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="+233 XX XXX XXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  What's this about?
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                >
                  <option value="">Select a topic...</option>
                  <option value="Looking for a Home">I'm looking for a home</option>
                  <option value="List My Property">I want to list my property</option>
                  <option value="Property Question">Question about a specific property</option>
                  <option value="Partnership">Partnership opportunity</option>
                  <option value="Feedback">Feedback or suggestion</option>
                  <option value="General">Just saying hi / Other</option>
                </select>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Your Message *
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                rows={6}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none transition-all"
                placeholder="Tell me how I can help you. Be as detailed as you want!"
                required
              />
            </div>

            {status === "success" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg flex items-start gap-3"
              >
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-green-700 font-semibold">{statusMessage}</p>
              </motion.div>
            )}

            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-700 font-semibold mb-2">{statusMessage}</p>
                  <a
                    href={`https://wa.me/233558153803?text=${encodeURIComponent("Hi Derek! I tried the contact form but it didn't work. Here's my message:")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-green-700 hover:text-green-800 font-semibold"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Try WhatsApp instead →
                  </a>
                </div>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full px-8 py-4 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 disabled:bg-orange-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              {status === "loading" ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                  <span>Opening email...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Send Message</span>
                </>
              )}
            </button>
          </motion.form>
        </div>
      </section>

      {/* Location & Hours - REAL information */}
      <section className="py-20 px-6 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Location */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100"
            >
              <div className="text-orange-600 mb-4">
                <MapPin className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">
                Where I'm Based
              </h3>
              <p className="text-gray-700 font-semibold mb-3">
                Tarkwa, Western Region<br />
                Ghana 🇬🇭
              </p>
              <p className="text-gray-600 mb-4">
                I'm currently operating in Tarkwa and expanding to Takoradi. 
                All property verifications happen locally in these areas.
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-orange-900">
                  <span className="font-bold">Note:</span> I don't have a physical office yet - 
                  I meet clients at properties, coffee shops, or wherever works best for you. 
                  As we grow, we'll establish a proper office space!
                </p>
              </div>
            </motion.div>

            {/* Business Hours */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100"
            >
              <div className="text-orange-600 mb-4">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">
                When You Can Reach Me
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="font-semibold text-gray-700">Monday - Friday</span>
                  <span className="text-gray-900 font-bold">8:00 AM - 6:00 PM</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="font-semibold text-gray-700">Saturday</span>
                  <span className="text-gray-900 font-bold">9:00 AM - 4:00 PM</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="font-semibold text-gray-700">Sunday</span>
                  <span className="text-red-600 font-bold">Closed (Family Time)</span>
                </div>
              </div>
              <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 p-4 rounded-lg">
                <p className="text-sm text-green-900 font-semibold mb-1">
                  📱 WhatsApp Available Anytime!
                </p>
                <p className="text-sm text-green-700">
                  Send me a WhatsApp message anytime - I'll respond as soon as I can, 
                  even outside business hours for urgent matters.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ - Real questions people ask */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              Questions People <span className="text-orange-600">Actually Ask</span>
            </h2>
            <p className="text-xl text-gray-600">
              Quick answers to help you understand how Ask Derek works
            </p>
          </motion.div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-6 shadow-md border border-gray-100 hover:border-orange-200 transition-all"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  {faq.q}
                </h3>
                <p className="text-gray-600 leading-relaxed pl-7">
                  {faq.a}
                </p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-12 text-center bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-8 border-2 border-orange-200"
          >
            <p className="text-gray-800 text-lg mb-4 font-semibold">
              Still have questions? Don't be shy - ask me anything!
            </p>
            <p className="text-gray-600 mb-6">
              No question is too small or too simple. I'm here to help.
            </p>
            <a
              href={`https://wa.me/233558153803?text=${encodeURIComponent("Hi Derek! I have a question about Ask Derek:")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg hover:shadow-xl"
            >
              <MessageSquare className="w-5 h-5" />
              Ask Derek on WhatsApp
            </a>
          </motion.div>
        </div>
      </section>

    </div>
  );
};

export default ContactPage;