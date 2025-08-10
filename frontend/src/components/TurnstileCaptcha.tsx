import { Turnstile } from '@marsidev/react-turnstile';
import { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';

interface TurnstileCaptchaProps {
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
  onExpire?: () => void;
  disabled?: boolean;
  className?: string;
}

export interface TurnstileCaptchaRef {
  reset: () => void;
}

const TurnstileCaptcha = forwardRef<TurnstileCaptchaRef, TurnstileCaptchaProps>(({
  onVerify,
  onError,
  onExpire,
  disabled = false,
  className = ''
}, ref) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [key, setKey] = useState<string>('turnstile');

  // Maximum number of retries before showing a manual refresh message
  const MAX_RETRIES = 2;

  // Expose reset method to parent component
  useImperativeHandle(ref, () => ({
    reset: () => {
      setToken(null);
      setErrorCount(0);
      setLastError(null);
      setIsRetrying(false);
      setIsLoaded(false);
      setKey(`turnstile-${Date.now()}`);
    }
  }));

  const handleVerify = useCallback((token: string) => {
    setToken(token);
    setErrorCount(0); // Reset error count on successful verification
    setLastError(null);
    onVerify(token);
  }, [onVerify]);

  const handleError = useCallback((error: string) => {
    console.error('Turnstile error:', error);
    setToken(null);
    
    const newErrorCount = errorCount + 1;
    setErrorCount(newErrorCount);
    setLastError(error);
    
    // Provide more specific error messages for common errors
    let errorMessage = "Captcha verification failed. Please try again.";
    
    if (error === '600010') {
      errorMessage = "Captcha widget failed to load. Please refresh the page and try again.";
    } else if (error.includes('network') || error.includes('timeout')) {
      errorMessage = "Network error. Please check your connection and try again.";
    }
    
    // If we've exceeded max retries, show a manual refresh message
    if (newErrorCount >= MAX_RETRIES) {
      errorMessage = "Captcha is having trouble loading. Please refresh the page or try again later.";
    }
    
    onError?.(errorMessage);
  }, [errorCount, onError]);

  const handleExpire = useCallback(() => {
    setToken(null);
    setErrorCount(0); // Reset error count on expiration
    setLastError(null);
    onExpire?.();
  }, [onExpire]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setErrorCount(0); // Reset error count on successful load
    setLastError(null);
    setIsRetrying(false);
  }, []);

  const handleRetry = useCallback(() => {
    if (isRetrying) return;
    
    setIsRetrying(true);
    setErrorCount(0);
    setLastError(null);
    setToken(null);
    setIsLoaded(false);
    
    // Generate a new key to force re-render
    setKey(`turnstile-retry-${Date.now()}`);
    
    // Reset after a short delay to allow the component to re-render
    setTimeout(() => {
      setIsRetrying(false);
    }, 100);
  }, [isRetrying]);

  // Reset token when disabled
  useEffect(() => {
    if (disabled) {
      setToken(null);
    }
  }, [disabled]);

  // Auto-retry logic for network errors (but with limits)
  useEffect(() => {
    if (lastError && errorCount < MAX_RETRIES && !isRetrying) {
      const isNetworkError = lastError.includes('network') || lastError.includes('timeout');
      
      if (isNetworkError) {
        const retryDelay = Math.min(1000 * Math.pow(2, errorCount), 5000); // Exponential backoff, max 5s
        
        const timer = setTimeout(() => {
          if (!isLoaded && !isRetrying) {
            handleRetry();
          }
        }, retryDelay);
        
        return () => clearTimeout(timer);
      }
    }
  }, [lastError, errorCount, isRetrying, isLoaded, handleRetry]);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <Turnstile
        key={key}
        siteKey="0x4AAAAAABmz0dSvxUapP1ti"
        onSuccess={handleVerify}
        onError={handleError}
        onExpire={handleExpire}
        onLoad={handleLoad}
        options={{
          theme: 'dark',
          size: 'normal',
        }}
        className={`${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      />
      
      {/* Show retry button if we've had multiple errors */}
      {errorCount >= MAX_RETRIES && lastError && (
        <div className="mt-3 text-center">
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="text-sm text-purple-400 hover:text-purple-300 underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRetrying ? 'Retrying...' : 'Try Again'}
          </button>
        </div>
      )}
    </div>
  );
});

TurnstileCaptcha.displayName = 'TurnstileCaptcha';

export default TurnstileCaptcha; 