"use client";

import { useState, FormEvent, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useUsernameValidation } from "@/lib/useUsernameValidation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNotification } from "@/lib/notificationContext";
import { IconUser, IconCheck, IconArrowRight, IconArrowLeft, IconMail } from "@tabler/icons-react";
import TurnstileCaptcha, { TurnstileCaptchaRef } from "@/components/TurnstileCaptcha";
import ConfirmationModal from "@/components/ConfirmationModal";
import { ButtonSpinner, LoadingMessage } from "@/components/LoadingSpinner";
import "./page.css";

type Step = 1 | 2;

export default function SignUpInformation() {
  const { user, completeUserProfile } = useAuth();
  const router = useRouter();
  const { showNotification } = useNotification();
  const captchaRef = useRef<TurnstileCaptchaRef>(null);

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [optInEmailMarketing, setOptInEmailMarketing] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  // Username validation hook
  const {
    username,
    validationState,
    handleUsernameChange,
    getValidationMessage,
    getInputStyling,
    isInputDisabled,
  } = useUsernameValidation();

  const steps = [
    { id: 1, title: "Information", icon: IconUser },
    { id: 2, title: "Preferences", icon: IconMail },
  ];

  const canProceedToStep2 = firstName.trim() && lastName.trim() && username.trim() && 
                           validationState.isValid && validationState.isAvailable;
  const canSubmitStep2 = true; // No additional requirements for step 2

  // Check if user is authenticated
  useEffect(() => {
    if (!user) {
      showNotification({
        title: "Authentication Required",
        message: "Please log in to continue.",
        type: "error",
        confirmText: "OK",
      });
      router.push('/login');
    }
  }, [user, router]);

  const handleNext = async () => {
    if (currentStep === 1) {
      // Check username availability before proceeding to step 2
      if (!validationState.isValid || !validationState.isAvailable) {
        setError("Please enter a valid and available username");
        return;
      }
    }
    
    if (currentStep < 2) {
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

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

    setIsLoading(true);

    try {
      const { error: profileError } = await completeUserProfile(
        firstName,
        lastName,
        username,
        optInEmailMarketing
      );

      if (profileError) {
        setError(profileError.message);
      } else {
        setShowSuccessPopup(true);
        setFirstName("");
        setLastName("");
        setOptInEmailMarketing(false);
        handleUsernameChange("");
      }
    } catch (error) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessPopupClose = () => {
    setShowSuccessPopup(false);
    router.push('/dashboard');
  };

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="md:mt-6 min-h-screen bg-black flex items-center justify-center p-4 py-16">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 sm:mb-4"
          >
            <div className="neonText">
              <span className="font-[PlantinMTProSemiBold] text-3xl sm:text-4xl md:text-5xl lg:text-6xl transition-transform duration-300 hover:scale-105">
                Complete Your Profile
              </span>
            </div>
          </motion.div>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-300 text-base sm:text-lg"
          >
            Welcome! Let's set up your account with some additional information
          </motion.p>
        </div>

        {/* Progress Steps */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center mb-6 sm:mb-8"
        >
          <div className="flex items-center justify-center">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center justify-center">
                    <motion.div
                      className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                        isActive 
                          ? 'bg-purple-700 border-purple-400 text-white' 
                          : isCompleted 
                          ? 'bg-green-600 border-green-400 text-white'
                          : 'bg-gray-800 border-gray-600 text-gray-400'
                      }`}
                      whileHover={{ scale: 1.05 }}
                    >
                      {isCompleted ? <IconCheck size={16} className="sm:w-5 sm:h-5" /> : <Icon size={16} className="sm:w-5 sm:h-5" />}
                    </motion.div>
                    <span className={`text-xs sm:text-sm mt-1 sm:mt-2 font-medium ${
                      isActive ? 'text-purple-400' : isCompleted ? 'text-green-400' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-8 h-0.5 sm:w-8 sm:h-0.5 md:w-16 mx-2 sm:mx-4 md:mx-6 ${
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
          className="bg-black/30 backdrop-blur-lg rounded-2xl border border-purple-500/20 p-4 sm:p-6 md:p-8 lg:p-12 shadow-2xl"
        >
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 sm:p-4 text-xs sm:text-sm text-red-400 mb-4 sm:mb-6"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Personal Information */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4 sm:space-y-6"
                >
                  <div className="text-center mb-6 sm:mb-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Tell us about yourself</h2>
                    <p className="text-gray-400 text-sm sm:text-base">Let's start with your basic information</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label htmlFor="firstName" className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full rounded-lg bg-black/20 px-3 sm:px-4 py-2.5 sm:py-3 border border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200 text-sm sm:text-base"
                        placeholder="Enter your first name"
                      />
                    </div>

                    <div>
                      <label htmlFor="lastName" className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full rounded-lg bg-black/20 px-3 sm:px-4 py-2.5 sm:py-3 border border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200 text-sm sm:text-base"
                        placeholder="Enter your last name"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="username" className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
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
                          <ButtonSpinner color="yellow" />
                        </div>
                      )}
                      {isInputDisabled() && (
                        <div className="absolute inset-y-0 bg-black/10 rounded-lg pointer-events-none"></div>
                      )}
                    </div>
                    {getValidationMessage() && (
                      <p className={`mt-2 text-xs sm:text-sm ${
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

                  <div className="flex justify-end pt-3 sm:pt-4">
                    <motion.button
                      type="button"
                      onClick={handleNext}
                      disabled={!canProceedToStep2}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center space-x-2 bg-purple-700 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base"
                    >
                      <span>Next</span>
                      <IconArrowRight size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Preferences */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4 sm:space-y-6"
                >
                  <div className="text-center mb-6 sm:mb-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Preferences</h2>
                    <p className="text-gray-400 text-sm sm:text-base">Customize your experience</p>
                  </div>

                  {/* Email Marketing Preference */}
                  <div className="bg-black/20 rounded-lg p-4 sm:p-6 border border-purple-400/20">
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
                        <label htmlFor="optInEmailMarketing" className="block text-xs sm:text-sm font-medium text-white mb-1">
                          Email Updates
                        </label>
                        <p className="text-xs sm:text-sm text-gray-400">
                          Receive updates about new features, tips, and exclusive content. You can unsubscribe at any time.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between pt-3 sm:pt-4 space-y-3 sm:space-y-0">
                    <motion.button
                      type="button"
                      onClick={handleBack}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center justify-center sm:justify-start space-x-2 bg-gray-700 hover:bg-gray-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base"
                    >
                      <IconArrowLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
                      <span>Back</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={isLoading || !canSubmitStep2}
                      className="flex items-center justify-center space-x-2 bg-purple-700 hover:from-purple-700 hover:to-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base"
                    >
                      {isLoading ? (
                        <>
                          <ButtonSpinner />
                          <span>Completing profile...</span>
                        </>
                      ) : (
                        <>
                          <span>Complete Profile</span>
                          <IconCheck size={16} className="sm:w-[18px] sm:h-[18px]" />
                        </>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </motion.div>
      </div>

      {/* Success Popup */}
      <ConfirmationModal 
        isOpen={showSuccessPopup} 
        onClose={handleSuccessPopupClose}
        onConfirm={handleSuccessPopupClose}
        title="Profile Completed Successfully!"
        message="Your profile has been set up. You're now ready to start creating analogies!"
        confirmText="Go to Dashboard"
        cancelText="Close"
        type="info"
        icon={<IconCheck size={24} />}
      />
    </div>
  );
}
