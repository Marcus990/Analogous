import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MovingBorderButton } from "./MovingBorder";
import { BackgroundGradient } from "./BackgroundGradient";
import { IconX, IconFlame, IconTrophy, IconBrain } from "@tabler/icons-react";
import { useStreak } from "@/lib/streakContext";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import Calendar from "./Calendar";

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
  const { user } = useAuth();
  const [streakLogs, setStreakLogs] = useState<string[]>([]);
  const [loadingStreakLogs, setLoadingStreakLogs] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Get user's timezone
  const getUserTimezone = () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      console.warn("Could not get user timezone, falling back to UTC:", error);
      return "UTC";
    }
  };

  // Fetch streak logs for the selected month
  const fetchStreakLogs = async (month: number, year: number) => {
    if (!user) return;

    try {
      setLoadingStreakLogs(true);
      const timezoneStr = getUserTimezone();
      console.log("Fetching streak logs with timezone:", timezoneStr);
      console.log("Fetching for month:", month, "year:", year);

      const response = await api.getUserStreakLogs(
        user.id,
        year,
        month,
        timezoneStr
      );
      console.log("Streak logs response:", response);
      console.log("Streak logs dates:", response.streak_logs);
      console.log("Response timezone:", response.timezone);

      // Debug: Check if today is in the streak logs
      const today = new Date().toLocaleDateString("en-CA");
      console.log("Today in user timezone:", today);
      console.log(
        "Is today in streak logs?",
        response.streak_logs.includes(today)
      );

      setStreakLogs(response.streak_logs);
    } catch (error) {
      console.error("Error fetching streak logs:", error);
      setStreakLogs([]);
    } finally {
      setLoadingStreakLogs(false);
    }
  };

  // Load streak logs when modal opens or month changes
  useEffect(() => {
    if (isOpen && user) {
      fetchStreakLogs(selectedMonth, selectedYear);
    }
  }, [isOpen, user, selectedMonth, selectedYear]);

  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

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

  function StatCard({
    icon,
    title,
    subtitle,
    value,
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    value: number;
  }) {
    return (
      <div className="flex items-center justify-between bg-[#1f1f1f] p-3 sm:p-4 rounded-lg shadow-inner">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#30203f] flex items-center justify-center">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white font-medium text-sm sm:text-base truncate">{title}</p>
            <p className="text-gray-400 text-xs sm:text-sm truncate">{subtitle}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-2">
          <p className="text-xl sm:text-2xl font-bold text-purple-400">{value}</p>
          <p className="text-gray-400 text-xs sm:text-sm">
            {value === 1
              ? title.includes("Analogy")
                ? "analogy"
                : "day"
              : title.includes("Analogy")
              ? "analogies"
              : "days"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative w-full max-w-sm sm:max-w-md lg:max-w-4xl max-h-[90vh] overflow-y-auto"
          >
            <BackgroundGradient containerClassName="rounded-lg p-[2px]">
              <div className="relative bg-[#1a1a1a] rounded-lg p-4 sm:p-6 lg:p-8 w-full">
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-2 right-2 sm:top-3 sm:right-3 lg:top-4 lg:right-4 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors duration-200"
                >
                  <IconX className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>

                {/* Content */}
                <div className="space-y-4 sm:space-y-6">
                  {/* Header */}
                  <div className="text-center space-y-2 sm:space-y-3">
                    <div className="flex justify-center">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                        <IconFlame className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-bold text-white">
                        Daily Streak
                      </h3>
                      <p className="text-gray-400 text-xs sm:text-sm mt-1 px-2">
                        {getStreakMessage()}
                      </p>
                    </div>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 rounded-xl p-3 sm:p-6 shadow-lg"
                  >
                    {/* Left: Streak Stats */}
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      className="space-y-3 sm:space-y-4"
                    >
                      <StatCard
                        icon={<IconFlame className="text-purple-400" />}
                        title="Daily Streak"
                        subtitle="Current streak"
                        value={streakData?.current_streak_count || 0}
                      />
                      <StatCard
                        icon={<IconTrophy className="text-purple-400" />}
                        title="Longest Streak"
                        subtitle="Best record"
                        value={streakData?.longest_streak_count || 0}
                      />
                      <StatCard
                        icon={<IconBrain className="text-purple-400" />}
                        title="Lifetime Analogies"
                        subtitle="Generated"
                        value={lifetimeAnalogies}
                      />
                    </motion.div>

                    {/* Right: Calendar */}
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex justify-center items-center"
                    >
                      {loadingStreakLogs ? (
                        <div className="h-32 sm:h-48 w-full flex items-center justify-center">
                          <div className="animate-spin h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-purple-400 rounded-full" />
                        </div>
                      ) : (
                        <Calendar
                          activeStreakDates={streakLogs}
                          selectedMonth={selectedMonth}
                          selectedYear={selectedYear}
                          onMonthChange={handleMonthChange}
                        />
                      )}
                    </motion.div>
                  </motion.div>

                  {/* Action Button */}
                  <div className="flex items-center justify-center">
                    <MovingBorderButton
                      onClick={onClose}
                      borderRadius="0.5rem"
                      duration={3000}
                      containerClassName="w-auto h-auto"
                      borderClassName="bg-[radial-gradient(#0ea5e9_40%,transparent_60%)] opacity-90 blur-sm"
                      className="min-w-[200px] sm:min-w-[240px] px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-medium transition bg-purple-700 hover:bg-purple-800 border border-purple-500/50 text-white shadow-md text-sm sm:text-base"
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
