"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { MovingBorderButton } from "@/components/MovingBorder";
import { redirectToCheckout } from "@/lib/stripe";
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
  IconRocket,
  IconPhoto,
  IconShare,
  IconUsers,
} from "@tabler/icons-react";

export default function PublicPricingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const handlePlanAction = async (planType: "curious" | "scholar") => {
    if (planType === "curious") {
      if (user) {
        // If user is logged in, redirect to dashboard pricing page
        router.push("/dashboard/pricing");
      } else {
        // If user is not logged in, redirect to signup page
        router.push("/signup");
      }
    } else if (planType === "scholar") {
      if (user) {
        // If user is logged in, start Stripe checkout
        try {
          const successUrl = `${window.location.origin}/dashboard/pricing?success=true`;
          const cancelUrl = `${window.location.origin}/dashboard/pricing?canceled=true`;
          await redirectToCheckout(user.id, successUrl, cancelUrl);
        } catch (error) {
          console.error("Error starting checkout:", error);
          // Fallback to dashboard pricing page
          router.push("/dashboard/pricing");
        }
      } else {
        // If user is not logged in, redirect to signup page
        router.push("/signup");
      }
    }
  };

  if (loading) {
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
          className="space-y-20 sm:space-y-24"
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
                  Pricing Plans
                </h1>
              </div>
            </div>
            
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Choose the perfect plan for your analogy learning journey. Start
              free and upgrade when you're ready to explore unlimited
              possibilities.
            </p>
          </motion.div>

          {/* Pricing Plans Section */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            className="space-y-12"
          >
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
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-2">
                    Curious
                  </h3>
                  <p className="text-gray-400 text-lg mb-4">
                    For learners getting started with analogies
                  </p>

                  <div className="flex items-baseline space-x-1">
                    <span className="text-4xl font-bold text-white">
                      Free
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
                  <MovingBorderButton
                    onClick={() => handlePlanAction("curious")}
                    borderRadius="0.5rem"
                    duration={3000}
                    containerClassName="w-full h-auto"
                    borderClassName="bg-[radial-gradient(#10b981_40%,transparent_60%)] opacity-90 blur-sm"
                    className="w-full py-4 px-6 rounded-lg font-semibold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white shadow-lg shadow-green-500/25 transition-all duration-200 text-base"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <IconBrain className="w-5 h-5" />
                      <span>Get Started for Free</span>
                    </div>
                  </MovingBorderButton>
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
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                    <div className="flex items-center space-x-2">
                      <IconSchool className="w-4 h-4" />
                      <span>Best Value</span>
                    </div>
                  </div>
                </div>

                {/* Card */}
                <div className="group relative bg-gradient-to-br from-purple-500/5 to-purple-600/5 backdrop-blur-sm rounded-xl border border-purple-500/30 shadow-2xl shadow-purple-500/20 overflow-hidden hover:border-purple-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/30">
                  {/* Card Header */}
                  <div className="p-8 border-b border-purple-500/20">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300 group-hover:bg-purple-500/30 transition-colors duration-300">
                        <IconSchool className="w-6 h-6" />
                      </div>
                      <div className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm font-medium">
                        Popular
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
                      <span className="text-gray-400 text-lg">
                        /month
                      </span>
                      <span className="absolute -bottom-1 -right-1 text-xs text-gray-500">CAD</span>
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
                    <MovingBorderButton
                      onClick={() => handlePlanAction("scholar")}
                      borderRadius="0.5rem"
                      duration={3000}
                      containerClassName="w-full h-auto"
                      borderClassName="bg-[radial-gradient(#0ea5e9_40%,transparent_60%)] opacity-90 blur-sm"
                      className="w-full py-4 px-6 rounded-lg font-semibold bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white shadow-lg shadow-purple-500/25 transition-all duration-200 text-base"
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <IconSchool className="w-5 h-5" />
                        <span>Start Off Strong</span>
                      </div>
                    </MovingBorderButton>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Additional Features Section */}
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
                  Why Choose Analogous?
                </h2>
              </div>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                Discover the power of analogical thinking with our AI-powered
                platform
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Feature 1 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                viewport={{ once: true }}
                className="group relative bg-gradient-to-br from-purple-500/5 to-purple-600/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden hover:border-purple-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20"
              >
                <div className="p-8 h-full flex flex-col">
                  <div className="w-16 h-16 rounded-xl bg-purple-500/20 flex items-center justify-center mb-6 group-hover:bg-purple-500/30 transition-colors duration-300">
                    <IconBrain className="w-8 h-8 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4 text-white">
                    AI-Powered Learning
                  </h3>
                  <p className="text-gray-400 flex-1 text-lg leading-relaxed">
                    Advanced AI generates personalized analogies to enhance your
                    understanding
                  </p>
                </div>
              </motion.div>

              {/* Feature 2 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
                className="group relative bg-gradient-to-br from-blue-500/5 to-blue-600/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden hover:border-blue-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/20"
              >
                <div className="p-8 h-full flex flex-col">
                  <div className="w-16 h-16 rounded-xl bg-blue-500/20 flex items-center justify-center mb-6 group-hover:bg-blue-500/30 transition-colors duration-300">
                    <IconPhoto className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4 text-white">
                    Visual Learning
                  </h3>
                  <p className="text-gray-400 flex-1 text-lg leading-relaxed">
                    Comic book format with SDXL-generated images for better
                    retention
                  </p>
                </div>
              </motion.div>

              {/* Feature 3 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                viewport={{ once: true }}
                className="group relative bg-gradient-to-br from-green-500/5 to-green-600/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden hover:border-green-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/20"
              >
                <div className="p-8 h-full flex flex-col">
                  <div className="w-16 h-16 rounded-xl bg-green-500/20 flex items-center justify-center mb-6 group-hover:bg-green-500/30 transition-colors duration-300">
                    <IconShare className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4 text-white">
                    Easy Sharing
                  </h3>
                  <p className="text-gray-400 flex-1 text-lg leading-relaxed">
                    One-click sharing to spread knowledge with friends and followers
                  </p>
                </div>
              </motion.div>

              {/* Feature 4 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                viewport={{ once: true }}
                className="group relative bg-gradient-to-br from-pink-500/5 to-pink-600/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden hover:border-pink-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/20"
              >
                <div className="p-8 h-full flex flex-col">
                  <div className="w-16 h-16 rounded-xl bg-pink-500/20 flex items-center justify-center mb-6 group-hover:bg-pink-500/30 transition-colors duration-300">
                    <IconTrendingUp className="w-8 h-8 text-pink-400" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4 text-white">
                    Track Progress
                  </h3>
                  <p className="text-gray-400 flex-1 text-lg leading-relaxed">
                    Monitor your learning journey with detailed analytics and
                    insights
                  </p>
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
            className="space-y-12"
          >
            <div className="text-center max-w-4xl mx-auto">
              <div className="neonText">
                <h2 className="font-[PlantinMTProSemiBold] text-3xl sm:text-4xl md:text-5xl mb-6">
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
                    You'll be billed every 30 days from the date you first upgrade
                    to the Scholar plan.
                  </p>
                </div>
              </motion.div>

              {/* FAQ Item 2 */}
              <motion.div
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
                    cancellation, you'll retain your Scholar plan benefits until the
                    end of your current billing cycle, and then your plan will
                    automatically revert to Curious (free).
                  </p>
                </div>
              </motion.div>

              {/* FAQ Item 3 */}
              <motion.div
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
                    Absolutely! You can switch back to the Scholar plan at any time
                    and your new billing cycle will start from the date of upgrade.
                  </p>
                </div>
              </motion.div>

              {/* FAQ Item 5 */}
              <motion.div
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
                    We currently accept all major credit and debit cards. Additional
                    payment options may be added in the future.
                  </p>
                </div>
              </motion.div>

              {/* FAQ Item 6 */}
              <motion.div
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
                    We don't offer a trial period at this time, but the Curious plan
                    includes access to all core features so you can get a full feel
                    for the platform before upgrading.
                  </p>
                </div>
              </motion.div>

              {/* FAQ Item 7 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                viewport={{ once: true }}
                className="group relative bg-gradient-to-br from-purple-500/5 to-blue-600/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden hover:border-purple-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20"
              >
                <div className="p-8 h-full flex flex-col">
                  <h3 className="text-xl font-semibold mb-4 text-white">
                    What happens to my analogies if I downgrade to the Curious plan?
                  </h3>
                  <p className="text-gray-400 flex-1 text-md leading-relaxed">
                    You'll still have access to all analogies you created during
                    your Scholar plan. However, you won't be able to generate new
                    analogies until your storage is back under the 100-analogy cap
                    for Curious users.
                  </p>
                </div>
              </motion.div>

              {/* FAQ Item 8 */}
              <motion.div
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
                    <strong>Curious (Free):</strong> Up to 5 analogies per day, max
                    100 stored analogies, 1 analogy/minute rate limit
                    <br />
                    <br />
                    <strong>Scholar ($6.99/month):</strong> Up to 500 stored
                    analogies, higher generation rate (5/min), and no daily cap (up
                    to 500/month)
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* CTA Section */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            className="text-center space-y-8"
          >
            <div className="group relative bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm rounded-xl border border-purple-500/30 overflow-hidden hover:border-purple-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/20">
              <div className="p-12">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-6 group-hover:bg-purple-500/30 transition-colors duration-300">
                  <IconRocket className="w-8 h-8 text-purple-300" />
                </div>
                <div className="neonText mb-4">
                  <h2 className="font-[PlantinMTProSemiBold] text-3xl sm:text-4xl md:text-5xl mb-4">
                    Ready to Start Learning?
                  </h2>
                </div>
                <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
                  Join thousands of learners who are already mastering analogical
                  thinking with our AI-powered platform.
                </p>
                <MovingBorderButton
                  onClick={() => handlePlanAction("curious")}
                  borderRadius="0.5rem"
                  duration={3000}
                  containerClassName="w-auto h-auto"
                  borderClassName="bg-[radial-gradient(#10b981_40%,transparent_60%)] opacity-90 blur-sm"
                  className="px-8 py-4 rounded-lg font-semibold transition bg-green-600 hover:bg-green-500 border border-green-500/50 text-white shadow-md text-lg"
                >
                  Get Started Free
                </MovingBorderButton>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
