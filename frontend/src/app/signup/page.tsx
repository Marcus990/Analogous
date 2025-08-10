"use client";

import { useState, FormEvent, useRef } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useEmailValidation } from "@/lib/useEmailValidation";
import { validatePassword, getPasswordValidationMessage } from "@/lib/passwordValidation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconMail, IconLock, IconCheck } from "@tabler/icons-react";
import TurnstileCaptcha, { TurnstileCaptchaRef } from "@/components/TurnstileCaptcha";
import ConfirmationModal from "@/components/ConfirmationModal";
import { ButtonSpinner, LoadingMessage } from "@/components/LoadingSpinner";
import "./page.css";

export default function SignUp() {
  const { signUp } = useAuth();
  const router = useRouter();
  const captchaRef = useRef<TurnstileCaptchaRef>(null);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

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

  const canSubmit = emailValue.trim() && emailValidationState.isValid && 
                   password.trim() && confirmPassword.trim() && 
                   password === confirmPassword && 
                   validatePassword(password).isValid &&
                   agreeToTerms && captchaToken;

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
    setCaptchaError(null);
    setHasAttemptedSubmit(false);
  };

  const handleCaptchaError = (error: string) => {
    setCaptchaToken(null);
    setCaptchaError(error);
  };

  const handleCaptchaExpire = () => {
    setCaptchaToken(null);
    setCaptchaError("Captcha expired. Please complete the verification again.");
  };

  const resetCaptcha = () => {
    captchaRef.current?.reset();
    setCaptchaToken(null);
    setCaptchaError(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setCaptchaError(null);
    setHasAttemptedSubmit(true);

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

    // Validate terms agreement
    if (!agreeToTerms) {
      setError("You must agree to the Terms of Service and Privacy Policy to create an account");
      return;
    }

    // Validate captcha
    if (!captchaToken) {
      setCaptchaError("Please complete the captcha verification");
      return;
    }

    setIsLoading(true);

    try {
      // Check email availability first
      const isEmailAvailable = await checkEmailAvailability(emailValue);
      if (!isEmailAvailable) {
        setError("An account with this email already exists");
        resetCaptcha();
        setIsLoading(false);
        return;
      }

      // Create user with minimal information
      const { error: signUpError } = await signUp(
        emailValue,
        password,
        captchaToken
      );

      if (signUpError) {
        setError(signUpError.message);
        resetCaptcha();
      } else {
        setShowSuccessPopup(true);
        handleEmailChange(""); // Reset email
        setPassword("");
        setConfirmPassword("");
        setAgreeToTerms(false);
        setHasAttemptedSubmit(false);
        resetCaptcha();
      }
    } catch (error) {
      setError("An unexpected error occurred");
      resetCaptcha();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessPopupClose = () => {
    setShowSuccessPopup(false);
    // Don't redirect to login - user needs to verify email first
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
                Join Analogous
              </span>
            </div>
          </motion.div>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-300 text-base sm:text-lg leading-relaxed"
          >
            Create compelling analogies with the help of AI
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

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Create Your Account</h2>
              <p className="text-gray-400 text-sm sm:text-base">Start with your email and password</p>
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
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
                    <ButtonSpinner color="yellow" />
                  </div>
                )}
                {isEmailInputDisabled() && (
                  <div className="absolute inset-0 bg-black/10 rounded-lg pointer-events-none"></div>
                )}
              </div>
              {getEmailValidationMessage() && (
                <p className={`mt-2 text-xs sm:text-sm ${
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

            {/* Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
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
                  className="w-full rounded-lg bg-black/20 px-3 sm:px-4 py-2.5 sm:py-3 border border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200 text-sm sm:text-base"
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
                <label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
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
                  className="w-full rounded-lg bg-black/20 px-3 sm:px-4 py-2.5 sm:py-3 border border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-200 text-sm sm:text-base"
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
              <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3 sm:p-4">
                <h4 className="text-xs sm:text-sm font-medium text-purple-300 mb-2">Password Requirements</h4>
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

            {/* Terms Agreement */}
            <div className="bg-black/20 rounded-lg p-4 sm:p-6 border border-purple-400/20">
              <div className="flex items-start space-x-3">
                <input
                  id="agreeToTerms"
                  name="agreeToTerms"
                  type="checkbox"
                  checked={agreeToTerms}
                  onChange={(e) => {
                    setAgreeToTerms(e.target.checked);
                    if (e.target.checked) {
                      setHasAttemptedSubmit(false);
                    }
                  }}
                  required
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <label htmlFor="agreeToTerms" className="block text-xs sm:text-sm font-medium text-white mb-1">
                    I agree to the{" "}
                    <Link href="/terms" target="_blank" className="text-purple-400 hover:text-purple-300 underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" target="_blank" className="text-purple-400 hover:text-purple-300 underline">
                      Privacy Policy
                    </Link>
                    <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs sm:text-sm text-gray-400">
                    You must agree to our terms and privacy policy to create an account.
                  </p>
                </div>
              </div>
              {!agreeToTerms && hasAttemptedSubmit && (
                <p className="mt-2 text-xs sm:text-sm text-red-400">
                  You must agree to the Terms of Service and Privacy Policy to continue.
                </p>
              )}
            </div>

            {/* Captcha */}
            <div className="mt-4 sm:mt-6">
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                Verification <span className="text-red-500">*</span>
              </label>
              <TurnstileCaptcha
                ref={captchaRef}
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
                  <div className="flex flex-col items-center space-y-2">
                    <span>{captchaError}</span>
                    <button
                      onClick={resetCaptcha}
                      className="text-xs text-purple-400 hover:text-purple-300 underline"
                    >
                      Reset Captcha
                    </button>
                  </div>
                </motion.div>
              )}
              {!captchaToken && !captchaError && hasAttemptedSubmit && (
                <div className="mt-2 text-center">
                  <p className="text-xs sm:text-sm text-red-400 mb-2">
                    Please complete the verification to continue.
                  </p>
                  <button
                    onClick={resetCaptcha}
                    className="text-xs text-purple-400 hover:text-purple-300 underline"
                  >
                    Reset Captcha
                  </button>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-3 sm:pt-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading || !canSubmit}
                className="flex items-center justify-center space-x-2 bg-purple-700 hover:from-purple-700 hover:to-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-8 sm:px-10 py-3 sm:py-4 rounded-lg font-medium transition-all duration-200 text-base sm:text-lg"
              >
                {isLoading ? (
                  <>
                    <ButtonSpinner />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <IconCheck size={20} className="sm:w-6 sm:h-6" />
                  </>
                )}
              </motion.button>
            </div>
          </form>

          <div className="text-center mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-700">
            <span className="text-gray-400 text-sm sm:text-base">Already have an account? </span>
            <Link
              href="/login"
              className="font-medium text-purple-400 hover:text-purple-300 transition-colors duration-200 text-sm sm:text-base"
            >
              Sign in
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Success Popup */}
      <ConfirmationModal 
        isOpen={showSuccessPopup} 
        onClose={handleSuccessPopupClose}
        onConfirm={handleSuccessPopupClose}
        title="Account Created Successfully!"
        message="Please check your email inbox for a verification email. After verifying your email, you'll be able to complete your profile setup."
        confirmText="Got it!"
        cancelText="Close"
        type="info"
        icon={<IconCheck size={24} />}
      />
    </div>
  );
}
