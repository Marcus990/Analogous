"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { BackgroundGradient } from "@/components/BackgroundGradient";
import PricingPlans from "@/components/PricingPlans";
import { MovingBorderButton } from "@/components/MovingBorder";
import {
  IconArrowLeft,
  IconCrown,
  IconSparkles,
  IconCheck,
  IconInfinity,
  IconClock,
  IconShare,
  IconPhoto,
  IconBrain,
  IconRocket,
  IconUsers,
  IconTrendingUp,
} from "@tabler/icons-react";
import "./page.css";

export default function PublicPricingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">

      {/* Header */}
      <div className="relative z-10">
        <div className="relative z-20 px-6 py-8 max-w-7xl mx-auto">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => router.push(user ? "/dashboard" : "/")}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <IconArrowLeft className="w-5 h-5" />
              <span>{user ? "Back to Dashboard" : "Back to Home"}</span>
            </button>
            

          </div>

          {/* Page Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="flex flex-col items-center justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-6">
                <IconSparkles className="w-8 h-8 text-purple-400" />
              </div>
              <div className="neonText">
                <span className="font-[PlantinMTProSemiBold] text-[3rem] md:text-[5rem] transition-transform duration-300 hover:scale-105">
                  Pricing Plans
                </span>
              </div>
            </div>
            <p className="text-gray-400 text-xl max-w-3xl mx-auto leading-relaxed">
              Choose the perfect plan for your analogy learning journey. Start free and upgrade when you're ready to explore unlimited possibilities.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-16">
        {/* Pricing Plans */}
        <PricingPlans />

        {/* Additional Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-20"
        >
                      <div className="text-center mb-12">
              <div className="neonText mb-4">
                <span className="font-[PlantinMTProSemiBold] text-[2rem] md:text-[3rem] transition-transform duration-300 hover:scale-105">
                  Why Choose Analogous?
                </span>
              </div>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Discover the power of analogical thinking with our AI-powered platform
              </p>
            </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="bg-gradient-to-br from-purple-500/5 to-purple-600/5 backdrop-blur-sm rounded-lg border border-purple-500/20 p-6 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <IconBrain className="w-6 h-6 text-purple-300" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">AI-Powered Learning</h3>
              <p className="text-gray-400 text-sm">
                Advanced AI generates personalized analogies to enhance your understanding
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="bg-gradient-to-br from-blue-500/5 to-blue-600/5 backdrop-blur-sm rounded-lg border border-blue-500/20 p-6 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                <IconPhoto className="w-6 h-6 text-blue-300" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Visual Learning</h3>
              <p className="text-gray-400 text-sm">
                Comic book format with SDXL-generated images for better retention
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="bg-gradient-to-br from-green-500/5 to-green-600/5 backdrop-blur-sm rounded-lg border border-green-500/20 p-6 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <IconShare className="w-6 h-6 text-green-300" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Easy Sharing</h3>
              <p className="text-gray-400 text-sm">
                One-click sharing to spread knowledge with friends and followers
              </p>
            </motion.div>

            {/* Feature 4 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="bg-gradient-to-br from-pink-500/5 to-pink-600/5 backdrop-blur-sm rounded-lg border border-pink-500/20 p-6 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center mx-auto mb-4">
                <IconTrendingUp className="w-6 h-6 text-pink-300" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Track Progress</h3>
              <p className="text-gray-400 text-sm">
                Monitor your learning journey with detailed analytics and insights
              </p>
            </motion.div>
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="mt-20"
        >
                      <div className="text-center mb-12">
              <div className="neonText mb-4">
                <span className="font-[PlantinMTProSemiBold] text-[2rem] md:text-[3rem] transition-transform duration-300 hover:scale-105">
                  Frequently Asked Questions
                </span>
              </div>
              <p className="text-gray-400 text-lg">
                Everything you need to know about our pricing and features
              </p>
            </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* FAQ Item 1 */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                Can I upgrade or downgrade my plan anytime?
              </h3>
              <p className="text-gray-400 text-sm">
                Yes! You can upgrade to Scholar at any time. If you downgrade, you'll keep your current features until the end of your billing period.
              </p>
            </div>

            {/* FAQ Item 2 */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                What happens to my analogies if I cancel?
              </h3>
              <p className="text-gray-400 text-sm">
                Your analogies are safe! You can still access all your created content, but you'll be limited to the free plan's generation limits.
              </p>
            </div>

            {/* FAQ Item 3 */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                Is there a free trial for the Scholar plan?
              </h3>
              <p className="text-gray-400 text-sm">
                We offer a 7-day free trial for the Scholar plan. You can cancel anytime during the trial period without being charged.
              </p>
            </div>

            {/* FAQ Item 4 */}
            <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                Do you offer refunds?
              </h3>
              <p className="text-gray-400 text-sm">
                We offer a 30-day money-back guarantee. If you're not satisfied, contact our support team for a full refund.
              </p>
            </div>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.1 }}
          className="mt-20 text-center"
        >
                      <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm rounded-lg border border-purple-500/20 p-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-6">
                <IconRocket className="w-8 h-8 text-purple-300" />
              </div>
              <div className="neonText mb-4">
                <span className="font-[PlantinMTProSemiBold] text-[2rem] md:text-[3rem] transition-transform duration-300 hover:scale-105">
                  Ready to Start Learning?
                </span>
              </div>
              <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
                Join thousands of learners who are already mastering analogical thinking with our AI-powered platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <MovingBorderButton
                  onClick={() => router.push("/signup")}
                  borderRadius="0.5rem"
                  duration={3000}
                  containerClassName="w-auto h-auto"
                  borderClassName="bg-[radial-gradient(#0ea5e9_40%,transparent_60%)] opacity-90 blur-sm"
                  className="px-8 py-4 rounded-lg font-semibold transition bg-purple-800 hover:bg-purple-700 border border-purple-500/50 text-white shadow-md"
                >
                  Get Started Free
                </MovingBorderButton>
              </div>
            </div>
        </motion.div>
      </div>
    </div>
  );
} 