import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function Preloader({ onComplete }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Increment progress bar to simulate loading
    const duration = 3200; // 3.2 seconds of animation
    const intervalTime = 32; // ~30 fps
    const steps = duration / intervalTime;
    const increment = 100 / steps;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + increment;
      });
    }, intervalTime);

    // Call onComplete when the timer expires
    const completeTimer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, 3800); // 3.8 seconds total to allow for animations

    return () => {
      clearInterval(timer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  // Framer Motion variants for staggered sequential entry
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.4, // Stagger elements by 0.4 seconds
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: 'easeOut',
      },
    },
  };

  const logoVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    show: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
      },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ 
        opacity: 0,
        scale: 1.03,
        filter: 'blur(15px)',
        transition: { duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-gradient-to-tr from-blue-50 via-indigo-50 to-sky-100"
    >
      {/* Background Animated Floating Blobs */}
      {/* Blob 1 */}
      <motion.div
        className="absolute w-[60vw] h-[60vw] md:w-[40vw] md:h-[40vw] rounded-full bg-blue-400/20 blur-[80px] md:blur-[120px] -left-20 -top-20"
        animate={{
          x: [0, 40, -20, 0],
          y: [0, -30, 20, 0],
          scale: [1, 1.1, 0.9, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      {/* Blob 2 */}
      <motion.div
        className="absolute w-[50vw] h-[50vw] md:w-[35vw] md:h-[35vw] rounded-full bg-indigo-400/15 blur-[90px] md:blur-[130px] right-[-10%] top-[30%]"
        animate={{
          x: [0, -50, 30, 0],
          y: [0, 40, -30, 0],
          scale: [1, 0.95, 1.05, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      {/* Blob 3 */}
      <motion.div
        className="absolute w-[55vw] h-[55vw] md:w-[30vw] md:h-[30vw] rounded-full bg-sky-300/20 blur-[70px] md:blur-[100px] left-[25%] -bottom-10"
        animate={{
          x: [0, 30, -30, 0],
          y: [0, 20, -40, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Glassmorphic Preloader Card Container */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 w-[90%] max-w-2xl bg-white/40 border border-white/60 shadow-[0_25px_50px_-12px_rgba(37,99,235,0.12)] backdrop-blur-xl rounded-3xl p-8 md:p-12 flex flex-col items-center text-center gap-6 md:gap-8"
      >
        {/* Brand Icon Logo */}
        <motion.div variants={logoVariants} className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-primary to-brand-accent flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-brand-primary/25">
            S
          </div>
          <span className="text-xs uppercase tracking-[0.25em] font-semibold text-brand-primary">
            Shrishail Multi Services
          </span>
        </motion.div>

        {/* Marathi Text Group (Staggered Animations) */}
        <div className="flex flex-col gap-4 w-full">
          {/* Company Name */}
          <motion.h1
            variants={itemVariants}
            className="font-rozha text-3xl sm:text-4xl md:text-5xl font-bold tracking-normal text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-800 to-blue-900 leading-tight"
          >
            श्रीशैल मल्टिसर्विसेस, कसगी
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="font-mukta text-xl sm:text-2xl font-medium text-slate-700 tracking-wide"
          >
            लवकरच आपल्या सेवेत....
          </motion.p>

          {/* Divider Line */}
          <motion.div
            variants={itemVariants}
            className="w-16 h-[2px] bg-gradient-to-r from-transparent via-indigo-300 to-transparent mx-auto my-1"
          />

          {/* Proprietor details */}
          <motion.div
            variants={itemVariants}
            className="text-sm sm:text-base font-mukta font-medium text-slate-600 bg-white/50 border border-white/40 rounded-full px-5 py-1.5 shadow-sm inline-block mx-auto"
          >
            प्रो. प्रा. मान्तेश्वर सुंटनूरे
          </motion.div>
        </div>

        {/* Animated Swinging Signboard Section */}
        <motion.div 
          variants={itemVariants}
          className="w-full flex items-center justify-center mt-3 mb-1"
        >
          {/* Combined swing assembly (Anchor, ropes, and board) */}
          <motion.div
            initial={{ rotate: -5 }}
            animate={{ rotate: [ -5, 5, -5 ] }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            style={{ transformOrigin: 'top center' }}
            className="relative flex flex-col items-center"
          >
            {/* Ropes SVG */}
            <svg className="w-48 h-12 pointer-events-none" overflow="visible">
              {/* Left Rope */}
              <line
                x1="44" y1="0" x2="52" y2="48"
                stroke="#78350f" strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray="2 1"
              />
              {/* Right Rope */}
              <line
                x1="140" y1="0" x2="132" y2="48"
                stroke="#78350f" strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray="2 1"
              />
              {/* Ceiling Hooks */}
              <circle cx="44" cy="0" r="4.5" fill="#475569" />
              <circle cx="140" cy="0" r="4.5" fill="#475569" />
            </svg>

            {/* Wooden Signboard */}
            <div className="w-56 sm:w-60 h-20 sm:h-22 bg-gradient-to-b from-amber-700 via-amber-800 to-amber-900 rounded-xl border-[3px] border-amber-950 shadow-2xl relative flex flex-col items-center justify-center p-2">
              {/* Eyelets/Hanging Rings on the board */}
              <div className="absolute -top-3 left-11 w-3.5 h-3.5 rounded-full border-2 border-stone-400 bg-stone-600 shadow-sm flex items-center justify-center" />
              <div className="absolute -top-3 right-11 w-3.5 h-3.5 rounded-full border-2 border-stone-400 bg-stone-600 shadow-sm flex items-center justify-center" />
              
              {/* Inner carved outline */}
              <div className="absolute inset-1.5 border border-amber-600/35 rounded-lg pointer-events-none" />
              
              {/* Subtle wood grain line pattern */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_50%,_transparent_50%)] bg-[length:100%_3px] opacity-25 rounded-xl pointer-events-none" />
              
              {/* Metal Corner Accents */}
              <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-amber-950/50 rounded-tl-[4px]" />
              <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-amber-950/50 rounded-tr-[4px]" />
              <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-amber-950/50 rounded-bl-[4px]" />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-amber-950/50 rounded-br-[4px]" />
              
              {/* Sign Text */}
              <span className="text-amber-100 font-sans font-black tracking-[0.15em] text-xl sm:text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] select-none">
                COMING SOON
              </span>
              
              {/* Wooden plate subtext */}
              <span className="text-[9px] text-amber-200/50 font-bold tracking-[0.25em] uppercase select-none mt-0.5">
                • under construction •
              </span>
            </div>
          </motion.div>
        </motion.div>

        {/* Loading Progress Indicator (Elegant slim bar) */}
        <motion.div 
          variants={itemVariants} 
          className="w-48 sm:w-60 flex flex-col items-center gap-2 mt-2"
        >
          <div className="w-full h-1 bg-slate-200/50 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-brand-primary to-brand-accent"
              style={{ width: `${progress}%` }}
              transition={{ ease: 'easeOut' }}
            />
          </div>
          <span className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">
            Loading Experience {Math.min(100, Math.round(progress))}%
          </span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
