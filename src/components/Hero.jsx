import React from 'react';
import { motion } from 'framer-motion';
import { Phone, ArrowRight, ShieldCheck, CheckCircle2, FileCheck2, Landmark, Receipt, Sparkles, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Hero() {
  const { isAuthenticated } = useAuth();

  const handleScrollToSection = (e, id) => {
    e.preventDefault();
    const element = document.querySelector(id);
    if (element) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const fadeUpVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: (customDelay) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        delay: customDelay,
        ease: [0.25, 1, 0.5, 1]
      }
    })
  };

  const scaleFadeVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: (customDelay) => ({
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.8,
        delay: customDelay,
        ease: [0.25, 1, 0.5, 1]
      }
    })
  };

  return (
    <section id="home" className="relative pt-28 pb-16 md:pt-36 md:pb-24 flex items-center overflow-hidden">
      {/* Background Soft Glow Gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 -z-10 pointer-events-none">
        <div className="w-[320px] h-[320px] rounded-full bg-blue-400/10 blur-[90px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center relative z-10">
        
        {/* Left Column: Headline, Marathi Branding & CTAs */}
        <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left relative">
          
          {/* 1. Official Center Status Pill */}
          <motion.div 
            custom={0.1}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary font-semibold text-xs md:text-sm mb-5 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
            <span>अधिकृत केंद्र • Authorized Multi Services Center</span>
          </motion.div>

          {/* 2. Marathi Main Heading */}
          <motion.h1 
            custom={0.2}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="font-noto-devanagari text-3xl sm:text-4xl md:text-5xl font-bold tracking-normal leading-[1.3] mb-3 text-slate-900"
          >
            श्रीशैल मल्टिसर्विसेस, कसगी
          </motion.h1>

          {/* 3. English Value Tagline */}
          <motion.p 
            custom={0.3}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="text-lg sm:text-xl font-semibold text-brand-primary tracking-tight mb-4"
          >
            Reliable Services. Professional Solutions.
          </motion.p>

          {/* 4. Proprietor Glassmorphic Pill */}
          <motion.div 
            custom={0.4}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="mb-5"
          >
            <div className="bg-white/80 border border-slate-200 shadow-xs px-4 py-1.5 rounded-full text-xs sm:text-sm font-mukta font-semibold text-slate-700 inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>प्रो. प्रा. मान्तेश्वर सुंटनूरे</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 font-sans">Kasgi, Maharashtra</span>
            </div>
          </motion.div>

          {/* 5. Core Description */}
          <motion.p
            custom={0.5}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed max-w-xl mb-8"
          >
            Your comprehensive, trusted hub for online government citizen documentation, banking and cash withdrawal services, agricultural schemes, and modern business khata ledger management.
          </motion.p>

          {/* 6. Action Buttons */}
          <motion.div 
            custom={0.6}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto"
          >
            {/* Primary CTA: Contact Us */}
            <a
              href="#contact"
              onClick={(e) => handleScrollToSection(e, '#contact')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-brand-primary text-white font-semibold text-sm shadow-md shadow-brand-primary/20 hover:bg-brand-primary/95 transition-all duration-200 cursor-pointer"
            >
              <Phone className="w-4 h-4 text-white" />
              Contact Us Today
            </a>

            {/* Secondary CTA: Portal Login */}
            <Link
              to={isAuthenticated ? "/portal/dashboard" : "/login"}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white border border-slate-300 text-slate-800 font-semibold text-sm hover:bg-slate-50 shadow-xs transition-all duration-200"
            >
              <Building2 className="w-4 h-4 text-brand-primary" />
              {isAuthenticated ? "Open Business Portal" : "Portal Sign In"}
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>

            {/* Tertiary CTA: Explore Services */}
            <a
              href="#services"
              onClick={(e) => handleScrollToSection(e, '#services')}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-slate-600 font-semibold text-sm hover:text-brand-primary transition-colors cursor-pointer"
            >
              Explore Services
            </a>
          </motion.div>

          {/* Trust Highlights Strip */}
          <motion.div
            custom={0.7}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="mt-8 pt-6 border-t border-slate-200/80 flex items-center gap-6 text-xs text-slate-500 flex-wrap justify-center lg:justify-start"
          >
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>100% Verified Applications</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Realtime Digital Khata</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Transparent & Compliant</span>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Sleek Business Portal & Service Operations Card Graphic */}
        <motion.div 
          custom={0.3}
          variants={scaleFadeVariants}
          initial="hidden"
          animate="visible"
          className="lg:col-span-5 relative w-full max-w-[480px] lg:max-w-none mx-auto"
        >
          {/* Decorative Background Blur Glow */}
          <div className="absolute -inset-4 bg-gradient-to-tr from-brand-primary/10 via-blue-500/10 to-indigo-500/10 rounded-3xl blur-2xl -z-10" />

          {/* Main Card Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden text-left font-sans">
            {/* Window Top Bar */}
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-[11px] font-semibold text-slate-600 ml-2">
                  Shrishail Digital Services Desk
                </span>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active & Operational
              </span>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50/50 border-b border-slate-100 p-3 text-center">
              <div>
                <span className="text-xs font-bold text-slate-900 block">500+</span>
                <span className="text-[10px] text-slate-500 font-medium">Clients Served</span>
              </div>
              <div>
                <span className="text-xs font-bold text-brand-primary block">6+</span>
                <span className="text-[10px] text-slate-500 font-medium">Service Lines</span>
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-600 block">100%</span>
                <span className="text-[10px] text-slate-500 font-medium">Accuracy</span>
              </div>
            </div>

            {/* Live Operational Service Highlights */}
            <div className="p-4 space-y-3">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Core Service Capabilities
              </div>

              {/* Service Row 1 */}
              <div className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200/80 transition-colors flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-brand-primary flex items-center justify-center shrink-0">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Maha e-Seva & Documents</h4>
                    <p className="text-[10px] text-slate-500">PAN, Aadhaar, Caste & Income Certificates</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                  Prompt
                </span>
              </div>

              {/* Service Row 2 */}
              <div className="p-3 rounded-xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200/80 transition-colors flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Banking & AEPS Mini ATM</h4>
                    <p className="text-[10px] text-slate-500">Cash Withdrawal, DMT & Bill Payments</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                  Instant
                </span>
              </div>

              {/* Service Row 3 */}
              <div className="p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/80 transition-colors flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Business Khata Book & Ledger</h4>
                    <p className="text-[10px] text-slate-500">Audited Balance & WhatsApp Receipts</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-brand-primary bg-blue-50 px-2 py-0.5 rounded border border-blue-200 shrink-0">
                  Live Sync
                </span>
              </div>
            </div>

            {/* Card Footer Badge */}
            <div className="bg-slate-50/80 px-4 py-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-primary" />
                Dedicated Customer Support
              </span>
              <span className="font-semibold text-slate-700 font-mono">
                Kasgi • MH
              </span>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
