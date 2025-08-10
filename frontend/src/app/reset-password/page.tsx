"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { validatePassword, getPasswordValidationMessage } from "@/lib/passwordValidation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    // Check if a session exists (should be present after clicking recovery link)
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setHasRecoverySession(!!data.session);
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      // When arriving from the email link, Supabase will fire PASSWORD_RECOVERY
      if (event === "PASSWORD_RECOVERY") {
        setHasRecoverySession(true);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate password requirements (same as signup)
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors.join(", "));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setIsSubmitting(false);

    if (updateError) {
      setError(updateError.message || "Failed to update password. The link may be invalid or expired.");
      return;
    }

    setSuccess("Your password has been updated successfully. You can now sign in with your new password.");
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 py-16">
      <div className="w-full max-w-md bg-black/30 backdrop-blur-lg rounded-2xl border border-purple-500/20 p-6 shadow-2xl">
        <h1 className="text-white text-2xl font-semibold mb-2">Reset your password</h1>
        <p className="text-gray-400 text-sm mb-6">
          Enter a new password for your account.
        </p>

        {!hasRecoverySession && (
          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3 text-yellow-300 text-sm mb-4">
            If you reached this page directly, please use the password reset link from your email. If the link is expired, request a new one.
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-red-400 text-sm mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-green-400 text-sm mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-300 mb-2">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              className="w-full rounded-lg bg-black/20 px-3 py-2 border border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            {newPassword && (
              <p className={`text-xs mt-2 ${
                validatePassword(newPassword).isValid ? 'text-green-400' : 'text-red-400'
              }`}>
                {getPasswordValidationMessage(newPassword)}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-300 mb-2">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              className="w-full rounded-lg bg-black/20 px-3 py-2 border border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-400"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs mt-2 text-red-400">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full text-white px-6 py-2.5 rounded-lg bg-purple-700 disabled:opacity-50"
          >
            {isSubmitting ? "Updating..." : "Update password"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full mt-2 text-sm text-purple-300 hover:text-purple-200"
          >
            Back to login
          </button>
        </form>
      </div>
    </div>
  );
}


