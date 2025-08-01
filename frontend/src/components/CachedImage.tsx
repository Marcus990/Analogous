'use client';

import { useState, useEffect } from 'react';
import { useImageCache } from '../hooks/useImageCache';

interface CachedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
  loading?: 'lazy' | 'eager';
}

export default function CachedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  fallbackSrc,
  onLoad,
  onError,
  loading = 'lazy',
}: CachedImageProps) {
  const [imgSrc, setImgSrc] = useState<string>('');
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { getCachedImage } = useImageCache();

  useEffect(() => {
    let isMounted = true;

    const loadImage = async () => {
      try {
        setIsLoading(true);
        const cachedSrc = await getCachedImage(src);
        
        if (isMounted) {
          setImgSrc(cachedSrc);
          setIsLoading(false);
        }
      } catch (error) {
        console.warn('Failed to load cached image:', src, error);
        if (isMounted) {
          setImgSrc(src); // Fallback to original src
          setIsLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [src, getCachedImage]);

  const handleError = () => {
    if (!hasError && fallbackSrc) {
      setImgSrc(fallbackSrc);
      setHasError(true);
    }
    onError?.();
  };

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  // Show loading state
  if (isLoading) {
    return (
      <div 
        className={`bg-gray-200 animate-pulse ${className}`}
        style={{ width, height }}
      />
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? 'eager' : loading}
      onLoad={handleLoad}
      onError={handleError}
      style={{ objectFit: 'cover' }}
    />
  );
} 