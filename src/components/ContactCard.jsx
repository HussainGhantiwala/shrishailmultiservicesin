import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Mail, MapPin, Clock, Linkedin, Facebook, Instagram, Send, CheckCircle2 } from 'lucide-react';

export default function ContactCard() {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;
    
    // Simulate successful form submission
    setFormSubmitted(true);
    setFormData({ name: '', email: '', message: '' });
    
    setTimeout(() => {
      setFormSubmitted(false);
    }, 5000);
  };

  return (
    <section id="contact" className="py-20 md:py-28 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <h2 className="text-xs md:text-sm font-semibold tracking-wider text-brand-primary uppercase mb-3">
            Get in Touch • संपर्क साधा
          </h2>
          <h3 className="text-3xl md:text-4xl font-bold text-brand-secondary tracking-tight mb-4">
            Connect with Shrishail Multi Services
          </h3>
          <p className="text-brand-muted text-base md:text-lg leading-relaxed">
            Have questions about citizen services, banking transactions, or our business khata portal? Reach out to us directly or visit our center in Kasgi.
          </p>
        </div>

        {/* Contact Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch max-w-5xl mx-auto">
          
          {/* Left Column: Contact details */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-5 bg-brand-secondary text-white rounded-3xl p-8 md:p-10 flex flex-col justify-between relative overflow-hidden shadow-xl"
          >
            {/* Background design elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-accent/5 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-7 relative z-10">
              <div>
                <span className="text-xs font-mukta font-medium text-blue-300 block mb-1">
                  श्रीशैल मल्टिसर्विसेस, कसगी
                </span>
                <h4 className="text-xl font-bold mb-2 text-white">Contact Information</h4>
                <p className="text-xs sm:text-sm text-slate-300">
                  Proprietor: Prof. Manteshwar Suntnure
                </p>
              </div>

              {/* Info Items List */}
              <div className="space-y-5">
                {/* Phone / Mobile */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-300 shrink-0 mt-0.5">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Phone & WhatsApp</div>
                    <div className="mt-0.5">
                      <a href="tel:+919850667573" className="text-sm font-semibold hover:text-blue-300 transition-colors">
                        +91 98506 67573
                      </a>
                    </div>
                  </div>
                </div>

                {/* Email */}
                <a href="mailto:Smsuntnure123@gmail.com" className="flex items-start gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-300 group-hover:bg-brand-primary group-hover:text-white transition-colors shrink-0 mt-0.5">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-slate-400 font-medium">Email Address</div>
                    <div className="text-sm font-semibold group-hover:text-blue-300 transition-colors truncate mt-0.5">
                      Smsuntnure123@gmail.com
                    </div>
                  </div>
                </a>

                {/* Location */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-300 shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Center Location</div>
                    <div className="text-sm font-semibold text-white mt-0.5 leading-snug">At Post Kasgi</div>
                    <div className="text-xs text-slate-300 leading-relaxed">Taluka Omerga</div>
                    <div className="text-xs text-slate-300 leading-relaxed">Dist. Dharashiv, Maharashtra, India</div>
                  </div>
                </div>

                {/* Working Hours */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-300 shrink-0 mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Working Hours</div>
                    <div className="text-sm font-semibold text-white mt-0.5">Monday – Saturday</div>
                    <div className="text-xs text-slate-300">9:00 AM – 8:00 PM IST</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="mt-8 pt-6 border-t border-white/10 relative z-10">
              <h5 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Connect With Us</h5>
              <div className="flex gap-2.5">
                <a 
                  href="https://linkedin.com" 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-brand-primary transition-all duration-200"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="w-4 h-4 text-white" />
                </a>
                <a 
                  href="https://facebook.com" 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-brand-primary transition-all duration-200"
                  aria-label="Facebook"
                >
                  <Facebook className="w-4 h-4 text-white" />
                </a>
                <a 
                  href="https://instagram.com" 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-brand-primary transition-all duration-200"
                  aria-label="Instagram"
                >
                  <Instagram className="w-4 h-4 text-white" />
                </a>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Contact Inquiry Form */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 bg-white/60 backdrop-blur-md border border-slate-200/80 rounded-3xl p-8 md:p-10 shadow-lg flex flex-col justify-center"
          >
            <AnimatePresence mode="wait">
              {!formSubmitted ? (
                <motion.form 
                  key="contact-form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="space-y-5 text-left"
                >
                  <h4 className="text-xl font-bold text-brand-secondary">Send an Inquiry</h4>
                  
                  {/* Name field */}
                  <div>
                    <label htmlFor="name" className="block text-xs font-semibold text-brand-secondary uppercase mb-2">
                      Full Name
                    </label>
                    <input 
                      type="text" 
                      id="name" 
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g. Ramesh Patil"
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-brand-secondary text-sm focus:border-brand-primary focus:outline-none transition-all duration-200"
                    />
                  </div>

                  {/* Email field */}
                  <div>
                    <label htmlFor="email" className="block text-xs font-semibold text-brand-secondary uppercase mb-2">
                      Email Address
                    </label>
                    <input 
                      type="email" 
                      id="email" 
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="e.g. ramesh@example.com"
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-brand-secondary text-sm focus:border-brand-primary focus:outline-none transition-all duration-200"
                    />
                  </div>

                  {/* Message field */}
                  <div>
                    <label htmlFor="message" className="block text-xs font-semibold text-brand-secondary uppercase mb-2">
                      Message / Service Query
                    </label>
                    <textarea 
                      id="message" 
                      name="message"
                      rows="4"
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Enter the services or details you would like assistance with..."
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-brand-secondary text-sm focus:border-brand-primary focus:outline-none transition-all duration-200 resize-none"
                    />
                  </div>

                  {/* Submit button */}
                  <motion.button 
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit"
                    className="w-full py-3.5 px-6 rounded-xl bg-brand-primary text-white font-semibold text-sm shadow-md hover:bg-brand-primary/90 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Submit Inquiry</span>
                    <Send className="w-4 h-4" />
                  </motion.button>
                </motion.form>
              ) : (
                <motion.div 
                  key="success-message"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-12 flex flex-col items-center justify-center"
                >
                  <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-5">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 mb-2">Inquiry Sent Successfully</h4>
                  <p className="text-slate-600 text-sm max-w-md mx-auto mb-6 leading-relaxed">
                    Thank you for reaching out to Shrishail Multi Services. Our team has received your message and will connect with you promptly.
                  </p>
                  <div className="text-xs text-brand-primary font-semibold uppercase tracking-wider bg-brand-primary/10 px-4 py-2 rounded-full">
                    We will be in touch shortly
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
