import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Phone, Sparkles } from 'lucide-react';

export default function Hero() {
  const handleScrollToContact = (e) => {
    e.preventDefault();
    const element = document.querySelector('#contact');
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

  return (
    <section id="home" className="relative min-h-screen pt-32 pb-20 md:pt-40 md:pb-32 flex items-center overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center relative z-10">
        
        {/* Left Content Side */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="lg:col-span-7 flex flex-col items-start text-left"
        >
          {/* Pre-launch Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary font-medium text-xs md:text-sm mb-6 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Under Development</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-brand-secondary tracking-tight leading-[1.1] mb-6">
            Something <span className="bg-gradient-to-r from-brand-primary via-blue-600 to-brand-accent bg-clip-text text-transparent">Exceptional</span> is on the Way
          </h1>

          {/* Subheading */}
          <p className="text-base sm:text-lg md:text-xl text-brand-muted font-normal leading-relaxed max-w-2xl mb-10">
            We're building a modern digital experience to better serve our clients. Our website is currently under development and will be launching soon.
          </p>

          {/* Call to Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <motion.a
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              href="#contact"
              onClick={handleScrollToContact}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-brand-primary text-white font-medium text-base shadow-lg shadow-brand-primary/25 hover:shadow-xl hover:shadow-brand-primary/35 hover:bg-brand-primary/95 transition-all duration-300"
            >
              Contact Us
              <ArrowRight className="w-5 h-5" />
            </motion.a>

            <motion.a
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              href="tel:+91XXXXXXXXXX"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white border border-slate-200 text-brand-secondary font-medium text-base hover:bg-slate-50 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <Phone className="w-5 h-5 text-brand-primary" />
              Call Now
            </motion.a>
          </div>
        </motion.div>

        {/* Right Gradient Abstract Artwork */}
        <div className="lg:col-span-5 relative w-full aspect-square md:max-w-[480px] lg:max-w-none mx-auto flex items-center justify-center">
          <div className="relative w-full h-full">
            
            {/* Outer Decorative Rotating Ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-full border border-dashed border-brand-primary/20"
            />
            
            {/* Inner Rotating Ring (Counter-direction) */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-8 rounded-full border border-brand-primary/10"
            />

            {/* Glowing Gradient Orb 1 */}
            <motion.div
              animate={{
                y: [0, -15, 15, 0],
                x: [0, 10, -10, 0],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-1/4 left-1/4 w-1/2 h-1/2 rounded-full bg-gradient-to-tr from-brand-primary/40 to-brand-accent/40 blur-3xl opacity-75"
            />

            {/* Glowing Gradient Orb 2 */}
            <motion.div
              animate={{
                y: [0, 20, -20, 0],
                x: [0, -15, 15, 0],
              }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute bottom-1/4 right-1/4 w-1/2 h-1/2 rounded-full bg-gradient-to-br from-indigo-500/35 to-blue-500/35 blur-3xl opacity-75"
            />

            {/* Glassmorphic Layer 1 - Floating Dashboard Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
              whileHover={{ y: -8 }}
              className="absolute inset-x-8 top-12 bottom-20 md:inset-x-12 md:top-16 md:bottom-24 rounded-3xl bg-white/40 backdrop-blur-xl border border-white/60 shadow-2xl p-6 md:p-8 flex flex-col justify-between overflow-hidden"
            >
              {/* Card Header styling */}
              <div className="flex justify-between items-center">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                  <div className="w-3 h-3 rounded-full bg-green-400/80" />
                </div>
                <div className="w-16 h-2 rounded bg-slate-200" />
              </div>

              {/* Card Main Graphics */}
              <div className="my-auto space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-primary to-brand-accent text-white flex items-center justify-center font-bold text-lg shadow-md shadow-brand-primary/20">
                    S
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 w-1/2 rounded bg-slate-800/80" />
                    <div className="h-2.5 w-3/4 rounded bg-slate-400/60" />
                  </div>
                </div>
                
                {/* Horizontal Separator */}
                <div className="h-px bg-slate-200/50" />
                
                {/* Bar Graph Illustration */}
                <div className="flex items-end gap-3 h-24 pt-4 px-2">
                  <motion.div initial={{ height: 0 }} animate={{ height: '40%' }} transition={{ duration: 1, delay: 0.6 }} className="flex-1 rounded-t-lg bg-slate-200/80" />
                  <motion.div initial={{ height: 0 }} animate={{ height: '75%' }} transition={{ duration: 1, delay: 0.8 }} className="flex-1 rounded-t-lg bg-gradient-to-t from-brand-primary to-brand-accent" />
                  <motion.div initial={{ height: 0 }} animate={{ height: '55%' }} transition={{ duration: 1, delay: 0.7 }} className="flex-1 rounded-t-lg bg-slate-300/80" />
                  <motion.div initial={{ height: 0 }} animate={{ height: '90%' }} transition={{ duration: 1, delay: 0.9 }} className="flex-1 rounded-t-lg bg-gradient-to-t from-brand-accent to-blue-300" />
                </div>
              </div>

              {/* Card Footer details */}
              <div className="flex justify-between items-center pt-2">
                <div className="h-3 w-1/3 rounded bg-slate-200" />
                <div className="h-5 w-12 rounded-full bg-brand-primary/10 border border-brand-primary/20" />
              </div>

              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000" />
            </motion.div>

            {/* Glassmorphic Small Card Overlay */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.6 }}
              whileHover={{ scale: 1.05 }}
              className="absolute bottom-8 right-4 md:bottom-12 md:right-8 bg-white/85 backdrop-blur-lg border border-slate-200/50 shadow-xl rounded-2xl p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <div className="w-3.5 h-3.5 rounded-full bg-green-500 animate-pulse" />
              </div>
              <div className="text-left">
                <div className="text-xs text-brand-muted font-medium">System Status</div>
                <div className="text-sm font-semibold text-brand-secondary">Ready to Launch</div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
