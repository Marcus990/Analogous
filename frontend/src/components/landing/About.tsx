import React from 'react';

export function About() {
  return (
    <div className="bg-white py-12" id="about">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:text-center">
          <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">About Us</h2>
          <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Our Mission
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
            Analogous was created with a simple goal: to make complex subjects accessible to everyone. 
            We believe that understanding comes from relating new concepts to familiar experiences.
          </p>
        </div>
      </div>
    </div>
  );
} 