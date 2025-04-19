'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Logo className="mr-8" />
            <div className="flex space-x-8">
              <Link 
                href="/" 
                className={`inline-flex items-center px-3 py-2 border-b-2 ${
                  pathname === '/' ? 'border-blue-500' : 'border-transparent'
                } text-sm font-medium`}
              >
                Home
              </Link>
              <Link 
                href="/analogies" 
                className={`inline-flex items-center px-3 py-2 border-b-2 ${
                  pathname === '/analogies' ? 'border-blue-500' : 'border-transparent'
                } text-sm font-medium`}
              >
                Analogies
              </Link>
              <Link 
                href="/about" 
                className={`inline-flex items-center px-3 py-2 border-b-2 ${
                  pathname === '/about' ? 'border-blue-500' : 'border-transparent'
                } text-sm font-medium`}
              >
                About
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
} 