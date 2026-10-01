import React from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/Navbar';
import BackgroundAnimation from '../components/BackgroundAnimation';
import Hero from '../components/Hero';
import About from '../components/About';
import Services from '../components/Services';
import WhyChooseUs from '../components/WhyChooseUs';
import CTA from '../components/CTA';
import ContactCard from '../components/ContactCard';
import Footer from '../components/Footer';

export default function Home() {
  return (
    <>
      {/* Head SEO Configuration */}
      <Helmet>
        <title>Shrishail Multi Services | Government Citizen Services & Business Khata Portal, Kasagi</title>
        <meta 
          name="description" 
          content="Shrishail Multi Services (श्रीशैल मल्टिसर्विसेस, कसगी) - Authorized citizen e-services, AEPS banking, PM-Kisan & agriculture schemes, business khata book and ledger. Managed by Prof. Manteshwar Suntnure." 
        />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://shrishailmultiservices.in/" />
        <meta property="og:title" content="Shrishail Multi Services | Citizen Services & Business Khata Portal" />
        <meta 
          property="og:description" 
          content="Authorized citizen e-services, digital AEPS banking, farmer subsidy schemes, and business khata book portal in Kasagi, Solapur." 
        />
        <meta property="og:image" content="https://shrishailmultiservices.in/og-image.jpg" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://shrishailmultiservices.in/" />
        <meta property="twitter:title" content="Shrishail Multi Services" />
        <meta 
          property="twitter:description" 
          content="Authorized citizen e-services, digital AEPS banking, farmer subsidy schemes, and business khata book portal in Kasagi." 
        />
        
        {/* Robots metadata */}
        <meta name="robots" content="index, follow" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Helmet>

      {/* Main Layout Container */}
      <div className="relative min-h-screen selection:bg-brand-primary/20 selection:text-brand-primary">
        {/* Animated Background */}
        <BackgroundAnimation />
        
        {/* Navigation Bar */}
        <Navbar />

        {/* Page Sections */}
        <main>
          {/* Hero Section */}
          <Hero />
          
          {/* About Section */}
          <About />
          
          {/* Comprehensive Services Section */}
          <Services />
          
          {/* Why Choose Us Section */}
          <WhyChooseUs />

          {/* Call to Action Banner */}
          <CTA />
          
          {/* Contact Inquiry Section */}
          <ContactCard />
        </main>

        {/* Page Footer */}
        <Footer />
      </div>
    </>
  );
}
