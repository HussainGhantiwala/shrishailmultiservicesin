import React from 'react';
import { motion } from 'framer-motion';
import { Phone, ArrowRight, ShieldCheck, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function CTA() {
  const { isAuthenticated } = useAuth();

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
    <section className="py-16 md:py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl bg-gradient-to-br from-brand-secondary via-slate-900 to-brand-primary p-8 sm:p-12 md:p-16 text-white overflow-hidden shadow-xl"
        >
          {/* Subtle background decorative shapes */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto text-center">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-white font-medium text-xs mb-5">
              <MapPin className="w-3.5 h-3.5 text-blue-300" />
              <span>कसगी, ता. अक्कलकोट • Kasagi Center</span>
            </div>

            <h3 className="font-noto-devanagari text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3">
              आपल्या सेवांच्या मदतीसाठी आजच भेट द्या
            </h3>

            <p className="text-lg sm:text-xl font-medium text-blue-200 mb-4 font-sans">
              Need Our Services? Let's Talk.
            </p>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-8 max-w-2xl mx-auto">
              Whether you need citizen paperwork, banking assistance, farmer scheme enrollments, or access to your digital business khata ledger, our team is ready to assist you promptly.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#contact"
                onClick={handleScrollToContact}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-brand-primary text-white font-semibold text-sm shadow-md hover:bg-brand-primary/90 transition-colors cursor-pointer"
              >
                <Phone className="w-4 h-4 text-white" />
                Contact Our Center
              </a>

              <Link
                to={isAuthenticated ? "/portal/dashboard" : "/login"}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white font-semibold text-sm hover:bg-white/20 transition-colors"
              >
                {isAuthenticated ? "Go to Business Portal" : "Portal Sign In"}
                <ArrowRight className="w-4 h-4 text-white" />
              </Link>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-center gap-6 text-xs text-slate-300 flex-wrap">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Authorized Multi Services Center
              </span>
              <span>•</span>
              <span className="font-mukta font-medium">
                प्रो. प्रा. मान्तेश्वर सुंटनूरे
              </span>
            </div>

          </div>
        </motion.div>

      </div>
    </section>
  );
}
