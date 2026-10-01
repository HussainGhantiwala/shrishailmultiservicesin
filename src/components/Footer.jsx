import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, ArrowUpRight, ChevronUp, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { isAuthenticated } = useAuth();

  const handleScrollToTop = (e) => {
    e.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const handleNavClick = (e, hash) => {
    e.preventDefault();
    const element = document.querySelector(hash);
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
    <footer className="border-t border-slate-200/80 bg-slate-900 text-slate-300 relative z-10">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">
          
          {/* Col 1 & 2: Brand Information */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center text-white font-bold text-lg shadow-md shadow-brand-primary/20">
                SM
              </div>
              <div>
                <span className="font-mukta text-xs text-blue-400 font-semibold block leading-tight">
                  श्रीशैल मल्टिसर्विसेस, कसगी
                </span>
                <span className="text-base font-bold text-white tracking-tight">
                  Shrishail Multi Services
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 font-mukta">
              प्रो. प्रा. मान्तेश्वर सुंटनूरे (Prof. Manteshwar Suntnure)
            </p>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm">
              Your trusted local multi-service center in Kasagi. Providing comprehensive citizen documentation, digital banking, farmer scheme assistance, and specialized business khata accounting solutions.
            </p>

            <div className="pt-2 flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Authorized Citizen & Business Services Center</span>
            </div>
          </div>

          {/* Col 3: Quick Navigation */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li>
                <a 
                  href="#home" 
                  onClick={(e) => handleNavClick(e, '#home')} 
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Home (मुख्यपृष्ठ)
                </a>
              </li>
              <li>
                <a 
                  href="#about" 
                  onClick={(e) => handleNavClick(e, '#about')} 
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  About Us (आमच्याबद्दल)
                </a>
              </li>
              <li>
                <a 
                  href="#services" 
                  onClick={(e) => handleNavClick(e, '#services')} 
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  All Services (सेवांची यादी)
                </a>
              </li>
              <li>
                <a 
                  href="#why-us" 
                  onClick={(e) => handleNavClick(e, '#why-us')} 
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Why Choose Us (वैशिष्ट्ये)
                </a>
              </li>
              <li>
                <a 
                  href="#contact" 
                  onClick={(e) => handleNavClick(e, '#contact')} 
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Contact (संपर्क)
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Key Services */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">
              Our Services
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-400">
              <li>Maha e-Seva & Certificates</li>
              <li>AEPS Banking & DMT</li>
              <li>Business Khata Book & Ledger</li>
              <li>PM-Kisan & Crop Insurance</li>
              <li>PAN, Aadhaar & Voter Card</li>
              <li>Udyam & Shop Act Licensing</li>
            </ul>
          </div>

          {/* Col 5: Contact & Portal */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">
              Contact & Portal
            </h4>
            
            <div className="space-y-3 text-xs text-slate-400 mb-6">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>Kasagi, Taluka Akkalkot, Dist. Solapur, Maharashtra</span>
              </div>

              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <a href="tel:+917416398023" className="hover:text-white transition-colors">+91 74163 98023</a>
                  <a href="tel:+919823011223" className="hover:text-white transition-colors">+91 98230 11223</a>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <a href="mailto:info@shrishailmultiservices.in" className="hover:text-white transition-colors break-all">
                  info@shrishailmultiservices.in
                </a>
              </div>
            </div>

            {/* Portal Action Link */}
            <Link
              to={isAuthenticated ? "/portal/dashboard" : "/login"}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-semibold hover:bg-blue-600 hover:text-white transition-all duration-200"
            >
              <span>{isAuthenticated ? "Open Portal Dashboard" : "Admin / Customer Login"}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      </div>

      {/* Bottom Sub-Footer Bar */}
      <div className="border-t border-slate-800 bg-slate-950/60 py-6">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left text-xs text-slate-400">
            <span className="font-semibold text-slate-300">
              Shrishail Multi Services
            </span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span>
              &copy; {currentYear} All rights reserved.
            </span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={handleScrollToTop}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <span>Back to Top</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>
    </footer>
  );
}
