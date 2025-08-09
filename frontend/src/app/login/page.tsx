"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { IconMail, IconLock, IconArrowRight, IconKey, IconAlertCircle } from "@tabler/icons-react";
import ConfirmationModal from "@/components/ConfirmationModal";
import TurnstileCaptcha from "@/components/TurnstileCaptcha";
import "./page.css";

export default function Login() {
  const router = useRouter();
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [lastResetAttempt, setLastResetAttempt] = useState<number | null>(null);
  const [resetCountdown, setResetCountdown] = useState<number>(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState<string>("turnstile");

  // Check if all required fields are filled
  const canSignIn = email.trim() && password.trim() && captchaToken;

  // Handle countdown timer for rate limiting
  useEffect(() => {
    if (resetCountdown > 0) {
      const timer = setTimeout(() => {
        setResetCountdown(resetCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resetCountdown]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setCaptchaError(null);
    setIsLoading(true);

    // Validate captcha
    if (!captchaToken) {
      setCaptchaError("Please complete the captcha verification");
      setIsLoading(false);
      return;
    }

    try {
      const { error: signInError } = await signIn(email, password, captchaToken);

      if (signInError) {
        setError(signInError.message);
        // Reset captcha on error
        setCaptchaToken(null);
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("An unexpected error occurred");
      setCaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError("Please enter your email address first");
      return;
    }

    // Check if countdown is still active
    if (resetCountdown > 0) {
      setError(`Please wait ${resetCountdown} seconds before requesting another password reset link.`);
      return;
    }

    setShowResetConfirmation(true);
  };

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
    setCaptchaError(null);
  };

  const handleCaptchaError = (error: string) => {
    setCaptchaToken(null);
    setCaptchaError(error);
    // Force refresh on error
    setCaptchaKey(`turnstile-${Date.now()}`);
  };

  const handleCaptchaExpire = () => {
    setCaptchaToken(null);
    setCaptchaError("Captcha expired. Please complete the verification again.");
    // Force refresh on expire
    setCaptchaKey(`turnstile-${Date.now()}`);
  };

  const handleConfirmReset = async () => {
    setError("");
    setSuccess("");
    setIsResettingPassword(true);
    setShowResetConfirmation(false);

    try {
      const { error: resetError } = await resetPassword(email);

      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccess("Password reset email sent! Please check your inbox and follow the instructions.");
        setLastResetAttempt(Date.now());
        setResetCountdown(60); // Start 60-second countdown
      }
    } catch {
      setError("An unexpected error occurred while sending reset email");
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="md:mt-6 min-h-screen bg-black flex items-center justify-center p-4 py-16">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 sm:mb-4"
          >
            <div className="neonText">
              <span className="font-[PlantinMTProSemiBold] text-3xl sm:text-4xl md:text-5xl lg:text-6xl transition-transform duration-300 hover:scale-105">
                Welcome Back
              </span>
            </div>
          </motion.div>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-300 text-base sm:text-lg"
          >
            Sign in to continue creating amazing analogies
          </motion.p>
        </div>

        {/* Form Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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

          {success && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 sm:p-4 text-xs sm:text-sm text-green-400 mb-4 sm:mb-6"
            >
              {success}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Sign in to your account</h2>
              <p className="text-gray-400 text-sm sm:text-base">Enter your credentials to continue</p>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <div>
                <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IconMail className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg bg-black/20 pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200 text-sm sm:text-base"
                    placeholder="Enter your email address"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <IconLock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg bg-black/20 pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200 text-sm sm:text-base"
                    placeholder="Enter your password"
                  />
                </div>
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={isResettingPassword || !email.trim() || resetCountdown > 0}
                    className="text-xs sm:text-sm text-purple-400 hover:text-purple-300 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-end space-x-1"
                  >
                    {isResettingPassword ? (
                      <>
                        <div className="animate-spin rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 border-b-2 border-purple-400"></div>
                        <span>Sending...</span>
                      </>
                    ) : resetCountdown > 0 ? (
                      <>
                        <IconKey className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        <span>Wait {resetCountdown}s to send another reset link</span>
                      </>
                    ) : (
                      <>
                        <IconKey className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        <span>Forgot Password?</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Captcha */}
            <div className="mt-4 sm:mt-6">
              <TurnstileCaptcha
                key={captchaKey}
                onVerify={handleCaptchaVerify}
                onError={handleCaptchaError}
                onExpire={handleCaptchaExpire}
                disabled={isLoading}
              />
              {captchaError && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-2 text-center text-xs sm:text-sm text-red-400"
                >
                  {captchaError}
                </motion.div>
              )}
            </div>

            <div className="pt-3 sm:pt-4">
              <motion.button
                whileHover={canSignIn ? { scale: 1.02 } : {}}
                whileTap={canSignIn ? { scale: 0.98 } : {}}
                type="submit"
                disabled={isLoading || !canSignIn}
                className={`w-full flex items-center justify-center space-x-2 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base ${
                  canSignIn && !isLoading
                    ? 'bg-purple-700 hover:from-purple-700 hover:to-blue-700'
                    : 'bg-gray-600 cursor-not-allowed opacity-50'
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <IconArrowRight size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </>
                )}
              </motion.button>
            </div>

            <div className="text-center mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-700">
              <span className="text-gray-400 text-sm sm:text-base">Don&apos;t have an account? </span>
              <Link
                href="/signup"
                className="font-medium text-purple-400 hover:text-purple-300 transition-colors duration-200 text-sm sm:text-base"
              >
                Sign up
              </Link>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Password Reset Confirmation Modal */}
      <ConfirmationModal
        isOpen={showResetConfirmation}
        onClose={() => setShowResetConfirmation(false)}
        onConfirm={handleConfirmReset}
        title="Reset Password"
        message={`Are you sure you want to reset your password? A password reset email will be sent to ${email}.`}
        confirmText="Send Reset Email"
        cancelText="Cancel"
        isLoading={isResettingPassword}
        type="info"
      />
    </div>
  );
}
