"use client";

import { useState, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useUsernameValidation } from "@/lib/useUsernameValidation";
import { useEmailValidation } from "@/lib/useEmailValidation";
import { validatePassword, getPasswordValidationMessage } from "@/lib/passwordValidation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { IconUser, IconMail, IconLock, IconCheck, IconArrowRight, IconArrowLeft } from "@tabler/icons-react";
import TurnstileCaptcha from "@/components/TurnstileCaptcha";

type Step = 1 | 2 | 3;

export default function SignUp() {
  const { signUp } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>(1);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [optInEmailMarketing, setOptInEmailMarketing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);

  // Username validation hook
  const {
    username,
    validationState,
    handleUsernameChange,
    getValidationMessage,
    getInputStyling,
    isInputDisabled,
  } = useUsernameValidation();

  // Email validation hook
  const {
    email: emailValue,
    validationState: emailValidationState,
    handleEmailChange,
    checkEmailAvailability,
    getValidationMessage: getEmailValidationMessage,
    getInputStyling: getEmailInputStyling,
    isInputDisabled: isEmailInputDisabled,
  } = useEmailValidation();

  const steps = [
    { id: 1, title: "Personal Info", icon: IconUser },
    { id: 2, title: "Account Details", icon: IconLock },
    { id: 3, title: "Preferences", icon: IconMail },
  ];

  const canProceedToStep2 = firstName.trim() && lastName.trim() && emailValue.trim() && 
                           emailValidationState.isValid;
  const canProceedToStep3 = username.trim() && password.trim() && confirmPassword.trim() && 
                           password === confirmPassword && validationState.isValid && validationState.isAvailable;

  const handleNext = async () => {
    if (currentStep === 1) {
      // Check email availability before proceeding to step 2
      try {
        const isEmailAvailable = await checkEmailAvailability(emailValue);
        if (!isEmailAvailable) {
          return; // Don't proceed if email is not available
        }
      } catch (error) {
        // Handle rate limit and other errors
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError("An error occurred while checking email availability");
        }
        return; // Don't proceed if there's an error
      }
    }
    
    if (currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
    setCaptchaError(null);
  };

  const handleCaptchaError = (error: string) => {
    setCaptchaToken(null);
    setCaptchaError("Captcha verification failed. Please try again.");
  };

  const handleCaptchaExpire = () => {
    setCaptchaToken(null);
    setCaptchaError("Captcha expired. Please complete the verification again.");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setCaptchaError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Validate password requirements
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors.join(", "));
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last names are required");
      return;
    }

    if (!username.trim()) {
      setError("Username is required");
      return;
    }

    if (!validationState.isValid || !validationState.isAvailable) {
      setError("Please enter a valid and available username");
      return;
    }

    // Validate captcha
    if (!captchaToken) {
      setCaptchaError("Please complete the captcha verification");
      return;
    }

    setIsLoading(true);

    try {
      const { error: signUpError } = await signUp(
        emailValue,
        password,
        firstName,
        lastName,
        username,
        optInEmailMarketing,
        captchaToken
      );

      if (signUpError) {
        setError(signUpError.message);
        // Reset captcha on error
        setCaptchaToken(null);
      } else {
        setSuccess(
          "Account created successfully! Please check your email to confirm your account before signing in."
        );
        handleEmailChange(""); // Reset email
        setFirstName("");
        setLastName("");
        setPassword("");
        setConfirmPassword("");
        setOptInEmailMarketing(false);
        handleUsernameChange(""); // Reset username
        setCaptchaToken(null);
      }
    } catch {
      setError("An unexpected error occurred");
      setCaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 py-16">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl -translate-x-1/2 md:text-5xl font-bold text-purple-500 py-2 mb-4"
          >
            Join Analogous
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-300 text-lg"
          >
            Create compelling analogies with the help of AI
          </motion.p>
        </div>

        {/* Progress Steps */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center mb-8"
        >
          <div className="flex items-center space-x-4 md:space-x-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <motion.div
                      className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                        isActive 
                          ? 'bg-purple-700 border-purple-400 text-white' 
                          : isCompleted 
                          ? 'bg-green-600 border-green-400 text-white'
                          : 'bg-gray-800 border-gray-600 text-gray-400'
                      }`}
                      whileHover={{ scale: 1.05 }}
                    >
                      {isCompleted ? <IconCheck size={20} /> : <Icon size={20} />}
                    </motion.div>
                    <span className={`text-sm mt-2 font-medium ${
                      isActive ? 'text-purple-400' : isCompleted ? 'text-green-400' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-8 h-0.5 mx-2 md:mx-4 ${
                      isCompleted ? 'bg-green-400' : 'bg-gray-600'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Form Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-black/30 backdrop-blur-lg rounded-2xl border border-purple-500/20 p-8 md:p-12 shadow-2xl"
        >
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400 mb-6"
            >
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-lg bg-green-500/10 border border-green-500/20 p-4 text-sm text-green-400 mb-6"
            >
              {success}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Personal Information */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white mb-2">Tell us about yourself</h2>
                    <p className="text-gray-400">Let's start with your basic information</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-2">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full rounded-lg bg-black/20 px-4 py-3 border border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
                        placeholder="Enter your first name"
                      />
                    </div>

                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-2">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full rounded-lg bg-black/20 px-4 py-3 border border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
                        placeholder="Enter your last name"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={emailValue}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        className={getEmailInputStyling()}
                        placeholder="Enter your email address"
                        disabled={isEmailInputDisabled()}
                      />
                      {emailValidationState.isLoading && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
                        </div>
                      )}
                      {isEmailInputDisabled() && (
                        <div className="absolute inset-0 bg-black/10 rounded-lg pointer-events-none"></div>
                      )}
                    </div>
                    {getEmailValidationMessage() && (
                      <p className={`mt-2 text-sm ${
                        emailValidationState.isValid && emailValidationState.isAvailable 
                          ? 'text-green-400' 
                          : emailValidationState.isLoading 
                          ? 'text-yellow-400' 
                          : 'text-red-400'
                      }`}>
                        {getEmailValidationMessage()}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end pt-4">
                    <motion.button
                      type="button"
                      onClick={handleNext}
                      disabled={!canProceedToStep2}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center space-x-2 bg-purple-700 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
                    >
                      <span>Next</span>
                      <IconArrowRight size={18} />
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Account Details */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white mb-2">Create your account</h2>
                    <p className="text-gray-400">Choose a username and secure password</p>
                  </div>

                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="username"
                        name="username"
                        type="text"
                        value={username}
                        onChange={(e) => handleUsernameChange(e.target.value)}
                        className={getInputStyling()}
                        placeholder="Choose a unique username"
                        disabled={isInputDisabled()}
                      />
                      {validationState.isLoading && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
                        </div>
                      )}
                      {isInputDisabled() && (
                        <div className="absolute inset-0 bg-black/10 rounded-lg pointer-events-none"></div>
                      )}
                    </div>
                    {getValidationMessage() && (
                      <p className={`mt-2 text-sm ${
                        validationState.isValid && validationState.isAvailable 
                          ? 'text-green-400' 
                          : validationState.isLoading 
                          ? 'text-yellow-400' 
                          : 'text-red-400'
                      }`}>
                        {getValidationMessage()}
                      </p>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-lg bg-black/20 px-4 py-3 border border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
                        placeholder="Create a password"
                      />
                      {password && (
                        <p className={`text-xs mt-2 ${
                          validatePassword(password).isValid ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {getPasswordValidationMessage(password)}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full rounded-lg bg-black/20 px-4 py-3 border border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200"
                        placeholder="Confirm your password"
                      />
                      {confirmPassword && password !== confirmPassword && (
                        <p className="text-xs mt-2 text-red-400">
                          Passwords do not match
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Password Requirements */}
                  {password && (
                    <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-purple-300 mb-2">Password Requirements</h4>
                      <ul className="text-xs text-gray-400 space-y-1">
                        <li className="flex items-center space-x-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${password.length >= 6 ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                          <span>At least 6 characters long</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${/\d/.test(password) ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                          <span>Contains at least one number</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${password === confirmPassword && password.length > 0 ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                          <span>Passwords match</span>
                        </li>
                      </ul>
                    </div>
                  )}

                  <div className="flex justify-between pt-4">
                    <motion.button
                      type="button"
                      onClick={handleBack}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
                    >
                      <IconArrowLeft size={18} />
                      <span>Back</span>
                    </motion.button>

                    <motion.button
                      type="button"
                      onClick={handleNext}
                      disabled={!canProceedToStep3}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center space-x-2 bg-purple-700 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
                    >
                      <span>Next</span>
                      <IconArrowRight size={18} />
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Preferences */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white mb-2">Final preferences</h2>
                    <p className="text-gray-400">Customize your experience</p>
                  </div>

                  <div className="bg-black/20 rounded-lg p-6 border border-purple-400/20">
                    <div className="flex items-start space-x-3">
                      <input
                        id="optInEmailMarketing"
                        name="optInEmailMarketing"
                        type="checkbox"
                        checked={optInEmailMarketing}
                        onChange={(e) => setOptInEmailMarketing(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <label htmlFor="optInEmailMarketing" className="block text-sm font-medium text-white mb-1">
                          Email Updates
                        </label>
                        <p className="text-sm text-gray-400">
                          Receive updates about new features, tips, and exclusive content. You can unsubscribe at any time.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Captcha */}
                  <div className="mt-6">
                    <TurnstileCaptcha
                      onVerify={handleCaptchaVerify}
                      onError={handleCaptchaError}
                      onExpire={handleCaptchaExpire}
                      disabled={isLoading}
                    />
                    {captchaError && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-2 text-center text-sm text-red-400"
                      >
                        {captchaError}
                      </motion.div>
                    )}
                  </div>

                  <div className="flex justify-between pt-4">
                    <motion.button
                      type="button"
                      onClick={handleBack}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
                    >
                      <IconArrowLeft size={18} />
                      <span>Back</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={isLoading}
                      className="flex items-center space-x-2 bg-purple-700 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 text-white px-8 py-3 rounded-lg font-medium transition-all duration-200"
                    >
                      {isLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Creating account...</span>
                        </>
                      ) : (
                        <>
                          <span>Create Account</span>
                          <IconCheck size={18} />
                        </>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          <div className="text-center mt-8 pt-6 border-t border-gray-700">
            <span className="text-gray-400">Already have an account? </span>
            <Link
              href="/login"
              className="font-medium text-purple-400 hover:text-purple-300 transition-colors duration-200"
            >
              Sign in
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
