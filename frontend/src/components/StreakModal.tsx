import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MovingBorderButton } from "./MovingBorder";
import { BackgroundGradient } from "./BackgroundGradient";
import { IconX, IconFlame, IconTrophy, IconBrain } from "@tabler/icons-react";
import { useStreak } from "@/lib/streakContext";

interface StreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  isNewStreak?: boolean; // Whether this is a new streak (for celebration)
}

export default function StreakModal({
  isOpen,
  onClose,
  isNewStreak = false,
}: StreakModalProps) {
  const { streakData, lifetimeAnalogies } = useStreak();
  //   const [showCelebration, setShowCelebration] = useState(false);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  //   useEffect(() => {
  //     if (isOpen && isNewStreak) {
  //       setShowCelebration(true);
  //       const timer = setTimeout(() => setShowCelebration(false), 2000);
  //       return () => clearTimeout(timer);
  //     }
  //   }, [isOpen, isNewStreak]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getStreakMessage = () => {
    if (!streakData) return "Keep up the great work!";

    const { current_streak_count, is_streak_active } = streakData;

    if (current_streak_count === 0) {
      return "Start your streak today!";
    } else if (current_streak_count === 1) {
      return "Great start! Keep it going!";
    } else if (is_streak_active) {
      return `Amazing! You're on fire for ${current_streak_count} days!`;
    } else {
      return "Don't break the chain!";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-sm sm:max-w-md lg:max-w-lg"
          >
            <BackgroundGradient containerClassName="rounded-lg p-[2px]">
              <div className="relative bg-[#1a1a1a] rounded-lg p-6 sm:p-8 w-full">
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors duration-200"
                >
                  <IconX className="w-4 h-4" />
                </button>

                {/* Celebration animation */}
                {/* {showCelebration && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  >
                    <div className="text-6xl animate-bounce">
                      <IconFlame className="w-16 h-16 text-orange-400" />
                    </div>
                  </motion.div>
                )} */}

                {/* Content */}
                <div className="space-y-6">
                  {/* Header */}
                  <div className="text-center space-y-3">
                    <div className="flex justify-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                        <IconFlame className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">
                        Daily Streak
                      </h3>
                      <p className="text-gray-400 text-sm mt-1">
                        {getStreakMessage()}
                      </p>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 gap-4">
                    {/* Current Streak */}
                    <BackgroundGradient containerClassName="rounded-lg p-[1px]">
                      <div className="bg-[#1a1a1a] rounded-lg p-4 flex items-center justify-between w-full">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                            <IconFlame className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              Daily Streak
                            </p>
                            <p className="text-gray-400 text-sm">
                              Current streak
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-orange-400">
                            {streakData?.current_streak_count || 0}
                          </p>
                          <p className="text-gray-400 text-sm">
                            {streakData?.current_streak_count === 1
                              ? "day"
                              : "days"}
                          </p>
                        </div>
                      </div>
                    </BackgroundGradient>

                    {/* Longest Streak */}
                    <BackgroundGradient containerClassName="rounded-lg p-[1px]">
                      <div className="bg-[#1a1a1a] rounded-lg p-4 flex items-center justify-between w-full">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
                            <IconTrophy className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              Longest Streak
                            </p>
                            <p className="text-gray-400 text-sm">Best record</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-yellow-400">
                            {streakData?.longest_streak_count || 0}
                          </p>
                          <p className="text-gray-400 text-sm">
                            {streakData?.longest_streak_count === 1
                              ? "day"
                              : "days"}
                          </p>
                        </div>
                      </div>
                    </BackgroundGradient>

                    {/* Total Analogies */}
                    <BackgroundGradient containerClassName="rounded-lg p-[1px]">
                      <div className="bg-[#1a1a1a] rounded-lg p-4 flex items-center justify-between w-full">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                            <IconBrain className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              Lifetime Analogies
                            </p>
                            <p className="text-gray-400 text-sm">Generated</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-purple-400">
                            {lifetimeAnalogies}
                          </p>
                          <p className="text-gray-400 text-sm">
                            {lifetimeAnalogies === 1 ? "analogy" : "analogies"}
                          </p>
                        </div>
                      </div>
                    </BackgroundGradient>
                  </div>

                  {/* Action Button */}
                  <div className="flex items-center justify-center">
                    <MovingBorderButton
                      onClick={onClose}
                      borderRadius="0.5rem"
                      duration={3000}
                      containerClassName="w-auto h-auto"
                      borderClassName="bg-[radial-gradient(#0ea5e9_40%,transparent_60%)] opacity-90 blur-sm"
                      className="min-w-[240px] px-8 py-3 rounded-lg font-medium transition bg-purple-700 hover:bg-purple-800 border border-purple-500/50 text-white shadow-md text-base"
                    >
                      Keep Going!
                    </MovingBorderButton>
                  </div>
                </div>
              </div>
            </BackgroundGradient>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
