import React from 'react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const handleScrollToTop = (e) => {
    e.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <footer className="border-t border-slate-100 bg-white/60 backdrop-blur-md relative z-10 py-12">
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Left Side: Brand Name & Copyright */}
        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 text-center md:text-left">
          <a 
            href="#home" 
            onClick={handleScrollToTop}
            className="font-semibold text-brand-secondary hover:text-brand-primary transition-colors duration-200"
          >
            Shrishail Multi Services
          </a>
          <span className="hidden md:inline text-slate-300">|</span>
          <p className="text-xs md:text-sm text-brand-muted">
            &copy; {currentYear} Shrishail Multi Services. All rights reserved.
          </p>
        </div>

        {/* Right Side: Quick Links */}
        <div className="flex items-center gap-6">
          <a 
            href="#privacy-policy" 
            className="text-xs md:text-sm font-medium text-brand-muted hover:text-brand-primary transition-colors"
            onClick={(e) => e.preventDefault()}
          >
            Privacy Policy
          </a>
          <a 
            href="#terms-of-service" 
            className="text-xs md:text-sm font-medium text-brand-muted hover:text-brand-primary transition-colors"
            onClick={(e) => e.preventDefault()}
          >
            Terms of Service
          </a>
        </div>
      </div>
    </footer>
  );
}
