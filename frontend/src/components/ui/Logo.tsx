import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  className?: string;
}

export function Logo({ className = '' }: LogoProps) {
  return (
    <Link href="/" className={`inline-block ${className}`}>
      <Image
        src="/assets/images/AnalogousLogo.svg"
        alt="Analogous Logo"
        width={180}
        height={40}
        priority
      />
    </Link>
  );
} 