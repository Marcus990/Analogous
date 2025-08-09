import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './api';

interface UsernameValidationState {
  isValid: boolean;
  isAvailable: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useUsernameValidation() {
  const [username, setUsername] = useState('');
  const [validationState, setValidationState] = useState<UsernameValidationState>({
    isValid: false,
    isAvailable: false,
    isLoading: false,
    error: null,
  });

  // Use refs to track the current request and prevent stale updates
  const currentRequestRef = useRef<AbortController | null>(null);
  const lastValidatedUsernameRef = useRef<string>('');
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Validate username format
  const validateFormat = (value: string): boolean => {
    if (!value) return false;
    if (value.length < 3) return false;
    if (value.length > 30) return false;
    // Only lowercase letters, numbers, and underscores
    return /^[a-z0-9_]+$/.test(value);
  };

  // Check username availability via API
  const checkUsernameAvailability = async (value: string) => {
    // Cancel any ongoing request
    if (currentRequestRef.current) {
      currentRequestRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    currentRequestRef.current = abortController;

    // Store the username we're checking
    lastValidatedUsernameRef.current = value;

    if (!value || !validateFormat(value)) {
      setValidationState({
        isValid: false,
        isAvailable: false,
        isLoading: false,
        error: null,
      });
      return;
    }

    setValidationState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const data = await api.checkUsernameAvailability(value, abortController.signal);
      
      // Check if this is still the current request (user hasn't typed more)
      if (abortController.signal.aborted || lastValidatedUsernameRef.current !== value) {
        return; // Request was cancelled or superseded
      }

      setValidationState({
        isValid: true,
        isAvailable: data.available,
        isLoading: false,
        error: data.available ? null : data.error,
      });
    } catch (error) {
      // Don't update state if request was cancelled
      if (abortController.signal.aborted || lastValidatedUsernameRef.current !== value) {
        return;
      }

      // Handle different types of errors
      let errorMessage = 'An error occurred while checking username availability';
      
      if (error instanceof Error) {
        // Check if it's a rate limit error (from our API)
        if (error.message.includes('Too many username checks')) {
          errorMessage = error.message;
        } else if (error.message.includes('HTTP error! status: 429')) {
          errorMessage = 'Too many username checks. Please wait a minute before trying again.';
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
    } finally {
      // Clear the current request reference if it's still ours
      if (currentRequestRef.current === abortController) {
        currentRequestRef.current = null;
      }
    }
  };

  // Debounced validation function
  const debouncedCheck = useCallback(
    (() => {
      return (value: string) => {
        // Clear any existing timeout
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }

        // Start the debounce timer - input stays enabled during this time
        debounceTimeoutRef.current = setTimeout(() => {
          // After 300ms of no typing, disable input and start validation
          setValidationState(prev => ({ ...prev, isLoading: true, error: null }));
          
          // Double-check the format before proceeding with API call
          if (validateFormat(value)) {
            checkUsernameAvailability(value);
          } else {
            setValidationState({
              isValid: false,
              isAvailable: false,
              isLoading: false,
              error: null,
            });
          }
        }, 500); // 300ms delay before disabling input and starting validation
      };
    })(),
    []
  );

  // Handle username input changes
  const handleUsernameChange = (value: string) => {
    const lowerValue = value.toLowerCase();
    setUsername(lowerValue);

    // Immediate format validation
    const isValid = validateFormat(lowerValue);
    
    if (!isValid) {
      // Cancel any ongoing request for invalid input
      if (currentRequestRef.current) {
        currentRequestRef.current.abort();
        currentRequestRef.current = null;
      }
      
      // Clear any pending debounce
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      
      setValidationState({
        isValid: false,
        isAvailable: false,
        isLoading: false,
        error: null,
      });
      return;
    }

    // For valid usernames, use debounced validation (input stays enabled)
    debouncedCheck(lowerValue);
  };

  // Get validation message
  const getValidationMessage = (): string | null => {
    if (!username) return null;
    
    if (!validationState.isValid) {
      if (username.length < 3) return 'Username must be at least 3 characters';
      if (username.length > 30) return 'Username must be no more than 30 characters';
      if (!/^[a-z0-9_]+$/.test(username)) {
        return 'Username can only contain lowercase letters, numbers, and underscores';
      }
    }
    
    if (validationState.isLoading) return 'Checking availability...';
    if (validationState.error) return validationState.error;
    if (validationState.isValid && validationState.isAvailable) return 'Username is available!';
    
    return null;
  };

  // Get input styling based on validation state
  const getInputStyling = (): string => {
    const baseClasses = "w-full rounded-lg bg-black/20 px-4 py-3 border border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200";
    
    if (!username) {
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
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    username,
    validationState,
    handleUsernameChange,
    getValidationMessage,
    getInputStyling,
    isInputDisabled,
  };
} 