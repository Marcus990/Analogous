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
import { redirectToCheckout, redirectToPortal } from "@/lib/stripe";
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
  stripe_subscription_id: string | null;
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No authentication token available");
      }

      // Fetch user stats from backend API
      const backendUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(
        `${backendUrl}/user/${user.id}/pricing-stats`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

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
      // Create success and cancel URLs
      const successUrl = `${window.location.origin}/dashboard/pricing`;
      const cancelUrl = `${window.location.origin}/dashboard/pricing`;

      // Redirect to Stripe checkout
      await redirectToCheckout(user.id, successUrl, cancelUrl);
    } catch (error) {
      console.error("Error upgrading:", error);
      showNotification({
        title: "Error",
        message: "Failed to start checkout process. Please try again.",
        type: "error",
      });
      setUpgrading(false);
    }
  };

  const handleDowngrade = async () => {
    if (!user) return;

    try {
      // Get the session token for API authentication
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No authentication token available");
      }

      // Downgrade plan through backend API
      const backendUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(
        `${backendUrl}/user/${user.id}/downgrade-plan`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `API request failed: ${response.status}`
        );
      }

      const result = await response.json();
      showNotification({
        title: "Success",
        message:
          result.message ||
          "Successfully scheduled downgrade to Curious plan. Your Scholar benefits will continue until your next billing cycle.",
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("No authentication token available");
      }

      // Resume plan through backend API
      const backendUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(
        `${backendUrl}/user/${user.id}/resume-plan`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `API request failed: ${response.status}`
        );
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

  const handleManageSubscription = async () => {
    if (!user) return;

    try {
      await redirectToPortal(user.id);
    } catch (error: any) {
      console.error("Error opening portal:", error);

      // Provide more specific error messages
      let errorMessage =
        "Failed to open subscription management. Please try again.";

      if (error.message?.includes("No active subscription")) {
        errorMessage =
          "No active subscription found. Please upgrade to Scholar plan first.";
      } else if (error.message?.includes("Authentication")) {
        errorMessage = "Authentication required. Please log in again.";
      }

      showNotification({
        title: "Error",
        message: errorMessage,
        type: "error",
      });
    }
  };

  const formatDate = (dateString: string) => {
    // Parse the date string as local date to avoid timezone issues
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed in JavaScript

    return date.toLocaleDateString("en-US", {
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
    // Parse renewal date as local date to avoid timezone issues
    const [year, month, day] = userStats.renewalDate.split("-").map(Number);
    const renewalDate = new Date(year, month - 1, day); // month is 0-indexed in JavaScript

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
      <div className="relative z-10 pt-20 sm:pt-24 md:pt-32 px-4 sm:px-6 md:px-10 lg:px-24 pb-8 sm:pb-12">
        <motion.div
          className="space-y-15 sm:space-y-20"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.2,
              },
            },
          }}
        >
          {/* Hero Section */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            className="text-center space-y-8 sm:space-y-12 max-w-5xl mx-auto"
          >
            <div className="flex flex-col items-center justify-center mb-6 sm:mb-8">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center mb-6 sm:mb-8">
                <IconSchool className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="neonText">
                <h1 className="font-[PlantinMTProSemiBold] text-4xl sm:text-5xl md:text-6xl lg:text-7xl transition-transform duration-300 hover:scale-105">
                  My Plan
                </h1>
              </div>
            </div>

            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Manage your subscription and track your usage
            </p>
          </motion.div>

          {/* Current Plan Statistics */}
          {userStats && (
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              className="space-y-12"
            >
              <div className="bg-gradient-to-br from-purple-500/5 to-pink-500/5 backdrop-blur-sm rounded-xl border border-purple-500/20 p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3 sm:gap-0">
                  <h2 className="text-2xl font-bold text-white">
                    Current Plan
                  </h2>
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        isOnScholarPlan()
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                          : "bg-green-500/20 text-green-300 border border-green-500/30"
                      }`}
                    >
                      {isOnScholarPlan() ? "Scholar" : "Curious"}
                    </span>
                    {isOnScholarPlan() && userStats?.stripe_subscription_id && (
                      <button
                        onClick={handleManageSubscription}
                        className="px-3 py-1 rounded-full text-sm font-medium bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all duration-200"
                      >
                        Manage Subscription
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Renewal Date */}
                  <div className="bg-black/20 rounded-xl p-6 border border-white/10">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                        <IconCalendar className="w-5 h-5 text-blue-300" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-400">
                          {isOnCuriousPlan() ? "Plan Status" : "Renewal Date"}
                        </h3>
                        <p className="text-lg font-semibold text-white">
                          {isOnCuriousPlan()
                            ? "On Free Plan"
                            : `${getDaysRemaining()} days left`}
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
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
                  <div className="bg-black/20 rounded-xl p-6 border border-white/10">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                        <IconTrendingUp className="w-5 h-5 text-green-300" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-400">
                          Today
                        </h3>
                        <p className="text-lg font-semibold text-white">
                          {userStats.analogiesGeneratedToday || 0} /{" "}
                          {isOnScholarPlan() ? "100" : "20"}
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
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
                  <div className="bg-black/20 rounded-xl p-6 border border-white/10">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                        <IconDatabase className="w-5 h-5 text-purple-300" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-400">
                          Storage
                        </h3>
                        <p className="text-lg font-semibold text-white">
                          {userStats.analogiesStoredTotal || 0} /{" "}
                          {isOnScholarPlan() ? "500" : "100"}
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          getUsagePercentage(
                            userStats.analogiesStoredTotal || 0,
                            isOnScholarPlan() ? 500 : 100
                          ) >= 90
                            ? "bg-red-500"
                            : getUsagePercentage(
                                userStats.analogiesStoredTotal || 0,
                                isOnScholarPlan() ? 500 : 100
                              ) >= 75
                            ? "bg-yellow-500"
                            : "bg-purple-500"
                        }`}
                        style={{
                          width: `${getUsagePercentage(
                            userStats.analogiesStoredTotal || 0,
                            isOnScholarPlan() ? 500 : 100
                          )}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Rate Limit */}
                  <div className="bg-black/20 rounded-xl p-6 border border-white/10">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                        <IconClock className="w-5 h-5 text-orange-300" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-400">
                          Rate Limit
                        </h3>
                        <p className="text-lg font-semibold text-white">
                          {isOnScholarPlan() ? "5" : "1"} / min
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300 bg-orange-500"
                        style={{
                          width: `${getRateLimitPercentage()}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Plan Cancellation Notice */}
          {userStats && isOnScholarPlan() && isPlanCancelled() && (
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              className="space-y-12"
            >
              <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 backdrop-blur-sm rounded-xl border border-red-500/30 p-4">
                <div className="flex items-start space-x-3">
                  <IconAlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-red-300">
                      Plan Cancellation Scheduled
                    </h4>
                    <p className="text-sm text-red-200">
                      Your Scholar plan has been cancelled. You'll be downgraded
                      to Curious on{" "}
                      {userStats.renewalDate &&
                        formatDate(userStats.renewalDate)}
                      .
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Pricing Plans Section */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            className="space-y-12"
          >
            <div className="text-center max-w-4xl mx-auto">
              <div className="neonText">
                <h2 className="font-[PlantinMTProSemiBold] text-3xl sm:text-4xl md:text-5xl mb-6">
                  Available Plans
                </h2>
              </div>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                Choose the plan that best fits your needs
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 mx-auto">
              {/* Curious Plan */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="group relative bg-gradient-to-br from-green-500/5 to-green-600/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden hover:border-green-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/20"
              >
                {/* Card Header */}
                <div className="p-8 border-b border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-green-300 group-hover:bg-green-500/30 transition-colors duration-300">
                      <IconBrain className="w-6 h-6" />
                    </div>
                    {isOnCuriousPlan() && (
                      <div className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm font-medium">
                        Current
                      </div>
                    )}
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-2">
                    Curious
                  </h3>
                  <p className="text-gray-400 text-lg mb-4">
                    For learners getting started with analogies
                  </p>

                  <div className="flex items-baseline space-x-1">
                    <span className="text-4xl font-bold text-white">Free</span>
                  </div>
                </div>

                {/* Features List */}
                <div className="p-8 flex-1 flex flex-col">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-green-500/20 text-green-400">
                        <IconCheck className="w-3 h-3" />
                      </div>
                      <span className="text-sm text-white font-medium">
                        Generate{" "}
                        <strong className="font-bold text-white">20</strong>{" "}
                        analogies per day
                      </span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-green-500/20 text-green-400">
                        <IconCheck className="w-3 h-3" />
                      </div>
                      <span className="text-sm text-white font-medium">
                        Store a maximum of{" "}
                        <strong className="font-bold text-white">100</strong>{" "}
                        analogies in history
                      </span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-green-500/20 text-green-400">
                        <IconCheck className="w-3 h-3" />
                      </div>
                      <span className="text-sm text-gray-300">
                        Rate limit of{" "}
                        <strong className="font-bold text-white">1</strong>{" "}
                        analogy generation per minute
                      </span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-green-500/20 text-green-400">
                        <IconCheck className="w-3 h-3" />
                      </div>
                      <span className="text-sm text-gray-300">
                        Access to text and comic book analogy formats with SDXL
                        image generation
                      </span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-green-500/20 text-green-400">
                        <IconCheck className="w-3 h-3" />
                      </div>
                      <span className="text-sm text-gray-300">
                        1-click shareable links with friends and followers
                      </span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-gray-500/20 text-gray-500">
                        <IconX className="w-3 h-3" />
                      </div>
                      <span className="text-sm text-gray-500 line-through">
                        Unlimited analogy generation
                      </span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-gray-500/20 text-gray-500">
                        <IconX className="w-3 h-3" />
                      </div>
                      <span className="text-sm text-gray-500 line-through">
                        Advanced analytics and insights
                      </span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-gray-500/20 text-gray-500">
                        <IconX className="w-3 h-3" />
                      </div>
                      <span className="text-sm text-gray-500 line-through">
                        Priority customer support
                      </span>
                    </div>
                  </div>
                </div>

                {/* CTA Button */}
                <div className="p-8 pt-0">
                  {isOnCuriousPlan() ? (
                    <button
                      disabled
                      className="w-full py-4 px-6 rounded-lg font-semibold bg-green-600/50 text-green-300 cursor-not-allowed text-base"
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <IconCheck className="w-5 h-5" />
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
                      className="w-full py-4 px-6 rounded-lg font-semibold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white shadow-lg shadow-green-500/25 transition-all duration-200 text-base"
                    >
                      {resuming ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Resuming...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-2">
                          <IconRefresh className="w-5 h-5" />
                          <span>Resume Plan</span>
                        </div>
                      )}
                    </MovingBorderButton>
                  ) : (
                    <button
                      onClick={() => setShowDowngradeModal(true)}
                      className="w-full py-4 px-6 rounded-lg font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all duration-200 text-base"
                    >
                      Downgrade to Curious
                    </button>
                  )}
                </div>
              </motion.div>

              {/* Scholar Plan */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="relative"
              >
                {/* Popular Badge */}
                {!isOnScholarPlan() && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <div className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                      <div className="flex items-center space-x-2">
                        <IconSchool className="w-4 h-4" />
                        <span>Best Value</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Card */}
                <div className="group relative bg-gradient-to-br from-purple-500/5 to-purple-600/5 backdrop-blur-sm rounded-xl border border-purple-500/30 shadow-2xl shadow-purple-500/20 overflow-hidden hover:border-purple-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/30">
                  {/* Card Header */}
                  <div className="p-8 border-b border-purple-500/20">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300 group-hover:bg-purple-500/30 transition-colors duration-300">
                        <IconSchool className="w-6 h-6" />
                      </div>
                      <div className="flex items-center space-x-2">
                        {isOnScholarPlan() && (
                          <div className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm font-medium">
                            Current
                          </div>
                        )}
                        {!isOnScholarPlan() && (
                          <div className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm font-medium">
                            Popular
                          </div>
                        )}
                      </div>
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-2">
                      Scholar
                    </h3>
                    <p className="text-gray-400 text-lg mb-4">
                      For thinkers who want unlimited exploration
                    </p>

                    <div className="flex items-baseline space-x-1 relative">
                      <span className="text-4xl font-bold text-white">
                        $6.99
                      </span>
                      <span className="text-gray-400 text-lg">/month</span>
                      <span className="absolute -bottom-1 -right-1 text-xs text-gray-500">
                        CAD
                      </span>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="p-8 flex-1 flex flex-col">
                    <div className="space-y-4 flex-1">
                      <div className="flex items-start space-x-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-green-500/20 text-green-400">
                          <IconCheck className="w-3 h-3" />
                        </div>
                        <span className="text-sm text-white font-medium">
                          Generate{" "}
                          <strong className="font-bold text-white">100</strong>{" "}
                          analogies per day
                        </span>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-green-500/20 text-green-400">
                          <IconCheck className="w-3 h-3" />
                        </div>
                        <span className="text-sm text-white font-medium">
                          Store a maximum of{" "}
                          <strong className="font-bold text-white">500</strong>{" "}
                          analogies in history
                        </span>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-green-500/20 text-green-400">
                          <IconCheck className="w-3 h-3" />
                        </div>
                        <span className="text-sm text-white font-medium">
                          Rate limit of{" "}
                          <strong className="font-bold text-white">5</strong>{" "}
                          analogy generations per minute
                        </span>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-green-500/20 text-green-400">
                          <IconCheck className="w-3 h-3" />
                        </div>
                        <span className="text-sm text-gray-300">
                          Access to text and comic book analogy formats with
                          SDXL image generation
                        </span>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-green-500/20 text-green-400">
                          <IconCheck className="w-3 h-3" />
                        </div>
                        <span className="text-sm text-gray-300">
                          1-click shareable links with friends and followers
                        </span>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-green-500/20 text-green-400">
                          <IconCheck className="w-3 h-3" />
                        </div>
                        <span className="text-sm text-gray-300">
                          Priority customer support
                        </span>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-green-500/20 text-green-400">
                          <IconCheck className="w-3 h-3" />
                        </div>
                        <span className="text-sm text-gray-300">
                          Advanced analytics and insights
                        </span>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-green-500/20 text-green-400">
                          <IconCheck className="w-3 h-3" />
                        </div>
                        <span className="text-sm text-gray-300">
                          Early access to new features
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="p-8 pt-0">
                    {isOnScholarPlan() ? (
                      <button
                        disabled
                        className="w-full py-4 px-6 rounded-lg font-semibold bg-purple-600/50 text-purple-300 cursor-not-allowed text-base"
                      >
                        <div className="flex items-center justify-center space-x-2">
                          <IconCheck className="w-5 h-5" />
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
                        className="w-full py-4 px-6 rounded-lg font-semibold bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white shadow-lg shadow-purple-500/25 transition-all duration-200 text-base"
                      >
                        {upgrading ? (
                          <div className="flex items-center justify-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Upgrading...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-2">
                            <IconSchool className="w-5 h-5" />
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

          {/* FAQ Section */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            className="mt-8 sm:mt-12"
          >
            <div className="text-center max-w-4xl mx-auto p-8">
              <div className="neonText">
                <h2 className="font-[PlantinMTProSemiBold] text-2xl sm:text-3xl md:text-4xl mb-6">
                  Frequently Asked Questions
                </h2>
              </div>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                Everything you need to know about our pricing and features
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* FAQ Item 1 */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="group relative bg-gradient-to-br from-purple-500/5 to-blue-600/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden hover:border-purple-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20"
              >
                <div className="p-8 h-full flex flex-col">
                  <h3 className="text-xl font-semibold mb-4 text-white">
                    How often will I be billed?
                  </h3>
                  <p className="text-gray-400 flex-1 text-md leading-relaxed">
                    You'll be billed every 30 days from the date you first
                    upgrade to the Scholar plan.
                  </p>
                </div>
              </motion.div>

              {/* FAQ Item 2 */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="group relative bg-gradient-to-br from-purple-500/5 to-blue-600/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden hover:border-purple-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20"
              >
                <div className="p-8 h-full flex flex-col">
                  <h3 className="text-xl font-semibold mb-4 text-white">
                    Can I cancel my Scholar plan anytime?
                  </h3>
                  <p className="text-gray-400 flex-1 text-md leading-relaxed">
                    Yes! You can cancel or downgrade at any time. After
                    cancellation, you'll retain your Scholar plan benefits until
                    the end of your current billing cycle, and then your plan
                    will automatically revert to Curious (free).
                  </p>
                </div>
              </motion.div>

              {/* FAQ Item 3 */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true }}
                className="group relative bg-gradient-to-br from-purple-500/5 to-blue-600/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden hover:border-purple-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20"
              >
                <div className="p-8 h-full flex flex-col">
                  <h3 className="text-xl font-semibold mb-4 text-white">
                    Will I receive a refund if I cancel early?
                  </h3>
                  <p className="text-gray-400 flex-1 text-md leading-relaxed">
                    We currently do not offer refunds for unused time or partial
                    billing cycles. You'll continue to enjoy paid benefits until
                    your billing cycle ends.
                  </p>
                </div>
              </motion.div>

              {/* FAQ Item 4 */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                viewport={{ once: true }}
                className="group relative bg-gradient-to-br from-purple-500/5 to-blue-600/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden hover:border-purple-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20"
              >
                <div className="p-8 h-full flex flex-col">
                  <h3 className="text-xl font-semibold mb-4 text-white">
                    Can I upgrade again after downgrading?
                  </h3>
                  <p className="text-gray-400 flex-1 text-md leading-relaxed">
                    Absolutely! You can switch back to the Scholar plan at any
                    time and your new billing cycle will start from the date of
                    upgrade.
                  </p>
                </div>
              </motion.div>

              {/* FAQ Item 5 */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                viewport={{ once: true }}
                className="group relative bg-gradient-to-br from-purple-500/5 to-blue-600/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden hover:border-purple-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20"
              >
                <div className="p-8 h-full flex flex-col">
                  <h3 className="text-xl font-semibold mb-4 text-white">
                    What payment methods are accepted?
                  </h3>
                  <p className="text-gray-400 flex-1 text-md leading-relaxed">
                    We currently accept all major credit and debit cards.
                    Additional payment options may be added in the future.
                  </p>
                </div>
              </motion.div>

              {/* FAQ Item 6 */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                viewport={{ once: true }}
                className="group relative bg-gradient-to-br from-purple-500/5 to-blue-600/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden hover:border-purple-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20"
              >
                <div className="p-8 h-full flex flex-col">
                  <h3 className="text-xl font-semibold mb-4 text-white">
                    Can I try out the Scholar plan before committing?
                  </h3>
                  <p className="text-gray-400 flex-1 text-md leading-relaxed">
                    We don't offer a trial period at this time, but the Curious
                    plan includes access to all core features so you can get a
                    full feel for the platform before upgrading.
                  </p>
                </div>
              </motion.div>

              {/* FAQ Item 7 */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                viewport={{ once: true }}
                className="group relative bg-gradient-to-br from-purple-500/5 to-blue-600/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden hover:border-purple-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20"
              >
                <div className="p-8 h-full flex flex-col">
                  <h3 className="text-xl font-semibold mb-4 text-white">
                    What happens to my analogies if I downgrade to the Curious
                    plan?
                  </h3>
                  <p className="text-gray-400 flex-1 text-md leading-relaxed">
                    You'll still have access to all analogies you created during
                    your Scholar plan. However, you won't be able to generate
                    new analogies until your storage is back under the
                    100-analogy cap for Curious users.
                  </p>
                </div>
              </motion.div>

              {/* FAQ Item 8 */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                viewport={{ once: true }}
                className="group relative bg-gradient-to-br from-purple-500/5 to-blue-600/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden hover:border-purple-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20"
              >
                <div className="p-8 h-full flex flex-col">
                  <h3 className="text-xl font-semibold mb-4 text-white">
                    What's the difference between Curious and Scholar?
                  </h3>
                  <p className="text-gray-400 flex-1 text-md leading-relaxed">
                    <strong>Curious (Free):</strong> Up to 5 analogies per day,
                    max 100 stored analogies, 1 analogy/minute rate limit
                    <br />
                    <br />
                    <strong>Scholar ($6.99/month):</strong> Up to 500 stored
                    analogies, higher generation rate (5/min), and no daily cap
                    (up to 500/month)
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
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
                      <p>
                        Are you sure you want to downgrade to the Curious plan?
                      </p>

                      <div className="text-left bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                        <p className="text-red-300 font-medium mb-2">
                          You'll lose access to:
                        </p>
                        <ul className="text-sm text-gray-300 space-y-1">
                          <li className="flex items-center space-x-2">
                            <IconX className="w-4 h-4 text-red-400 flex-shrink-0" />
                            <span>
                              Higher generation limits (100/day vs 20/day)
                            </span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <IconX className="w-4 h-4 text-red-400 flex-shrink-0" />
                            <span>
                              Increased storage (500 vs 100 analogies)
                            </span>
                          </li>
                          <li className="flex items-center space-x-2">
                            <IconX className="w-4 h-4 text-red-400 flex-shrink-0" />
                            <span>Faster rate limits (5/min vs 1/min)</span>
                          </li>
                        </ul>
                      </div>

                      <p className="text-yellow-300">
                        You'll keep Scholar benefits until your next billing
                        cycle on{" "}
                        {userStats?.renewalDate &&
                          formatDate(userStats.renewalDate)}
                        .
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
