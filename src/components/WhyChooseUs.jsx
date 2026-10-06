import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Clock, Layers, UserCheck } from 'lucide-react';

const highlights = [
  {
    icon: Clock,
    titleEn: 'Fast & Prompt Turnaround',
    titleMr: 'तत्पर आणि अचूक प्रक्रिया',
    description: 'We prioritize swift execution for citizen certificates, PAN updates, and government forms so you never lose valuable work time.',
    color: 'bg-blue-50 text-brand-primary border-blue-200',
  },
  {
    icon: ShieldCheck,
    titleEn: '100% Financial Transparency',
    titleMr: 'पारदर्शक डिजिटल व्यवहार',
    description: 'Our digital khata system records every credit and debit in real time, accompanied by verified WhatsApp transaction receipts.',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    icon: Layers,
    titleEn: 'Complete Multi-Service Hub',
    titleMr: 'एकाच छताखाली सर्व सुविधा',
    description: 'Avoid traveling to multiple offices. Access citizen documentation, banking, agricultural schemes, and business licensing in one spot.',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    icon: UserCheck,
    titleEn: 'Personal & Dedicated Guidance',
    titleMr: 'स्थानिक व विश्वासू मार्गदर्शन',
    description: 'Led by Prof. Manteshwar Suntnure, our team provides patient, step-by-step assistance for individuals, farmers, and business owners.',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const cardVariants = {
  hidden: { y: 25, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

export default function WhyChooseUs() {
  return (
    <section id="why-us" className="py-20 md:py-28 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="text-xs md:text-sm font-semibold tracking-wider text-brand-primary uppercase mb-2"
          >
            Why Choose Us • आमची वैशिष्ट्ये
          </motion.h2>
          <motion.h3
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-3"
          >
            Built on Trust, Precision & Dedicated Local Service
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-slate-600 text-sm md:text-base leading-relaxed"
          >
            Here is why residents, farmers, and entrepreneurs across Kasgi and surrounding areas choose Shrishail Multi Services.
          </motion.p>
        </div>

        {/* 4 Cards Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {highlights.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={index}
                variants={cardVariants}
                className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200/90 shadow-xs hover:bg-white hover:border-slate-300 hover:shadow-md transition-all duration-300 flex flex-col justify-between text-left"
              >
                <div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 border ${item.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  
                  <span className="text-[11px] font-mukta font-semibold text-slate-500 block mb-1">
                    {item.titleMr}
                  </span>

                  <h4 className="text-base font-bold text-slate-900 mb-2.5">
                    {item.titleEn}
                  </h4>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

      </div>
    </section>
  );
}
