import React from 'react';
import { motion } from 'framer-motion';
import { Phone, MapPin, Sparkles } from 'lucide-react';

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

  // Framer Motion Animation Variants for the staggered load-only sequence
  const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (customDelay) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        delay: customDelay,
        ease: [0.25, 1, 0.5, 1] // Premium easeOutCubic
      }
    })
  };

  const scaleFadeVariants = {
    hidden: { opacity: 0, scale: 0.92 },
    visible: (customDelay) => ({
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.9,
        delay: customDelay,
        ease: [0.25, 1, 0.5, 1]
      }
    })
  };

  return (
    <section id="home" className="relative min-h-screen pt-32 pb-20 md:pt-40 md:pb-32 flex items-center overflow-hidden">
      
      {/* Background Decorative Grid and Glowing Orbs for the Text Side (Behind Marathi Heading) */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 -z-10 pointer-events-none">
        {/* Subtle glowing blue gradients */}
        <div className="w-[300px] h-[300px] rounded-full bg-blue-400/10 blur-[80px]" />
        {/* Blurred circle */}
        <div className="absolute top-10 left-10 w-16 h-16 rounded-full bg-indigo-300/10 blur-xl animate-pulse" />
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 w-full grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 items-center relative z-10">
        
        {/* Left Content Side: Marathi Branding Centerpiece */}
        <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left relative">
          
          {/* Subtle grid layer behind the text for premium aesthetics */}
          <div 
            className="absolute -inset-4 -z-20 opacity-30 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(rgba(37, 99, 235, 0.1) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* 1. Launching Soon Badge */}
          <motion.div 
            custom={0.1}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary font-semibold text-xs md:text-sm mb-6 uppercase tracking-wider shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Launching Soon</span>
          </motion.div>

          {/* 2. Marathi Main Heading (Largest) */}
          <motion.h1 
            custom={0.3}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="font-noto-devanagari text-4xl sm:text-5xl md:text-6xl font-bold tracking-normal leading-[1.4] pt-[0.2em] pb-[0.15em] mb-4 text-transparent bg-clip-text bg-gradient-to-r from-brand-secondary via-indigo-950 to-brand-primary drop-shadow-[0_2px_10px_rgba(37,99,235,0.05)] overflow-visible"
          >
            श्रीशैल मल्टिसर्विसेस, कसगी
          </motion.h1>

          {/* 3. Subheading (Slightly smaller, medium weight, dark gray) */}
          <motion.p 
            custom={0.5}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="font-mukta text-2xl sm:text-3xl font-medium text-slate-700 tracking-wide mb-4"
          >
            लवकरच आपल्या सेवेत....
          </motion.p>

          {/* 4. Proprietor Name (Glassmorphic Pill) */}
          <motion.div 
            custom={0.7}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="mb-8"
          >
            <div className="bg-white/40 border border-white/60 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.05)] backdrop-blur-md px-5 py-2 rounded-full text-sm sm:text-base font-mukta font-medium text-slate-600 inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
              <span>प्रो. प्रा. मान्तेश्वर सुंटनूरे</span>
            </div>
          </motion.div>

          {/* Core Description Paragraph */}
          <motion.p
            custom={0.8}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="text-base sm:text-lg text-brand-muted font-normal leading-relaxed max-w-xl mb-10"
          >
            We are preparing to launch our official website. Shrishail Multi Services is committed to delivering reliable, professional, and trusted services. We look forward to serving you very soon.
          </motion.p>

          {/* 5. Action Buttons (Vertical stack on mobile, horizontal on desktop) */}
          <motion.div 
            custom={0.9}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            {/* Contact Us Button */}
            <motion.a
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              href="#contact"
              onClick={handleScrollToContact}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-brand-primary text-white font-medium text-base shadow-lg shadow-brand-primary/25 hover:shadow-xl hover:shadow-brand-primary/35 hover:bg-brand-primary/95 transition-all duration-300 cursor-pointer"
            >
              <Phone className="w-5 h-5 text-white" />
              Contact Us
            </motion.a>

            {/* Visit Us Button */}
            <motion.a
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              href="#contact"
              onClick={handleScrollToContact}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white border border-slate-200 text-brand-secondary font-medium text-base hover:bg-slate-50 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
            >
              <MapPin className="w-5 h-5 text-brand-primary" />
              Visit Us
            </motion.a>
          </motion.div>
        </div>

        {/* Right Side: Swinging Wooden Signboard Illustration (Option 3) */}
        <div className="lg:col-span-5 relative w-full aspect-[4/3] sm:aspect-square md:max-w-[480px] lg:max-w-none mx-auto flex items-center justify-center">
          
          {/* Animated Background Orbs and Rings behind the signboard */}
          <div className="absolute inset-0 -z-10 pointer-events-none">
            {/* Outer Decorative Rotating Ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-full border border-dashed border-brand-primary/15"
            />
            {/* Inner Rotating Ring */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-10 rounded-full border border-brand-primary/5"
            />
            {/* Glowing Orbs */}
            <div className="absolute top-1/4 right-1/4 w-40 h-40 rounded-full bg-gradient-to-tr from-brand-primary/25 to-brand-accent/25 blur-3xl opacity-60" />
            <div className="absolute bottom-1/4 left-1/4 w-32 h-32 rounded-full bg-indigo-400/20 blur-3xl opacity-50" />
          </div>

          {/* 6. Coming Soon Swinging Board (Animate on Load + continuous swinging) */}
          <motion.div
            custom={1.1}
            variants={scaleFadeVariants}
            initial="hidden"
            animate="visible"
            className="w-full flex items-center justify-center"
          >
            {/* Swinging motion assembly */}
            <motion.div
              animate={{ rotate: [-4, 4, -4] }}
              transition={{
                duration: 3.8,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              style={{ transformOrigin: 'top center' }}
              className="relative flex flex-col items-center"
            >
              {/* Chains / Ropes SVG */}
              <svg className="w-56 h-20 pointer-events-none" overflow="visible">
                {/* Left rope with dark amber color and twist pattern */}
                <line
                  x1="52" y1="0" x2="62" y2="76"
                  stroke="#7c2d12" strokeWidth="2.5" strokeLinecap="round"
                  strokeDasharray="3 1"
                />
                {/* Right rope */}
                <line
                  x1="172" y1="0" x2="162" y2="76"
                  stroke="#7c2d12" strokeWidth="2.5" strokeLinecap="round"
                  strokeDasharray="3 1"
                />
                
                {/* Metal wall anchors */}
                <circle cx="52" cy="0" r="5.5" fill="#475569" />
                <circle cx="172" cy="0" r="5.5" fill="#475569" />
                <circle cx="52" cy="0" r="2" fill="#1e293b" />
                <circle cx="172" cy="0" r="2" fill="#1e293b" />
              </svg>

              {/* Wooden Signboard */}
              <div className="w-64 sm:w-72 h-24 sm:h-26 bg-gradient-to-b from-amber-700 via-amber-800 to-amber-900 rounded-2xl border-4 border-amber-950 shadow-2xl relative flex flex-col items-center justify-center p-3 select-none">
                
                {/* Steel eyelets connecting the ropes */}
                <div className="absolute -top-3.5 left-14 w-4 h-4 rounded-full border-2 border-stone-400 bg-stone-600 shadow-sm flex items-center justify-center" />
                <div className="absolute -top-3.5 right-14 w-4 h-4 rounded-full border-2 border-stone-400 bg-stone-600 shadow-sm flex items-center justify-center" />
                
                {/* Carved inner outline */}
                <div className="absolute inset-1.5 border border-amber-600/30 rounded-xl pointer-events-none" />
                
                {/* Wood line patterns */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_50%,_transparent_50%)] bg-[length:100%_4px] opacity-20 rounded-2xl pointer-events-none" />
                
                {/* Decorative steel corner caps */}
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-amber-950/60 rounded-tl-[6px]" />
                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-amber-950/60 rounded-tr-[6px]" />
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-amber-950/60 rounded-bl-[6px]" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-amber-950/60 rounded-br-[6px]" />
                
                {/* Main COMING SOON text */}
                <span className="text-amber-100 font-sans font-black tracking-[0.16em] text-2xl sm:text-3xl drop-shadow-[0_2.5px_4px_rgba(0,0,0,0.8)]">
                  COMING SOON
                </span>
                
                {/* Secondary subtext */}
                <span className="text-[10px] sm:text-xs text-amber-200/50 font-bold tracking-[0.25em] uppercase mt-1">
                  • launch preparing •
                </span>
              </div>
            </motion.div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
