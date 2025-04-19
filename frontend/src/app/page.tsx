import React from 'react';
import { Hero } from '@/components/landing/Hero';
import { Features } from '@/components/landing/Features';
import { About } from '@/components/landing/About';
import { Contact } from '@/components/landing/Contact';

export default function HomePage() {
  return (
    <div className="bg-white">
      <Hero />
      <Features />
      <About />
      <Contact />
    </div>
  );
} 