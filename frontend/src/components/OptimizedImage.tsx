'use client';

import Image from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export default function OptimizedImage({
  src,
  alt,
  width = 512,
  height = 512,
  className = '',
  priority = false,
  fallbackSrc,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError && fallbackSrc) {
      setImgSrc(fallbackSrc);
      setHasError(true);
    }
    onError?.();
  };

  const handleLoad = () => {
    onLoad?.();
  };

  // If it's a Supabase signed URL, we need to handle it differently
  // since Next.js Image optimization doesn't work with signed URLs
  if (src.includes('supabase.co') && src.includes('token=')) {
    return (
      <img
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={handleLoad}
        onError={handleError}
        style={{ objectFit: 'cover' }}
      />
    );
  }

  // For other images, use Next.js Image optimization
  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      onLoad={handleLoad}
      onError={handleError}
      style={{ objectFit: 'cover' }}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      quality={85}
    />
  );
} 