"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { BackgroundGradient } from "@/components/BackgroundGradient";
import { MovingBorderButton } from "@/components/MovingBorder";
import ConfirmationModal from "@/components/ConfirmationModal";
import { useNotification } from "@/lib/notificationContext";
import { useUsernameValidation } from "@/lib/useUsernameValidation";
import { useRateLimit } from "@/lib/useRateLimit";
import { validatePassword, getPasswordValidationMessage } from "@/lib/passwordValidation";
import {
  IconUser,
  IconLock,
  IconMail,
  IconTrash,
  IconArrowLeft,
  IconCheck,
  IconX,
  IconEye,
  IconEyeOff,
  IconSettings,
} from "@tabler/icons-react";

interface UserProfile {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  opt_in_email_marketing: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { showNotification } = useNotification();
  
  // Form states
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  // Username validation hook
  const {
    username,
    validationState: usernameValidationState,
    handleUsernameChange,
    getValidationMessage: getUsernameValidationMessage,
    getInputStyling: getUsernameInputStyling,
    isInputDisabled: isUsernameInputDisabled,
  } = useUsernameValidation();
  
  // Rate limiting hooks
  const profileRateLimit = useRateLimit(10, 60000); // 10 requests per minute
  const passwordRateLimit = useRateLimit(10, 60000); // 10 requests per minute
  
  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [optInEmailMarketing, setOptInEmailMarketing] = useState(false);
  
  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  // Clear analogy history
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);
  const [clearHistoryConfirmation, setClearHistoryConfirmation] = useState("");
  
  // Navigation state
  const [activeSection, setActiveSection] = useState("profile");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }

    if (user) {
      fetchUserProfile();
    }
  }, [user, loading, router]);

  // Scroll-based active section detection
  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        { id: 'profile-section', name: 'profile' },
        { id: 'security-section', name: 'security' },
        { id: 'danger-section', name: 'danger' }
      ];

      const scrollPosition = window.scrollY + 200; // Offset for better detection

      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.name);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchUserProfile = async () => {
    if (!user) return;

    try {
      setLoadingProfile(true);
      const response = await api.getUserProfile(user.id);

      if (response.status === "success" && response.profile) {
        const data = response.profile;
        setProfile(data);
        handleUsernameChange(data.username || "");
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setEmail(data.email || user.email || "");
        setOptInEmailMarketing(data.opt_in_email_marketing || false);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError("Failed to load profile data");
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Check rate limiting
    if (!profileRateLimit.makeRequest()) {
      setError(`Please wait ${profileRateLimit.getRemainingTimeString()} before trying to save your user preferences.`);
      return;
    }

    // Validate username
    if (!usernameValidationState.isValid || !usernameValidationState.isAvailable) {
      setError("Please enter a valid and available username");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.updateUserProfile(user.id, {
        username: username.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        opt_in_email_marketing: optInEmailMarketing,
      });

      if (response.status === "success") {
        setSuccess("Profile updated successfully!");
        showNotification({
          title: "Success",
          message: "Profile updated successfully!",
          type: "success"
        });
        
        // Update local state
        setProfile(prev => prev ? {
          ...prev,
          username: username.trim(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          opt_in_email_marketing: optInEmailMarketing,
        } : null);
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err instanceof Error ? err.message : "Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Check rate limiting
    if (!passwordRateLimit.makeRequest()) {
      setError(`Please wait ${passwordRateLimit.getRemainingTimeString()} before trying to change your password.`);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    // Validate password requirements
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors.join(", "));
      return;
    }

    setChangingPassword(true);
    setError("");

    try {
      // For password changes, we'll still use Supabase Auth directly since the backend
      // doesn't have admin privileges to change passwords
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error("Error changing password:", error);
        setError("Failed to change password. Please try again.");
        return;
      }

      setSuccess("Password changed successfully!");
      showNotification({
        title: "Success",
        message: "Password changed successfully!",
        type: "success"
      });
      
      // Reset password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Error changing password:", err);
      setError("Failed to change password. Please try again.");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    if (deleteConfirmation !== "DELETE") {
      setError("Please type 'DELETE' to confirm account deletion");
      return;
    }

    setDeletingAccount(true);
    setError("");

    try {
      // Delete user data through the backend API
      const response = await api.deleteUserAccount(user.id, deleteConfirmation);

      if (response.status === "success") {
        // Delete the user account from Supabase Auth (this still needs to be done on frontend)
        const { error: authError } = await supabase.auth.admin.deleteUser(user.id);

        if (authError) {
          console.error("Error deleting user account:", authError);
          setError("Account data deleted but failed to delete auth account. Please contact support.");
          return;
        }

        showNotification({
          title: "Success",
          message: "Account deleted successfully",
          type: "success"
        });
        router.push("/");
      }
    } catch (err) {
      console.error("Error deleting account:", err);
      setError(err instanceof Error ? err.message : "Failed to delete account. Please try again.");
    } finally {
      setDeletingAccount(false);
      setShowDeleteModal(false);
      setDeleteConfirmation("");
    }
  };

  const handleClearHistory = async () => {
    if (!user) return;

    setClearingHistory(true);
    setError("");

    try {
      // First, get all user analogies
      const analogiesResponse = await api.getUserAnalogies(user.id);
      
      if (analogiesResponse.status !== "success" || !analogiesResponse.analogies) {
        setError("Failed to fetch analogy history. Please try again.");
        return;
      }

      const analogies = analogiesResponse.analogies;
      
      if (analogies.length === 0) {
        setSuccess("No analogy history to clear.");
        setShowClearHistoryModal(false);
        setClearHistoryConfirmation("");
        return;
      }

      // Delete each analogy one by one
      let deletedCount = 0;
      let errorCount = 0;

      for (const analogy of analogies) {
        try {
          await api.deleteAnalogy(analogy.id);
          deletedCount++;
        } catch (err) {
          console.error(`Error deleting analogy ${analogy.id}:`, err);
          errorCount++;
        }
      }

      if (errorCount === 0) {
        setSuccess(`Successfully cleared all ${deletedCount} analogies from your history!`);
        showNotification({
          title: "Success",
          message: `Successfully cleared all ${deletedCount} analogies from your history!`,
          type: "success"
        });
      } else if (deletedCount > 0) {
        setSuccess(`Cleared ${deletedCount} analogies. ${errorCount} analogies could not be deleted.`);
        showNotification({
          title: "Partial Success",
          message: `Cleared ${deletedCount} analogies. ${errorCount} analogies could not be deleted.`,
          type: "success"
        });
      } else {
        setError("Failed to clear any analogies. Please try again.");
      }

      setShowClearHistoryModal(false);
      setClearHistoryConfirmation("");
    } catch (err) {
      console.error("Error clearing analogy history:", err);
      setError(err instanceof Error ? err.message : "Failed to clear analogy history. Please try again.");
    } finally {
      setClearingHistory(false);
    }
  };

  if (loading || loadingProfile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="relative z-10 top-6">
        <div className="relative z-20 px-4 sm:px-6 py-6 sm:py-8 max-w-6xl mx-auto">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <IconArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base">Back to Dashboard</span>
            </button>
          </div>

          {/* Page Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8 sm:mb-12"
          >
            <div className="flex items-center justify-center space-x-3 sm:space-x-4 mb-3 sm:mb-4">
              <IconSettings className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white">Account Settings</h1>
            </div>
            <p className="text-gray-400 text-sm sm:text-base lg:text-lg px-4">
              Manage your profile, security, and preferences
            </p>
          </motion.div>
        </div>
      </div>

      {/* Settings Navigation */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-6 sm:mb-8">
        <div className="flex justify-center">
          <div className="inline-flex bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-1 w-full max-w-md">
            <button
              onClick={() => {
                document.getElementById('profile-section')?.scrollIntoView({ behavior: 'smooth' });
                setActiveSection("profile");
              }}
              className={`flex-1 px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-large transition-colors duration-200 text-sm sm:text-md ${
                activeSection === "profile"
                  ? "text-white bg-purple-600 shadow-sm"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                <IconUser size={14} className="sm:w-4 sm:h-4" />
                <span>Profile</span>
              </div>
            </button>
            
            <button
              onClick={() => {
                document.getElementById('security-section')?.scrollIntoView({ behavior: 'smooth' });
                setActiveSection("security");
              }}
              className={`flex-1 px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-large transition-colors duration-200 text-sm sm:text-md ${
                activeSection === "security"
                  ? "text-white bg-blue-600 shadow-sm"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                <IconLock size={14} className="sm:w-4 sm:h-4" />
                <span>Security</span>
              </div>
            </button>
            
            <button
              onClick={() => {
                document.getElementById('danger-section')?.scrollIntoView({ behavior: 'smooth' });
                setActiveSection("danger");
              }}
              className={`flex-1 px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-large transition-colors duration-200 text-sm sm:text-md ${
                activeSection === "danger"
                  ? "text-white bg-red-600 shadow-sm"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                <IconTrash size={14} className="sm:w-4 sm:h-4" />
                <span>Data</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-12 sm:pb-16">
        {/* Error/Success Messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 sm:mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-3 sm:p-4"
          >
            <div className="flex items-center space-x-2 sm:space-x-3">
              <IconX className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-xs sm:text-sm font-medium">{error}</p>
            </div>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 sm:mb-6 rounded-xl bg-green-500/10 border border-green-500/20 p-3 sm:p-4"
          >
            <div className="flex items-center space-x-2 sm:space-x-3">
              <IconCheck className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 flex-shrink-0" />
              <p className="text-green-400 text-xs sm:text-sm font-medium">{success}</p>
            </div>
          </motion.div>
        )}

        {/* Settings Sections */}
        <div className="space-y-6 sm:space-y-8">
          {/* Profile Section */}
          <motion.div
            id="profile-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-purple-500/5 to-purple-600/5 backdrop-blur-sm rounded-xl border border-purple-500/20 overflow-hidden"
          >
            {/* Section Header */}
            <div className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 border-b border-purple-500/20 px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <IconUser className="w-3 h-3 sm:w-4 sm:h-4 text-purple-300" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-white">Profile Information</h2>
                  <p className="text-gray-400 text-xs sm:text-sm">Update your personal details and preferences</p>
                </div>
              </div>
            </div>

            {/* Section Content */}
            <div className="p-4 sm:p-6">
              <form onSubmit={handleSaveProfile} className="space-y-4 sm:space-y-6">
                {/* Name Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <label htmlFor="firstName" className="block text-xs sm:text-sm font-medium text-gray-300">
                      First Name <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="firstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full rounded-xl bg-black/20 px-3 sm:px-4 py-3 sm:py-3.5 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 text-white placeholder-gray-400 transition-all duration-200 hover:border-white/30 text-sm sm:text-base"
                        placeholder="Enter your first name"
                        required
                        aria-describedby="firstName-help"
                      />
                    </div>
                    <p id="firstName-help" className="text-xs text-gray-500">Your first name as it appears on your profile</p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="lastName" className="block text-xs sm:text-sm font-medium text-gray-300">
                      Last Name <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="lastName"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full rounded-xl bg-black/20 px-3 sm:px-4 py-3 sm:py-3.5 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 text-white placeholder-gray-400 transition-all duration-200 hover:border-white/30 text-sm sm:text-base"
                        placeholder="Enter your last name"
                        required
                        aria-describedby="lastName-help"
                      />
                    </div>
                    <p id="lastName-help" className="text-xs text-gray-500">Your last name as it appears on your profile</p>
                  </div>
                </div>

                {/* Username and Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <label htmlFor="username" className="block text-xs sm:text-sm font-medium text-gray-300">
                      Username <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => handleUsernameChange(e.target.value)}
                        className={getUsernameInputStyling()}
                        placeholder="Choose a unique username"
                        required
                        disabled={isUsernameInputDisabled()}
                        aria-describedby="username-help"
                      />
                      {usernameValidationState.isLoading && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-yellow-400"></div>
                        </div>
                      )}
                      {isUsernameInputDisabled() && (
                        <div className="absolute inset-0 bg-black/10 rounded-lg pointer-events-none"></div>
                      )}
                    </div>
                    {getUsernameValidationMessage() && (
                      <p className={`text-xs ${
                        usernameValidationState.isValid && usernameValidationState.isAvailable 
                          ? 'text-green-400' 
                          : usernameValidationState.isLoading 
                          ? 'text-yellow-400' 
                          : 'text-red-400'
                      }`}>
                        {getUsernameValidationMessage()}
                      </p>
                    )}
                    <p id="username-help" className="text-xs text-gray-500">This will be your unique identifier on the platform</p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-300">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        id="email"
                        type="email"
                        value={email}
                        disabled
                        className="w-full rounded-xl bg-black/10 px-3 sm:px-4 py-3 sm:py-3.5 border border-gray-600/50 text-gray-400 cursor-not-allowed text-sm sm:text-base"
                        placeholder="your.email@example.com"
                        aria-describedby="email-help"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-md">Read Only</span>
                      </div>
                    </div>
                    <p id="email-help" className="text-xs text-gray-500">Email address cannot be changed for security reasons</p>
                  </div>
                </div>

                {/* Email Preferences */}
                <div className="space-y-3">
                  <label className="text-xs sm:text-sm font-medium text-gray-300">Email Preferences</label>
                  <div className="bg-black/20 rounded-xl p-3 sm:p-4 border border-white/10">
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <input
                        id="optInEmailMarketing"
                        type="checkbox"
                        checked={optInEmailMarketing}
                        onChange={(e) => setOptInEmailMarketing(e.target.checked)}
                        className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 bg-black/20 border-purple-400/50 rounded focus:ring-purple-500 focus:ring-2 mt-0.5"
                      />
                      <div className="flex-1">
                        <label htmlFor="optInEmailMarketing" className="text-xs sm:text-sm text-white font-medium">
                          Receive email updates and marketing communications
                        </label>
                        <p className="text-xs text-gray-400 mt-1">
                          Stay updated with new features, tips, and exclusive content. You can unsubscribe at any time.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-3 sm:pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full flex items-center justify-center space-x-2 sm:space-x-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:opacity-50 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-all duration-200 shadow-lg text-sm sm:text-base"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <IconCheck size={16} className="sm:w-[18px] sm:h-[18px]" />
                        <span>Save Profile Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>

          {/* Security Section */}
          <motion.div
            id="security-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-blue-500/5 to-cyan-500/5 backdrop-blur-sm rounded-xl border border-blue-500/20 overflow-hidden"
          >
            {/* Section Header */}
            <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b border-blue-500/20 px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <IconLock className="w-3 h-3 sm:w-4 sm:h-4 text-blue-300" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-white">Security & Password</h2>
                  <p className="text-gray-400 text-xs sm:text-sm">Keep your account secure with a strong password</p>
                </div>
              </div>
            </div>

            {/* Section Content */}
            <div className="p-4 sm:p-6">
              <form onSubmit={handleChangePassword} className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <label htmlFor="newPassword" className="block text-xs sm:text-sm font-medium text-gray-300">
                    New Password <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-xl bg-black/20 pl-3 sm:pl-4 pr-10 sm:pr-12 py-3 sm:py-3.5 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-white placeholder-gray-400 transition-all duration-200 hover:border-white/30 text-sm sm:text-base"
                      placeholder="Enter your new password"
                      required
                      aria-describedby="password-help"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center text-gray-400 hover:text-white transition-colors"
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <IconEyeOff size={18} className="sm:w-5 sm:h-5" /> : <IconEye size={18} className="sm:w-5 sm:h-5" />}
                    </button>
                  </div>
                  <p id="password-help" className="text-xs text-gray-500">Use at least 6 characters for better security</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-medium text-gray-300">
                    Confirm New Password <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-xl bg-black/20 pl-3 sm:pl-4 pr-10 sm:pr-12 py-3 sm:py-3.5 border border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-white placeholder-gray-400 transition-all duration-200 hover:border-white/30 text-sm sm:text-base"
                      placeholder="Confirm your new password"
                      required
                      aria-describedby="confirm-help"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center text-gray-400 hover:text-white transition-colors"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <IconEyeOff size={18} className="sm:w-5 sm:h-5" /> : <IconEye size={18} className="sm:w-5 sm:h-5" />}
                    </button>
                  </div>
                  <p id="confirm-help" className="text-xs text-gray-500">Please enter the same password again to confirm</p>
                </div>

                {/* Password Requirements */}
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 sm:p-4">
                  <h4 className="text-xs sm:text-sm font-medium text-blue-300 mb-2">Password Requirements</h4>
                  <ul className="text-xs text-gray-400 space-y-1">
                    <li className="flex items-center space-x-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${newPassword.length >= 6 ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                      <span>At least 6 characters long</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${/\d/.test(newPassword) ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                      <span>Contains at least one number</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${newPassword === confirmPassword && newPassword.length > 0 ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                      <span>Passwords match</span>
                    </li>
                  </ul>
                  {newPassword && (
                    <p className={`text-xs mt-2 ${
                      validatePassword(newPassword).isValid ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {getPasswordValidationMessage(newPassword)}
                    </p>
                  )}
                </div>

                {/* Change Password Button */}
                <div className="pt-3 sm:pt-4">
                  <button
                    type="submit"
                    disabled={changingPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                    className="w-full flex items-center justify-center space-x-2 sm:space-x-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-all duration-200 shadow-lg text-sm sm:text-base"
                  >
                    {changingPassword ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <IconLock size={16} className="sm:w-[18px] sm:h-[18px]" />
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>

          {/* Danger Zone */}
          <motion.div
            id="danger-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-red-500/5 to-red-600/5 backdrop-blur-sm rounded-xl border border-red-500/20 overflow-hidden"
          >
            {/* Section Header */}
            <div className="bg-gradient-to-r from-red-500/10 to-red-600/10 border-b border-red-500/20 px-4 sm:px-6 py-3 sm:py-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <IconTrash className="w-3 h-3 sm:w-4 sm:h-4 text-red-300" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-white">Data Management</h2>
                  <p className="text-gray-400 text-xs sm:text-sm">Manage your analogy history and account data</p>
                </div>
              </div>
            </div>

            {/* Section Content */}
            <div className="p-4 sm:p-6">
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 sm:p-6">
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <IconTrash className="w-4 h-4 sm:w-5 sm:h-5 text-red-300" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Clear Analogy History</h3>
                    <p className="text-gray-300 text-xs sm:text-sm mb-3 sm:mb-4">
                      This action will permanently delete all your analogy history. This cannot be undone.
                    </p>
                    <button
                      onClick={() => setShowClearHistoryModal(true)}
                      className="w-full flex items-center justify-center space-x-2 sm:space-x-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium transition-all duration-200 shadow-lg text-sm sm:text-base"
                    >
                      <IconTrash size={16} className="sm:w-[18px] sm:h-[18px]" />
                      <span>Clear My Analogy History</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteConfirmation("");
          setError("");
        }}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="Are you sure you want to delete your account? This action cannot be undone. All your data, including analogies, preferences, and account information will be permanently deleted."
        confirmText="Delete Account"
        cancelText="Cancel"
        isLoading={deletingAccount}
        type="danger"
        icon={<IconTrash size={24} />}
      />

      {/* Clear Analogy History Confirmation Modal */}
      <ConfirmationModal
        isOpen={showClearHistoryModal}
        onClose={() => {
          setShowClearHistoryModal(false);
          setClearHistoryConfirmation("");
          setError("");
        }}
        onConfirm={handleClearHistory}
        title="Clear Analogy History"
        message="Are you sure you want to clear your analogy history? This action cannot be undone. All your analogy history will be permanently deleted."
        confirmText="Clear History"
        cancelText="Cancel"
        isLoading={clearingHistory}
        type="danger"
        icon={<IconTrash size={24} />}
      />
    </div>
  );
} 