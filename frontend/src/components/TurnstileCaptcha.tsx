import { Turnstile } from '@marsidev/react-turnstile';
import { useState, useEffect } from 'react';

interface TurnstileCaptchaProps {
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
  onExpire?: () => void;
  disabled?: boolean;
  className?: string;
}

export default function TurnstileCaptcha({
  onVerify,
  onError,
  onExpire,
  disabled = false,
  className = ''
}: TurnstileCaptchaProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const handleVerify = (token: string) => {
    setToken(token);
    onVerify(token);
  };

  const handleError = (error: string) => {
    setToken(null);
    onError?.(error);
  };

  const handleExpire = () => {
    setToken(null);
    onExpire?.();
  };

  const handleLoad = () => {
    setIsLoaded(true);
  };

  // Reset token when disabled
  useEffect(() => {
    if (disabled) {
      setToken(null);
    }
  }, [disabled]);

  return (
    <div className={`flex justify-center ${className}`}>
      <Turnstile
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
    </div>
  );
} 