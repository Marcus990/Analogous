import { useState, useEffect, useCallback } from 'react';

interface CachedImage {
  src: string;
  timestamp: number;
  dataUrl?: string;
}

// In-memory cache for images
const imageCache = new Map<string, CachedImage>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const useImageCache = () => {
  const [cacheStats, setCacheStats] = useState({
    hits: 0,
    misses: 0,
    size: 0,
  });

  // Clean up expired cache entries
  const cleanupCache = useCallback(() => {
    const now = Date.now();
    for (const [key, value] of imageCache.entries()) {
      if (now - value.timestamp > CACHE_DURATION) {
        imageCache.delete(key);
      }
    }
    setCacheStats(prev => ({ ...prev, size: imageCache.size }));
  }, []);

  // Get cached image or load and cache it
  const getCachedImage = useCallback(async (src: string): Promise<string> => {
    const now = Date.now();
    const cached = imageCache.get(src);

    // Check if we have a valid cached version
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      setCacheStats(prev => ({ ...prev, hits: prev.hits + 1 }));
      return cached.dataUrl || src;
    }

    // Cache miss - load the image
    setCacheStats(prev => ({ ...prev, misses: prev.misses + 1 }));

    try {
      // For Supabase signed URLs, we can't convert to data URLs due to CORS
      // So we'll just cache the URL and rely on browser caching
      if (src.includes('supabase.co') && src.includes('token=')) {
        imageCache.set(src, {
          src,
          timestamp: now,
        });
        setCacheStats(prev => ({ ...prev, size: imageCache.size }));
        return src;
      }

      // For other images, try to convert to data URL for better caching
      const response = await fetch(src);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          imageCache.set(src, {
            src,
            timestamp: now,
            dataUrl,
          });
          setCacheStats(prev => ({ ...prev, size: imageCache.size }));
          resolve(dataUrl);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn('Failed to cache image:', src, error);
      // Return original src if caching fails
      return src;
    }
  }, []);

  // Preload images for better performance
  const preloadImages = useCallback(async (urls: string[]) => {
    const promises = urls.map(url => getCachedImage(url));
    await Promise.allSettled(promises);
  }, [getCachedImage]);

  // Clear cache
  const clearCache = useCallback(() => {
    imageCache.clear();
    setCacheStats({ hits: 0, misses: 0, size: 0 });
  }, []);

  // Cleanup cache periodically
  useEffect(() => {
    const interval = setInterval(cleanupCache, 60 * 60 * 1000); // Clean every hour
    return () => clearInterval(interval);
  }, [cleanupCache]);

  return {
    getCachedImage,
    preloadImages,
    clearCache,
    cacheStats,
  };
}; 