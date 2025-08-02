"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { BackgroundGradient } from "@/components/BackgroundGradient";
import PricingPlans from "@/components/PricingPlans";
import { useNotification } from "@/lib/notificationContext";
import { MovingBorderButton } from "@/components/MovingBorder";
import {
  IconArrowLeft,
  IconSchool,
  IconSparkles,
  IconCheck,
  IconX,
  IconBrain,
  IconClock,
  IconCalendar,
  IconDatabase,
  IconTrendingUp,
  IconCreditCard,
  IconSettings,
  IconRefresh,
  IconAlertCircle,
  IconInfoCircle,
} from "@tabler/icons-react";
import "./page.css";

interface UserStats {
  currentPlan: string;
  renewalDate: string;
  analogiesGeneratedToday: number;
  analogiesStoredTotal: number;
  upcomingPlan: string | null;
  planCancelled: boolean;
  subscriptionStartDate: string | null;
}

export default function PrivatePricingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { showNotification } = useNotification();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [resuming, setResuming] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }

    if (user) {
      fetchUserStats();
    }
  }, [user, loading, router]);

  const fetchUserStats = async () => {
    if (!user) return;

    try {
      setLoadingStats(true);

      // Get the session token for API authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No authentication token available");
      }

      // Fetch user stats from backend API
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/user/${user.id}/pricing-stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const stats: UserStats = await response.json();
      setUserStats(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      showNotification({
        title: "Error",
        message: "Failed to load your usage statistics",
        type: "error",
      });
    } finally {
      setLoadingStats(false);
    }
  };

  const handleUpgrade = async () => {
    if (!user) return;

    setUpgrading(true);
    try {
      // Get the session token for API authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No authentication token available");
      }

      // Upgrade plan through backend API
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/user/${user.id}/upgrade-plan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `API request failed: ${response.status}`);
      }

      const result = await response.json();
      showNotification({
        title: "Success",
        message: result.message || "Successfully upgraded to Scholar plan!",
        type: "success",
      });

      // Refresh stats
      await fetchUserStats();
    } catch (error) {
      console.error("Error upgrading:", error);
      showNotification({
        title: "Error",
        message: "Failed to upgrade plan. Please try again.",
        type: "error",
      });
    } finally {
      setUpgrading(false);
    }
  };

  const handleDowngrade = async () => {
    if (!user) return;

    try {
      // Get the session token for API authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No authentication token available");
      }

      // Downgrade plan through backend API
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/user/${user.id}/downgrade-plan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `API request failed: ${response.status}`);
      }

      const result = await response.json();
      showNotification({
        title: "Success",
        message: result.message || "Successfully scheduled downgrade to Curious plan. Your Scholar benefits will continue until your next billing cycle.",
        type: "success",
      });

      setShowDowngradeModal(false);
      await fetchUserStats();
    } catch (error) {
      console.error("Error downgrading:", error);
      showNotification({
        title: "Error",
        message: "Failed to downgrade plan. Please try again.",
        type: "error",
      });
    }
  };

  const handleResumePlan = async () => {
    if (!user) return;

    setResuming(true);
    try {
      // Get the session token for API authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No authentication token available");
      }

      // Resume plan through backend API
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/user/${user.id}/resume-plan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `API request failed: ${response.status}`);
      }

      const result = await response.json();
      showNotification({
        title: "Success",
        message: result.message || "Successfully resumed your Scholar plan!",
        type: "success",
      });

      await fetchUserStats();
    } catch (error) {
      console.error("Error resuming plan:", error);
      showNotification({
        title: "Error",
        message: "Failed to resume plan. Please try again.",
        type: "error",
      });
    } finally {
      setResuming(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getUsagePercentage = (current: number, limit: number) => {
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-400";
    if (percentage >= 75) return "text-yellow-400";
    return "text-green-400";
  };

  // Helper functions for plan state
  const isOnCuriousPlan = () => userStats?.currentPlan === "curious";
  const isOnScholarPlan = () => userStats?.currentPlan === "scholar";
  const isPlanCancelled = () => userStats?.planCancelled === true;
  const hasUpcomingPlan = () => userStats?.upcomingPlan !== null;

  // Helper functions for progress calculations
  const getDaysRemaining = () => {
    if (!userStats?.renewalDate || isOnCuriousPlan()) return 0;
    
    const today = new Date();
    const renewalDate = new Date(userStats.renewalDate);
    const diffTime = renewalDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getDaysRemainingPercentage = () => {
    if (!userStats?.renewalDate || isOnCuriousPlan()) return 0;
    
    const daysRemaining = getDaysRemaining();
    const totalDays = 30; // 30-day billing cycle
    return Math.max(0, Math.min(100, (daysRemaining / totalDays) * 100));
  };

  const getRateLimitPercentage = () => {
    const currentRate = isOnScholarPlan() ? 5 : 1;
    const maxRate = 5; // Scholar rate is the maximum
    return (currentRate / maxRate) * 100;
  };

  if (loading || loadingStats) {
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
        <div className="relative z-20 px-4 sm:px-6 py-6 sm:py-8 max-w-7xl mx-auto">
          {/* Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4 sm:gap-0">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <IconArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base">Back to Dashboard</span>
            </button>

            {/* <button
              onClick={() => router.push("/settings")}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <IconSettings className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base">Settings</span>
            </button> */}
          </div>

          {/* Page Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8 sm:mb-12"
          >
            <div className="flex flex-col items-center justify-center mb-4 sm:mb-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center mb-6 sm:mb-10">
                <IconSchool className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="neonText">
                <span className="font-[PlantinMTProSemiBold] text-4xl sm:text-5xl md:text-6xl lg:text-7xl transition-transform duration-300 hover:scale-105">
                  My Plan
                </span>
              </div>
            </div>
            <p className="text-gray-400 text-sm sm:text-base lg:text-xl max-w-3xl mx-auto leading-relaxed px-4">
              Manage your subscription and track your usage
            </p>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-12 sm:pb-16">
        {/* Current Plan Statistics */}
        {userStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-8 sm:mb-12"
          >
            <div className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 backdrop-blur-sm rounded-lg border border-purple-500/20 p-4 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
                <h2 className="text-xl sm:text-2xl font-bold text-white">Current Plan</h2>
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                      isOnScholarPlan()
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : "bg-green-500/20 text-green-300 border border-green-500/30"
                    }`}
                  >
                    {isOnScholarPlan()
                      ? "Scholar"
                      : "Curious"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* Renewal Date */}
                <div className="bg-black/20 rounded-lg p-4 sm:p-6 border border-white/10">
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <IconCalendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-300" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-medium text-gray-400">
                        {isOnCuriousPlan() ? "Plan Status" : "Renewal Date"}
                      </h3>
                      <p className="text-sm sm:text-lg font-semibold text-white">
                        {isOnCuriousPlan() 
                          ? "On Free Plan" 
                          : `${getDaysRemaining()} days left`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5 sm:h-2">
                    <div
                      className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                        getDaysRemainingPercentage() <= 10
                          ? "bg-red-500"
                          : getDaysRemainingPercentage() <= 25
                          ? "bg-yellow-500"
                          : "bg-blue-500"
                      }`}
                      style={{
                        width: `${getDaysRemainingPercentage()}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Today Usage */}
                <div className="bg-black/20 rounded-lg p-4 sm:p-6 border border-white/10">
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <IconTrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-300" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-medium text-gray-400">
                        Today
                      </h3>
                      <p className="text-sm sm:text-lg font-semibold text-white">
                        {userStats.analogiesGeneratedToday || 0} /{" "}
                        {isOnScholarPlan() ? "100" : "20"}
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5 sm:h-2">
                    <div
                      className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                        getUsagePercentage(
                          userStats.analogiesGeneratedToday || 0,
                          isOnScholarPlan() ? 100 : 20
                        ) >= 90
                          ? "bg-red-500"
                          : getUsagePercentage(
                              userStats.analogiesGeneratedToday || 0,
                              isOnScholarPlan() ? 100 : 20
                            ) >= 75
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                      style={{
                        width: `${getUsagePercentage(
                          userStats.analogiesGeneratedToday || 0,
                          isOnScholarPlan() ? 100 : 20
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Storage */}
                <div className="bg-black/20 rounded-lg p-4 sm:p-6 border border-white/10">
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <IconDatabase className="w-4 h-4 sm:w-5 sm:h-5 text-purple-300" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-medium text-gray-400">
                        Storage
                      </h3>
                      <p className="text-sm sm:text-lg font-semibold text-white">
                        {userStats.analogiesStoredTotal} / {isOnScholarPlan() ? "500" : "100"}
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5 sm:h-2">
                    <div
                      className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                        getUsagePercentage(
                          userStats.analogiesStoredTotal,
                          isOnScholarPlan() ? 500 : 100
                        ) >= 90
                          ? "bg-red-500"
                          : getUsagePercentage(
                              userStats.analogiesStoredTotal,
                              isOnScholarPlan() ? 500 : 100
                            ) >= 75
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                      style={{
                        width: `${getUsagePercentage(
                          userStats.analogiesStoredTotal,
                          isOnScholarPlan() ? 500 : 100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Rate Limit */}
                <div className="bg-black/20 rounded-lg p-4 sm:p-6 border border-white/10">
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                      <IconClock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-medium text-gray-400">
                        Rate Limit
                      </h3>
                      <p className="text-sm sm:text-lg font-semibold text-white">
                        {isOnScholarPlan() ? "5" : "1"} / minute
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5 sm:h-2">
                    <div
                      className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                        getRateLimitPercentage() >= 80
                          ? "bg-green-500"
                          : getRateLimitPercentage() >= 50
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{
                        width: `${getRateLimitPercentage()}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Usage Warnings */}
              {(getUsagePercentage(
                userStats.analogiesGeneratedToday || 0,
                isOnScholarPlan() ? 100 : 20
              ) >= 75 ||
                getUsagePercentage(
                  userStats.analogiesStoredTotal,
                  isOnScholarPlan() ? 500 : 100
                ) >= 75) && (
                <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-start space-x-2 sm:space-x-3">
                    <IconAlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-medium text-yellow-300">
                        Usage Alert
                      </h4>
                      <p className="text-xs sm:text-sm text-yellow-200">
                        You're approaching your plan limits. Consider upgrading
                        to your plan if you have not done so already.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Cancelled Plan Warning Banner */}
        {userStats && isOnScholarPlan() && isPlanCancelled() && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mb-6 sm:mb-8"
          >
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 sm:p-4">
              <div className="flex items-start space-x-2 sm:space-x-3">
                <IconAlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs sm:text-sm font-medium text-red-300">
                    Plan Cancellation Scheduled
                  </h4>
                  <p className="text-xs sm:text-sm text-red-200">
                    Your Scholar plan has been cancelled. You'll be downgraded to Curious on{" "}
                    {userStats.renewalDate && formatDate(userStats.renewalDate)}.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Pricing Plans Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8 sm:mb-12"
        >
          <div className="text-center mb-6 sm:mb-8">
            <div className="neonText mb-3 sm:mb-4">
              <span className="font-[PlantinMTProSemiBold] text-3xl sm:text-4xl md:text-5xl transition-transform duration-300 hover:scale-105">
                Available Plans
              </span>
            </div>
            <p className="text-gray-400 text-sm sm:text-base lg:text-lg px-4">
              Choose the plan that best fits your needs
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mx-auto">
            {/* Curious Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="relative flex"
            >
              <div className="relative bg-gradient-to-br from-green-500/5 to-green-600/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden w-full flex flex-col">
                {/* Card Header */}
                <div className="p-4 sm:p-8 border-b border-white/10">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-green-300">
                      <IconBrain className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    {isOnCuriousPlan() && (
                      <div className="bg-green-500/20 text-green-300 px-2 sm:px-3 py-1 rounded-full text-xs font-medium">
                        Current
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Curious</h3>
                  <p className="text-gray-400 text-sm sm:text-base mb-3 sm:mb-4">For learners getting started with analogies</p>
                  
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl sm:text-4xl font-bold text-white">Free</span>
                  </div>
                </div>

                {/* Features List */}
                <div className="p-4 sm:p-8 flex-1 flex flex-col">
                  <div className="space-y-3 sm:space-y-4 flex-1">
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-green-500/20 text-green-400">
                        <IconCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </div>
                      <span className="text-xs sm:text-sm text-white font-medium">
                        Generate <strong className="font-bold text-white">20</strong> analogies per day
                      </span>
                    </div>
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-green-500/20 text-green-400">
                        <IconCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </div>
                      <span className="text-xs sm:text-sm text-white font-medium">
                        Store a maximum of <strong className="font-bold text-white">100</strong> analogies in history
                      </span>
                    </div>
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-green-500/20 text-green-400">
                        <IconCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </div>
                      <span className="text-xs sm:text-sm text-gray-300">
                        Rate limit of <strong className="font-bold text-white">1</strong> analogy generation per minute
                      </span>
                    </div>
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-green-500/20 text-green-400">
                        <IconCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </div>
                      <span className="text-xs sm:text-sm text-gray-300">Access to text and comic book analogy formats with SDXL image generation</span>
                    </div>
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-green-500/20 text-green-400">
                        <IconCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </div>
                      <span className="text-xs sm:text-sm text-gray-300">1-click shareable links with friends and followers</span>
                    </div>
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-gray-500/20 text-gray-500">
                        <IconX className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </div>
                      <span className="text-xs sm:text-sm text-gray-500 line-through">Unlimited analogy generation</span>
                    </div>
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-gray-500/20 text-gray-500">
                        <IconX className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </div>
                      <span className="text-xs sm:text-sm text-gray-500 line-through">Advanced analytics and insights</span>
                    </div>
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-gray-500/20 text-gray-500">
                        <IconX className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </div>
                      <span className="text-xs sm:text-sm text-gray-500 line-through">Priority customer support</span>
                    </div>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="p-4 sm:p-8 pt-0">
                  {isOnCuriousPlan() ? (
                    <button
                      disabled
                      className="w-full py-3 sm:py-4 px-4 sm:px-6 rounded-lg font-semibold bg-green-600/50 text-green-300 cursor-not-allowed text-sm sm:text-base"
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <IconCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>Current Plan</span>
                      </div>
                    </button>
                  ) : isOnScholarPlan() && isPlanCancelled() ? (
                    <MovingBorderButton
                      onClick={handleResumePlan}
                      disabled={resuming}
                      borderRadius="0.5rem"
                      duration={3000}
                      containerClassName="w-full h-auto"
                      borderClassName="bg-[radial-gradient(#10b981_40%,transparent_60%)] opacity-90 blur-sm"
                      className="w-full py-3 sm:py-4 px-4 sm:px-6 rounded-lg font-semibold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white shadow-lg shadow-green-500/25 transition-all duration-200 text-sm sm:text-base"
                    >
                      {resuming ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                          <span>Resuming...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-2">
                          <IconRefresh className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>Resume Plan</span>
                        </div>
                      )}
                    </MovingBorderButton>
                  ) : (
                    <button
                      onClick={() => setShowDowngradeModal(true)}
                      className="w-full py-3 sm:py-4 px-4 sm:px-6 rounded-lg font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all duration-200 text-sm sm:text-base"
                    >
                      Downgrade to Curious
                    </button>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Scholar Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="relative flex"
            >
              {/* Popular Badge */}
              <div className="absolute -top-3 sm:-top-4 left-1/2 transform -translate-x-1/2 z-10">
                <div className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold shadow-lg">
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <IconSchool className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>Best Value</span>
                  </div>
                </div>
              </div>

              {/* Card */}
              <div className="relative bg-gradient-to-br from-purple-500/5 to-purple-600/5 backdrop-blur-sm rounded-xl border border-purple-500/30 shadow-2xl shadow-purple-500/20 overflow-hidden w-full flex flex-col">
                {/* Card Header */}
                <div className="p-4 sm:p-8 border-b border-purple-500/20">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300">
                      <IconSchool className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      {isOnScholarPlan() && (
                        <div className="bg-purple-500/20 text-purple-300 px-2 sm:px-3 py-1 rounded-full text-xs font-medium">
                          {isPlanCancelled() ? `Ending ${userStats?.renewalDate ? formatDate(userStats.renewalDate) : ''}` : 'Current'}
                        </div>
                      )}
                      <div className="bg-purple-500/20 text-purple-300 px-2 sm:px-3 py-1 rounded-full text-xs font-medium">
                        Popular
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Scholar</h3>
                  <p className="text-gray-400 text-sm sm:text-base mb-3 sm:mb-4">For thinkers who want unlimited exploration</p>
                  
                  <div className="flex items-baseline space-x-1">
                    <span className="text-3xl sm:text-4xl font-bold text-white">$6.99</span>
                    <span className="text-gray-400 text-sm sm:text-lg">/month</span>
                  </div>
                </div>

                {/* Features List */}
                <div className="p-4 sm:p-8 flex-1 flex flex-col">
                  <div className="space-y-3 sm:space-y-4 flex-1">
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-green-500/20 text-green-400">
                        <IconCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </div>
                      <span className="text-xs sm:text-sm text-white font-medium">
                        Generate <strong className="font-bold text-white">100</strong> analogies per day
                      </span>
                    </div>
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-green-500/20 text-green-400">
                        <IconCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </div>
                      <span className="text-xs sm:text-sm text-white font-medium">
                        Store a maximum of <strong className="font-bold text-white">500</strong> analogies in history
                      </span>
                    </div>
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-green-500/20 text-green-400">
                        <IconCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </div>
                      <span className="text-xs sm:text-sm text-white font-medium">
                        Rate limit of <strong className="font-bold text-white">5</strong> analogy generations per minute
                      </span>
                    </div>
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-green-500/20 text-green-400">
                        <IconCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </div>
                      <span className="text-xs sm:text-sm text-gray-300">Access to text and comic book analogy formats with SDXL image generation</span>
                    </div>
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-green-500/20 text-green-400">
                        <IconCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </div>
                      <span className="text-xs sm:text-sm text-gray-300">1-click shareable links with friends and followers</span>
                    </div>
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-green-500/20 text-green-400">
                        <IconCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </div>
                      <span className="text-xs sm:text-sm text-gray-300">Priority customer support</span>
                    </div>
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-green-500/20 text-green-400">
                        <IconCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </div>
                      <span className="text-xs sm:text-sm text-gray-300">Advanced analytics and insights</span>
                    </div>
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-green-500/20 text-green-400">
                        <IconCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </div>
                      <span className="text-xs sm:text-sm text-gray-300">Early access to new features</span>
                    </div>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="p-4 sm:p-8 pt-0">
                  {isOnScholarPlan() ? (
                    <button
                      disabled
                      className="w-full py-3 sm:py-4 px-4 sm:px-6 rounded-lg font-semibold bg-purple-600/50 text-purple-300 cursor-not-allowed text-sm sm:text-base"
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <IconCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>Current Plan</span>
                      </div>
                    </button>
                  ) : (
                    <MovingBorderButton
                      onClick={handleUpgrade}
                      disabled={upgrading}
                      borderRadius="0.5rem"
                      duration={3000}
                      containerClassName="w-full h-auto"
                      borderClassName="bg-[radial-gradient(#0ea5e9_40%,transparent_60%)] opacity-90 blur-sm"
                      className="w-full py-3 sm:py-4 px-4 sm:px-6 rounded-lg font-semibold bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white shadow-lg shadow-purple-500/25 transition-all duration-200 text-sm sm:text-base"
                    >
                      {upgrading ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                          <span>Upgrading...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-2">
                          <IconSchool className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>Upgrade to Scholar</span>
                        </div>
                      )}
                    </MovingBorderButton>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Additional Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4 sm:p-6"
        >
          <div className="flex items-start space-x-3 sm:space-x-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <IconInfoCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-white mb-2">
                Plan Management
              </h3>
              <ul className="text-xs sm:text-sm text-gray-400 space-y-1">
                <li>• Upgrades take effect immediately</li>
                <li>• Downgrades take effect at your next billing cycle</li>
                <li>• You can change your plan at any time</li>
                <li>• All your analogies are preserved when changing plans</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Downgrade Confirmation Modal */}
      <AnimatePresence>
        {showDowngradeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDowngradeModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative w-full max-w-sm sm:max-w-md lg:max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <BackgroundGradient containerClassName="rounded-lg p-[2px]">
                <div className="relative bg-black rounded-lg p-4 sm:p-6 lg:p-8">
                  {/* Close button */}
                  <button
                    onClick={() => setShowDowngradeModal(false)}
                    className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors duration-200"
                  >
                    <IconX className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>

                  {/* Content */}
                  <div className="pt-2 sm:pt-0">
                    {/* Icon */}
                    <div className="flex justify-center mb-3 sm:mb-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 flex items-center justify-center text-yellow-400">
                        <IconAlertCircle size={24} />
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white text-center mb-2 sm:mb-3">
                      Downgrade Plan
                    </h3>

                    {/* Message */}
                    <div className="text-sm sm:text-base text-gray-300 text-center mb-4 sm:mb-6 leading-relaxed px-2 space-y-3">
                      <p>Are you sure you want to downgrade to the Curious plan?</p>
                      
                      <div className="text-left bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                        <p className="text-red-300 font-medium mb-2">You'll lose access to:</p>
                        <ul className="text-sm text-gray-300 space-y-1">
                          <li className="flex items-center space-x-2">
                            <IconX className="w-4 h-4 text-red-400 flex-shrink-0" />
                            <span>Higher generation limits (100/day vs 20/day)</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <IconX className="w-4 h-4 text-red-400 flex-shrink-0" />
                            <span>Increased storage (500 vs 100 analogies)</span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <IconX className="w-4 h-4 text-red-400 flex-shrink-0" />
                            <span>Faster rate limits (5/min vs 1/min)</span>
                          </li>
                        </ul>
                      </div>
                      
                      <p className="text-yellow-300">
                        You'll keep Scholar benefits until your next billing cycle on{" "}
                        {userStats?.renewalDate && formatDate(userStats.renewalDate)}.
                      </p>
                    </div>

                    {/* Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      {/* Cancel Button */}
                      <div className="w-full sm:w-1/2">
                        <button
                          onClick={() => setShowDowngradeModal(false)}
                          className="w-full h-12 px-4 rounded-lg font-medium transition bg-gray-700 hover:bg-gray-600 border border-gray-600/50 text-white shadow-md text-base"
                        >
                          Cancel
                        </button>
                      </div>

                      {/* Confirm Button */}
                      <div className="w-full sm:w-1/2">
                        <MovingBorderButton
                          onClick={handleDowngrade}
                          borderRadius="0.5rem"
                          duration={3000}
                          containerClassName="w-full h-12"
                          borderClassName="bg-[radial-gradient(#dc2626_40%,transparent_60%)] opacity-90 blur-sm"
                          className="w-full h-full px-4 rounded-lg font-medium transition border text-white shadow-md text-base bg-red-600 hover:bg-red-700 border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                          <span>Downgrade</span>
                        </MovingBorderButton>
                      </div>
                    </div>
                  </div>
                </div>
              </BackgroundGradient>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
