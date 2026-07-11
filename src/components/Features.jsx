import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Shield, Users, Award } from 'lucide-react';

const features = [
  {
    icon: Briefcase,
    title: 'Professional Services',
    description: 'Delivering expert, versatile business solutions tailored specifically to meet your unique operational demands.',
    color: 'from-blue-500/10 to-brand-primary/10',
    iconColor: 'text-brand-primary',
  },
  {
    icon: Shield,
    title: 'Trusted Solutions',
    description: 'Providing reliable, secure, and compliant services that protect your assets and build lasting credibility.',
    color: 'from-cyan-500/10 to-blue-500/10',
    iconColor: 'text-cyan-600',
  },
  {
    icon: Users,
    title: 'Customer Focus',
    description: 'Putting our clients at the center of everything, with dedicated account management and personalized support.',
    color: 'from-indigo-500/10 to-purple-500/10',
    iconColor: 'text-indigo-600',
  },
  {
    icon: Award,
    title: 'Quality Commitment',
    description: 'Upholding strict quality assurance standards and delivering exceptional value across all service channels.',
    color: 'from-brand-accent/10 to-emerald-500/10',
    iconColor: 'text-brand-accent',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: { y: 40, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

export default function Features() {
  return (
    <section id="services" className="py-20 md:py-28 bg-brand-bg-section/50 relative overflow-hidden">
      {/* Background soft blur shapes inside section */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[30vw] bg-blue-100/30 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5 }}
            className="text-xs md:text-sm font-semibold tracking-wider text-brand-primary uppercase mb-3"
          >
            Core Capabilities
          </motion.h2>
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold text-brand-secondary tracking-tight mb-4"
          >
            Designed for Reliability & Excellence
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-brand-muted text-base md:text-lg leading-relaxed"
          >
            We align deep domain expertise with customer-first solutions to support your business milestones.
          </motion.p>
        </div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                variants={cardVariants}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                className="group relative rounded-3xl p-8 bg-white/40 backdrop-blur-md border border-slate-200/50 hover:border-brand-primary/20 hover:bg-white/80 shadow-sm hover:shadow-xl hover:shadow-brand-primary/5 transition-all duration-300 flex flex-col items-start text-left overflow-hidden"
              >
                {/* Accent line on hover */}
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-brand-primary to-brand-accent scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

                {/* Icon Container */}
                <div className={`p-4 rounded-2xl bg-gradient-to-br ${feature.color} ${feature.iconColor} mb-6 transition-all duration-300 group-hover:scale-110`}>
                  <Icon className="w-6 h-6" />
                </div>

                {/* Feature Content */}
                <h4 className="text-lg font-semibold text-brand-secondary mb-3 group-hover:text-brand-primary transition-colors duration-200">
                  {feature.title}
                </h4>
                <p className="text-[14px] leading-relaxed text-brand-muted">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
