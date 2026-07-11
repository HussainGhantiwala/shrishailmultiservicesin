import React from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/Navbar';
import BackgroundAnimation from '../components/BackgroundAnimation';
import Hero from '../components/Hero';
import About from '../components/About';
import Features from '../components/Features';
import ContactCard from '../components/ContactCard';
import Footer from '../components/Footer';

export default function Home() {
  return (
    <>
      {/* Head SEO Configuration */}
      <Helmet>
        <title>Shrishail Multi Services | Premium Corporate Solutions & Consulting</title>
        <meta 
          name="description" 
          content="Shrishail Multi Services is building a premium, modern digital experience to better serve clients with trusted professional solutions, customer-centric support, and exceptional quality." 
        />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://shrishailmultiservices.in/" />
        <meta property="og:title" content="Shrishail Multi Services | Premium Corporate Solutions" />
        <meta 
          property="og:description" 
          content="We provide professional, trusted, and client-focused multi-service solutions. Discover our core values and pillars." 
        />
        <meta property="og:image" content="https://shrishailmultiservices.in/og-image.jpg" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://shrishailmultiservices.in/" />
        <meta property="twitter:title" content="Shrishail Multi Services" />
        <meta 
          property="twitter:description" 
          content="We provide professional, trusted, and client-focused multi-service solutions." 
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
          
          {/* Feature Pillars Section */}
          <Features />
          
          {/* Contact Inquiry Section */}
          <ContactCard />
        </main>

        {/* Page Footer */}
        <Footer />
      </div>
    </>
  );
}
