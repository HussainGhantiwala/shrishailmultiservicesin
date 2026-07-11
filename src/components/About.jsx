import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

const coreValues = [
  "Comprehensive Consultation & Guidance",
  "Tailored Digital & Operational Solutions",
  "Uncompromising Data Privacy & Security",
  "End-to-End Support and Optimization"
];

export default function About() {
  return (
    <section id="about" className="py-20 md:py-28 relative overflow-hidden bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Visual Metrics Cards */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-5 grid grid-cols-2 gap-4"
          >
            {/* Metric 1 */}
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col justify-between aspect-square text-left">
              <span className="text-4xl md:text-5xl font-bold text-brand-primary">99%</span>
              <div>
                <h4 className="text-sm font-semibold text-brand-secondary">Client Satisfaction</h4>
                <p className="text-xs text-brand-muted mt-1">Striving for exceptional feedback across all service lines.</p>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="p-6 rounded-3xl bg-brand-primary text-white flex flex-col justify-between aspect-square text-left shadow-lg shadow-brand-primary/10">
              <span className="text-4xl md:text-5xl font-bold">24/7</span>
              <div>
                <h4 className="text-sm font-semibold text-white">Dedicated Support</h4>
                <p className="text-xs text-blue-100 mt-1">Our support pipelines remain active for vital responses.</p>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="p-6 rounded-3xl bg-brand-secondary text-white flex flex-col justify-between aspect-square text-left">
              <span className="text-4xl md:text-5xl font-bold">Multi</span>
              <div>
                <h4 className="text-sm font-semibold text-white">Service Versatility</h4>
                <p className="text-xs text-slate-300 mt-1">Covering digital solutions, consultations, and operations.</p>
              </div>
            </div>

            {/* Metric 4 */}
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col justify-between aspect-square text-left">
              <span className="text-4xl md:text-5xl font-bold text-brand-accent">100%</span>
              <div>
                <h4 className="text-sm font-semibold text-brand-secondary">Trusted & Compliant</h4>
                <p className="text-xs text-brand-muted mt-1">Adhering to strict corporate and technical compliance.</p>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Narrative Copy */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-7 text-left"
          >
            <h2 className="text-xs md:text-sm font-semibold tracking-wider text-brand-primary uppercase mb-3">
              About Us
            </h2>
            <h3 className="text-3xl md:text-4xl font-bold text-brand-secondary tracking-tight mb-6">
              Simplifying Complexity with Multi-Service Excellence
            </h3>
            
            <p className="text-brand-muted text-sm md:text-base leading-relaxed mb-6">
              At <strong>Shrishail Multi Services</strong>, we act as a unified partner helping businesses and individuals navigate digital challenges, operational bottlenecks, and administrative consulting. We streamline fragmented processes by offering a comprehensive, highly reliable suite of services under one roof.
            </p>
            
            <p className="text-brand-muted text-sm md:text-base leading-relaxed mb-8">
              Whether preparing digital platforms, consulting on operations, or assisting in general agency solutions, we combine strict technical expertise with a deeply rooted dedication to client satisfaction.
            </p>

            {/* Values Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {coreValues.map((value, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary flex-shrink-0" />
                  <span className="text-[14px] font-medium text-brand-secondary">{value}</span>
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
