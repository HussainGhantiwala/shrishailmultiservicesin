import React from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Landmark,
  Receipt,
  Sprout,
  Building2,
  ShieldCheck,
  Check,
} from 'lucide-react';

const services = [
  {
    icon: FileText,
    titleEn: 'Government & Citizen Services',
    titleMr: 'शासकीय व नागरिक ई-सेवा',
    description: 'Complete assistance for official government applications, state certificates, and citizen documentation.',
    color: 'from-blue-500/10 to-brand-primary/15',
    iconColor: 'text-brand-primary',
    points: [
      'Maha e-Seva & Aaple Sarkar Services',
      'PAN Card Application & Corrections',
      'Aadhaar Services & Updates',
      'Caste, Income & Domicile Certificates',
    ],
  },
  {
    icon: Landmark,
    titleEn: 'Digital Banking & Money Transfer',
    titleMr: 'डिजिटल बँकिंग व मनी ट्रान्सफर',
    description: 'Instant banking solutions right at your doorstep with authorized AEPS and seamless domestic money transfers.',
    color: 'from-emerald-500/10 to-teal-500/15',
    iconColor: 'text-emerald-700',
    points: [
      'AEPS Cash Withdrawal & Mini Statement',
      'Domestic Money Transfer (DMT)',
      'Electricity, Gas & Water Bill Payments',
      'Mobile / DTH Recharge & FASTag',
    ],
  },
  {
    icon: Receipt,
    titleEn: 'Business Khata Book & Ledger',
    titleMr: 'व्यापारी खातेवही व डिजिटल लेजर',
    description: 'Our proprietary digital portal simplifies daily credit, debit, running balances, and transaction accounting for businesses.',
    color: 'from-indigo-500/10 to-blue-500/15',
    iconColor: 'text-indigo-600',
    points: [
      'Daily Credit & Debit Transaction Recording',
      'Live Running Balances & Statements',
      'Direct WhatsApp & Email Receipt Sharing',
      'Exportable Financial & Audit Reports',
    ],
  },
  {
    icon: Sprout,
    titleEn: 'Agriculture & Farmer Welfare Schemes',
    titleMr: 'कृषी व शेतकरी शासकीय योजना',
    description: 'Dedicated guidance for agricultural subsidies, farmer welfare initiatives, and government crop support.',
    color: 'from-amber-500/10 to-orange-500/15',
    iconColor: 'text-amber-700',
    points: [
      'PM-Kisan Samman Nidhi Enrollment',
      'Pik Vima (Crop Insurance) Registration',
      'Krishi Yojana & Subsidy Applications',
      'Farmer Soil Health & Record Updates',
    ],
  },
  {
    icon: Building2,
    titleEn: 'Tax, GST & Business Licensing',
    titleMr: 'उद्योग परवाने व कर सेवा',
    description: 'Empowering local entrepreneurs and shop owners to register their enterprises and remain legally compliant.',
    color: 'from-cyan-500/10 to-blue-500/15',
    iconColor: 'text-cyan-700',
    points: [
      'Udyam / MSME Enterprise Registration',
      'GST Registration & Monthly Filing Guidance',
      'Shop Act License (गुमास्ता परवाना)',
      'FSSAI Food License & Business Compliance',
    ],
  },
  {
    icon: ShieldCheck,
    titleEn: 'Insurance & Travel Bookings',
    titleMr: 'विमा व प्रवास तिकीट आरक्षण',
    description: 'Affordable vehicle and life protection along with confirmed travel ticket reservations nationwide.',
    color: 'from-purple-500/10 to-pink-500/15',
    iconColor: 'text-purple-700',
    points: [
      'Two-Wheeler & Commercial Vehicle Insurance',
      'Health & Accidental Protection Policies',
      'IRCTC Train Ticket Reservations',
      'Bus & Flight Booking Assistance',
    ],
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

export default function Services() {
  return (
    <section id="services" className="py-20 md:py-28 bg-slate-50/70 relative overflow-hidden border-y border-slate-200/60">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[35vw] bg-blue-100/40 rounded-full blur-[140px] pointer-events-none" />

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
            Our Services • आमच्या सेवा
          </motion.h2>
          <motion.h3
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-3"
          >
            Comprehensive Multi Services Under One Roof
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-slate-600 text-sm md:text-base leading-relaxed"
          >
            From daily citizen certifications and AEPS banking to digital business accounting and farmer subsidies, we provide end-to-end professional support.
          </motion.p>
        </div>

        {/* Services Grid (6 Cards in 3x2 / 2x3 Grid) */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7"
        >
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={index}
                variants={cardVariants}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="group relative rounded-2xl p-6 sm:p-7 bg-white border border-slate-200 shadow-xs hover:shadow-lg hover:border-brand-primary/30 transition-all duration-300 flex flex-col justify-between text-left"
              >
                {/* Accent top stripe on hover */}
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-primary to-blue-400 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div>
                  {/* Icon & Marathi Label Container */}
                  <div className="flex items-center justify-between mb-5">
                    <div className={`p-3.5 rounded-xl bg-gradient-to-br ${service.color} ${service.iconColor} group-hover:scale-105 transition-transform duration-200 shadow-xs`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-mukta font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200/80">
                      {service.titleMr}
                    </span>
                  </div>

                  {/* Service Title */}
                  <h4 className="text-base sm:text-lg font-bold text-slate-900 mb-2 group-hover:text-brand-primary transition-colors duration-200">
                    {service.titleEn}
                  </h4>

                  {/* Description */}
                  <p className="text-xs sm:text-sm leading-relaxed text-slate-600 mb-5">
                    {service.description}
                  </p>
                </div>

                {/* Service Bullet Points */}
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  {service.points.map((point, pIdx) => (
                    <div key={pIdx} className="flex items-start gap-2 text-xs text-slate-700">
                      <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-200/70">
                        <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                      </div>
                      <span className="font-medium">{point}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

      </div>
    </section>
  );
}
