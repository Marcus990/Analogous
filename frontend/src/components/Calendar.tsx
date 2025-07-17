"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { BackgroundGradient } from "./BackgroundGradient";

interface CalendarProps {
  activeStreakDates: string[];
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number, year: number) => void;
}

export default function Calendar({
  activeStreakDates,
  selectedMonth,
  selectedYear,
  onMonthChange,
}: CalendarProps) {
  const [isNavigating, setIsNavigating] = useState(false);

  // Convert active streak dates to Date objects for easier comparison
  const activeDates = useMemo(() => {
    const dates = activeStreakDates.map((dateStr) => {
      // Parse the date string and create a date object
      const date = new Date(dateStr);
      // Return just the date part (YYYY-MM-DD) for consistent comparison
      return date.toISOString().split("T")[0];
    });
    console.log("Active streak dates:", activeStreakDates);
    console.log("Processed active dates:", dates);

    // Test the date comparison logic
    const today = new Date().toISOString().split("T")[0];
    console.log("Today's date for comparison:", today);
    console.log("Is today in active dates?", dates.includes(today));

    return dates;
  }, [activeStreakDates]);

  // Generate calendar data for the selected month
  const calendarData = useMemo(() => {
    const firstDay = new Date(selectedYear, selectedMonth - 1, 1);
    const lastDay = new Date(selectedYear, selectedMonth, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

    const days = [];
    const currentDate = new Date(startDate);

    // Get today's date in YYYY-MM-DD format for consistent comparison
    const today = new Date().toISOString().split("T")[0];
    console.log("Today's date:", today);

    // Generate 6 weeks of calendar days (42 days total)
    for (let i = 0; i < 42; i++) {
      const date = new Date(currentDate);
      const isCurrentMonth = date.getMonth() === selectedMonth - 1;
      const dateString = date.toISOString().split("T")[0];
      const isToday = dateString === today;
      const isActiveStreak = activeDates.includes(dateString);

      // Debug logging for today and streak days
      if (isToday || isActiveStreak) {
        console.log(
          `Date ${dateString}: isToday=${isToday}, isActiveStreak=${isActiveStreak}`
        );
      }

      days.push({
        date,
        isCurrentMonth,
        isToday,
        isActiveStreak,
        dayNumber: date.getDate(),
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  }, [selectedMonth, selectedYear, activeDates]);

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handlePreviousMonth = () => {
    setIsNavigating(true);
    const newMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const newYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    onMonthChange(newMonth, newYear);
    setTimeout(() => setIsNavigating(false), 300);
  };

  const handleNextMonth = () => {
    setIsNavigating(true);
    const newMonth = selectedMonth === 12 ? 1 : selectedMonth + 1;
    const newYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear;
    onMonthChange(newMonth, newYear);
    setTimeout(() => setIsNavigating(false), 300);
  };

  return (
    <div className="w-full max-w-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handlePreviousMonth}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          disabled={isNavigating}
        >
          <IconChevronLeft className="w-4 h-4" />
        </motion.button>

        <h3
          key={`${selectedYear}-${selectedMonth}`}
          className="text-lg font-semibold text-white"
        >
          {monthNames[selectedMonth - 1]} {selectedYear}
        </h3>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleNextMonth}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          disabled={isNavigating}
        >
          <IconChevronRight className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1">
        {calendarData.map((day, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.01 }}
            className="w-8 h-8 flex items-center justify-center"
          >
            {day.isActiveStreak ? (
              <BackgroundGradient containerClassName="rounded-lg p-[1px] w-8 h-8">
                <div className="w-full h-full rounded-lg bg-[#1a1a1a] flex items-center justify-center">
                  <span
                    className={`text-xs font-medium ${
                      day.isToday
                        ? "text-purple-400"
                        : day.isCurrentMonth
                        ? "text-white"
                        : "text-gray-600"
                    }`}
                  >
                    {day.dayNumber}
                  </span>
                </div>
              </BackgroundGradient>
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#1a1a1a]">
                <span
                  className={`text-xs font-medium ${
                    day.isToday
                      ? "text-purple-400"
                      : day.isCurrentMonth
                      ? "text-white"
                      : "text-gray-600"
                  }`}
                >
                  {day.dayNumber}
                </span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center space-x-4 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-purple-500 to-blue-500" />
          <span className="text-gray-400">Streak Day</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded border border-purple-400" />
          <span className="text-gray-400">Today</span>
        </div>
        {/* <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-purple-500 to-blue-500 border border-purple-400" />
          <span className="text-gray-400">Today + Streak</span>
        </div> */}
      </div>
    </div>
  );
}
