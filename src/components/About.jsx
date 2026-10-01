import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ShieldCheck, Award, Users, Clock } from 'lucide-react';

const coreValues = [
  "Accurate Citizen & Government Documentation",
  "Transparent Realtime Khata & Financial Ledgers",
  "Direct Assistance for Farmers & State Schemes",
  "Reliable Digital Banking & Cash Services"
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
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between aspect-square text-left shadow-xs">
              <span className="text-3xl md:text-4xl font-bold text-brand-primary">500+</span>
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-brand-secondary">Clients & Farmers</h4>
                <p className="text-[11px] text-brand-muted mt-0.5">Trusting our center for essential documents and services.</p>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="p-6 rounded-2xl bg-brand-primary text-white flex flex-col justify-between aspect-square text-left shadow-md shadow-brand-primary/10">
              <span className="text-3xl md:text-4xl font-bold">100%</span>
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-white">Accuracy & Transparency</h4>
                <p className="text-[11px] text-blue-100 mt-0.5">Every ledger entry and application verified with care.</p>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="p-6 rounded-2xl bg-brand-secondary text-white flex flex-col justify-between aspect-square text-left shadow-xs">
              <span className="text-3xl md:text-4xl font-bold">Multi</span>
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-white">Integrated Services</h4>
                <p className="text-[11px] text-slate-300 mt-0.5">Government certificates, banking, khata book, and insurance.</p>
              </div>
            </div>

            {/* Metric 4 */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between aspect-square text-left shadow-xs">
              <span className="text-3xl md:text-4xl font-bold text-emerald-600">Prompt</span>
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-brand-secondary">Fast Turnaround</h4>
                <p className="text-[11px] text-brand-muted mt-0.5">Swift processing to save your valuable time.</p>
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
            <h2 className="text-xs md:text-sm font-semibold tracking-wider text-brand-primary uppercase mb-2">
              About Shrishail Multi Services
            </h2>
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-brand-secondary tracking-tight mb-4">
              Your Trusted Partner for Digital, Government & Business Solutions
            </h3>
            
            <p className="text-slate-600 text-sm md:text-base leading-relaxed mb-4">
              Headquartered in <strong>Kasagi, Maharashtra</strong>, under the leadership of <strong>Prof. Manteshwar Suntnure (प्रो. प्रा. मान्तेश्वर सुंटनूरे)</strong>, <strong>Shrishail Multi Services</strong> was established with a singular mission: to bring professional, transparent, and hassle-free services directly to individuals, farmers, and local businesses.
            </p>
            
            <p className="text-slate-600 text-sm md:text-base leading-relaxed mb-6">
              Instead of navigating multiple distant offices and complicated online portals, our clients rely on us for seamless citizen certifications, financial ledger tracking, banking access, and government welfare scheme enrollments — all delivered with genuine integrity and personalized guidance.
            </p>

            {/* Values Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-100">
              {coreValues.map((value, index) => (
                <div key={index} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-slate-800">{value}</span>
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
