import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './api';

interface EmailValidationState {
  isValid: boolean;
  isAvailable: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useEmailValidation() {
  const [email, setEmail] = useState('');
  const [validationState, setValidationState] = useState<EmailValidationState>({
    isValid: false,
    isAvailable: false,
    isLoading: false,
    error: null,
  });

  // Use refs to track the current request and prevent stale updates
  const currentRequestRef = useRef<AbortController | null>(null);
  const lastValidatedEmailRef = useRef<string>('');

  // Validate email format using regex
  const validateEmailFormat = (value: string): boolean => {
    if (!value) return false;
    
    // RFC 5322 compliant email regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(value);
  };

  // Check email availability via API (called on demand)
  const checkEmailAvailability = async (value: string) => {
    // Cancel any ongoing request
    if (currentRequestRef.current) {
      currentRequestRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    currentRequestRef.current = abortController;

    // Store the email we're checking
    lastValidatedEmailRef.current = value;

    if (!value || !validateEmailFormat(value)) {
      setValidationState({
        isValid: false,
        isAvailable: false,
        isLoading: false,
        error: null,
      });
      return false;
    }

    setValidationState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const data = await api.checkEmailAvailability(value, abortController.signal);
      
      // Check if this is still the current request (user hasn't typed more)
      if (abortController.signal.aborted || lastValidatedEmailRef.current !== value) {
        return false; // Request was cancelled or superseded
      }

      setValidationState({
        isValid: true,
        isAvailable: data.available,
        isLoading: false,
        error: data.available ? null : data.error,
      });

      return data.available;
    } catch (error) {
      // Don't update state if request was cancelled
      if (abortController.signal.aborted || lastValidatedEmailRef.current !== value) {
        return false;
      }

      // Handle different types of errors
      let errorMessage = 'An error occurred while checking email availability';
      
      if (error instanceof Error) {
        // Check if it's a rate limit error (from our API)
        if (error.message.includes('Too many email checks')) {
          errorMessage = error.message;
        } else if (error.message.includes('HTTP error! status: 429')) {
          errorMessage = 'Too many email checks. Please wait a minute before trying again.';
        } else if (error.message.includes('HTTP error! status: 500')) {
          errorMessage = 'Server error. Please try again later.';
        } else if (error.message.includes('HTTP error! status: 503')) {
          errorMessage = 'Service temporarily unavailable. Please try again later.';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMessage = 'Network connection error. Please check your internet connection.';
        } else {
          // For other errors, use the actual error message
          errorMessage = error.message;
        }
      }

      setValidationState({
        isValid: true,
        isAvailable: false,
        isLoading: false,
        error: errorMessage,
      });

      return false;
    } finally {
      // Clear the current request reference if it's still ours
      if (currentRequestRef.current === abortController) {
        currentRequestRef.current = null;
      }
    }
  };

  // Handle email input changes (only format validation, no availability check)
  const handleEmailChange = (value: string) => {
    const lowerValue = value.toLowerCase();
    setEmail(lowerValue);

    // Only do immediate format validation
    const isValid = validateEmailFormat(lowerValue);
    
    if (!isValid) {
      // Cancel any ongoing request for invalid input
      if (currentRequestRef.current) {
        currentRequestRef.current.abort();
        currentRequestRef.current = null;
      }
      
      setValidationState({
        isValid: false,
        isAvailable: false,
        isLoading: false,
        error: null,
      });
      return;
    }

    // For valid emails, just mark as valid but don't check availability
    setValidationState({
      isValid: true,
      isAvailable: false, // Reset availability until explicitly checked
      isLoading: false,
      error: null,
    });
  };

  // Get validation message
  const getValidationMessage = (): string | null => {
    if (!email) return null;
    
    if (!validationState.isValid) {
      if (!validateEmailFormat(email)) {
        return 'Please enter a valid email address';
      }
    }
    
    if (validationState.isLoading) return 'Checking availability...';
    if (validationState.error) return validationState.error;
    if (validationState.isValid && validationState.isAvailable) return 'Email is available!';
    
    return null;
  };

  // Get input styling based on validation state
  const getInputStyling = (): string => {
    const baseClasses = "w-full rounded-lg bg-black/20 px-4 py-3 border border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200";
    
    if (!email) {
      return baseClasses;
    }
    
    if (!validationState.isValid) {
      return "w-full rounded-lg bg-black/20 px-4 py-3 border border-red-400/50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200";
    }
    
    if (validationState.isLoading) {
      return "w-full rounded-lg bg-black/20 px-4 py-3 border border-yellow-400/50 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200 opacity-50 cursor-not-allowed";
    }
    
    if (validationState.isValid && validationState.isAvailable) {
      return "w-full rounded-lg bg-black/20 px-4 py-3 border border-green-400/50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200";
    }
    
    if (validationState.error) {
      return "w-full rounded-lg bg-black/20 px-4 py-3 border border-red-400/50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200";
    }
    
    return baseClasses;
  };

  // Check if input should be disabled
  const isInputDisabled = (): boolean => {
    return validationState.isLoading;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentRequestRef.current) {
        currentRequestRef.current.abort();
      }
    };
  }, []);

  return {
    email,
    validationState,
    handleEmailChange,
    checkEmailAvailability, // Expose this function for on-demand checking
    getValidationMessage,
    getInputStyling,
    isInputDisabled,
  };
} 