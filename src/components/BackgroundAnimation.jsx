import React from 'react';
import { motion } from 'framer-motion';

export default function BackgroundAnimation() {
  return (
    <div className="fixed inset-0 -z-50 w-full h-full overflow-hidden bg-white">
      {/* Subtle Grid Background */}
      <div 
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(37, 99, 235, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(37, 99, 235, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }}
      />
      
      {/* Soft Radial Fade Overlay */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-white/40 to-white" />

      {/* Floating Animated Gradient Blobs */}
      
      {/* Blob 1: Brand Primary */}
      <motion.div
        className="absolute w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] rounded-full bg-brand-primary/10 blur-[100px] -left-10 -top-10"
        animate={{
          x: [0, 80, -40, 0],
          y: [0, -60, 40, 0],
          scale: [1, 1.15, 0.9, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Blob 2: Brand Accent */}
      <motion.div
        className="absolute w-[45vw] h-[45vw] max-w-[600px] max-h-[600px] rounded-full bg-brand-accent/8 blur-[120px] -right-20 top-[20%]"
        animate={{
          x: [0, -100, 60, 0],
          y: [0, 80, -50, 0],
          scale: [1, 0.9, 1.1, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Blob 3: Soft Indigo/Purple Blend */}
      <motion.div
        className="absolute w-[35vw] h-[35vw] max-w-[450px] max-h-[450px] rounded-full bg-indigo-500/8 blur-[90px] left-[30%] bottom-[10%]"
        animate={{
          x: [0, 50, -60, 0],
          y: [0, 90, -40, 0],
          scale: [1, 1.1, 0.85, 1],
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Horizontal bottom line gradient indicator for pre-launch */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-primary/20 to-transparent" />
    </div>
  );
}
