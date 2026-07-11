import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Mail, MapPin, Linkedin, Facebook, Instagram, Send, CheckCircle2 } from 'lucide-react';

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
            Get in Touch
          </h2>
          <h3 className="text-3xl md:text-4xl font-bold text-brand-secondary tracking-tight mb-4">
            Connect with Our Team
          </h3>
          <p className="text-brand-muted text-base md:text-lg leading-relaxed">
            Have questions or want to collaborate? Reach out to us through any of the channels below.
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

            <div className="space-y-8 relative z-10">
              <div>
                <h4 className="text-xl font-bold mb-3 text-white">Contact Information</h4>
                <p className="text-sm text-slate-300">We generally respond within 24 hours. Feel free to ring us.</p>
              </div>

              {/* Info Items List */}
              <div className="space-y-6">
                {/* Phone */}
                <a href="tel:+91XXXXXXXXXX" className="flex items-center gap-4 group">
                  <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-brand-accent group-hover:bg-brand-primary group-hover:text-white transition-colors duration-300">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Phone</div>
                    <div className="text-sm md:text-base font-medium group-hover:text-brand-accent transition-colors">+91 XXXXXXXXXX</div>
                  </div>
                </a>

                {/* Email */}
                <a href="mailto:info@shrishailmultiservices.in" className="flex items-center gap-4 group">
                  <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-brand-accent group-hover:bg-brand-primary group-hover:text-white transition-colors duration-300">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-slate-400">Email</div>
                    <div className="text-sm md:text-base font-medium group-hover:text-brand-accent transition-colors truncate">
                      info@shrishailmultiservices.in
                    </div>
                  </div>
                </a>

                {/* Location */}
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-brand-accent">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Location</div>
                    <div className="text-sm md:text-base font-medium">India</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="mt-12 relative z-10">
              <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Follow Us</h5>
              <div className="flex gap-3">
                <a 
                  href="https://linkedin.com" 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-brand-primary hover:scale-110 transition-all duration-300"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="w-4 h-4 text-white" />
                </a>
                <a 
                  href="https://facebook.com" 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-brand-primary hover:scale-110 transition-all duration-300"
                  aria-label="Facebook"
                >
                  <Facebook className="w-4 h-4 text-white" />
                </a>
                <a 
                  href="https://instagram.com" 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-brand-primary hover:scale-110 transition-all duration-300"
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
            className="lg:col-span-7 bg-white/40 backdrop-blur-md border border-slate-200/50 rounded-3xl p-8 md:p-10 shadow-lg flex flex-col justify-center"
          >
            <AnimatePresence mode="wait">
              {!formSubmitted ? (
                <motion.form 
                  key="contact-form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="space-y-6 text-left"
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
                      placeholder="e.g. John Doe"
                      className="w-full px-4 py-3.5 rounded-2xl bg-white/80 border border-slate-200 text-brand-secondary text-sm focus:border-brand-primary focus:bg-white focus:outline-none transition-all duration-300"
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
                      placeholder="e.g. john@example.com"
                      className="w-full px-4 py-3.5 rounded-2xl bg-white/80 border border-slate-200 text-brand-secondary text-sm focus:border-brand-primary focus:bg-white focus:outline-none transition-all duration-300"
                    />
                  </div>

                  {/* Message field */}
                  <div>
                    <label htmlFor="message" className="block text-xs font-semibold text-brand-secondary uppercase mb-2">
                      Message
                    </label>
                    <textarea 
                      id="message" 
                      name="message"
                      rows="4"
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Write your details or questions here..."
                      className="w-full px-4 py-3.5 rounded-2xl bg-white/80 border border-slate-200 text-brand-secondary text-sm focus:border-brand-primary focus:bg-white focus:outline-none transition-all duration-300 resize-none"
                    />
                  </div>

                  {/* Submit button */}
                  <motion.button 
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit"
                    className="w-full py-4 px-6 rounded-2xl bg-brand-primary text-white font-medium text-sm shadow-lg shadow-brand-primary/10 hover:shadow-xl hover:shadow-brand-primary/20 hover:bg-brand-primary/95 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Send Message</span>
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
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-6">
                    <CheckCircle2 className="w-8 h-8 animate-bounce" />
                  </div>
                  <h4 className="text-2xl font-bold text-brand-secondary mb-3">Inquiry Sent Successfully!</h4>
                  <p className="text-brand-muted text-sm max-w-md mx-auto mb-6">
                    Thank you for connecting. While our platform is undergoing development, our team will process your information and reach back via email soon.
                  </p>
                  <div className="text-xs text-brand-primary font-semibold uppercase tracking-widest bg-brand-primary/10 px-4 py-2 rounded-full">
                    Talk to you soon!
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
