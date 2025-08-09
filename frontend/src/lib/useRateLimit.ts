import { useState, useRef, useCallback } from 'react';

interface RateLimitState {
  isLimited: boolean;
  remainingTime: number;
  requestCount: number;
}

export function useRateLimit(maxRequests: number = 10, timeWindow: number = 60000) {
  const [state, setState] = useState<RateLimitState>({
    isLimited: false,
    remainingTime: 0,
    requestCount: 0,
  });

  const requestTimestamps = useRef<number[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    const windowStart = now - timeWindow;

    // Remove old timestamps outside the time window
    requestTimestamps.current = requestTimestamps.current.filter(
      timestamp => timestamp > windowStart
    );

    const currentCount = requestTimestamps.current.length;
    const isLimited = currentCount >= maxRequests;

    if (isLimited) {
      // Calculate remaining time until the oldest request expires
      const oldestTimestamp = Math.min(...requestTimestamps.current);
      const remainingTime = Math.max(0, timeWindow - (now - oldestTimestamp));
      
      setState({
        isLimited: true,
        remainingTime,
        requestCount: currentCount,
      });

      // Set up interval to update remaining time
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          const currentTime = Date.now();
          const newWindowStart = currentTime - timeWindow;
          requestTimestamps.current = requestTimestamps.current.filter(
            timestamp => timestamp > newWindowStart
          );

          const newCount = requestTimestamps.current.length;
          if (newCount < maxRequests) {
            setState({
              isLimited: false,
              remainingTime: 0,
              requestCount: newCount,
            });
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          } else {
            const oldestTimestamp = Math.min(...requestTimestamps.current);
            const remainingTime = Math.max(0, timeWindow - (currentTime - oldestTimestamp));
            setState({
              isLimited: true,
              remainingTime,
              requestCount: newCount,
            });
          }
        }, 1000);
      }
    } else {
      setState({
        isLimited: false,
        remainingTime: 0,
        requestCount: currentCount,
      });
    }

    return !isLimited;
  }, [maxRequests, timeWindow]);

  const makeRequest = useCallback(() => {
    const canMakeRequest = checkRateLimit();
    
    if (canMakeRequest) {
      requestTimestamps.current.push(Date.now());
      setState(prev => ({
        ...prev,
        requestCount: prev.requestCount + 1,
      }));
    }

    return canMakeRequest;
  }, [checkRateLimit]);

  const getRemainingTimeString = useCallback(() => {
    if (state.remainingTime <= 0) return '';
    
    const seconds = Math.ceil(state.remainingTime / 1000);
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
  }, [state.remainingTime]);

  return {
    isLimited: state.isLimited,
    remainingTime: state.remainingTime,
    requestCount: state.requestCount,
    makeRequest,
    getRemainingTimeString,
  };
} 