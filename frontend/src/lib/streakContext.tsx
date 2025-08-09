"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './auth';
import { api } from './api';
import { useNotification } from './notificationContext';

interface StreakData {
  current_streak_count: number;
  longest_streak_count: number;
  last_streak_date: string | null;
  last_analogy_time: string | null;
  is_streak_active: boolean;
  days_since_last_analogy: number | null;
  streak_was_reset?: boolean;
}

interface StreakContextType {
  streakData: StreakData | null;
  lifetimeAnalogies: number;
  loadingStreak: boolean;
  refreshStreakData: () => Promise<void>;
  streakWasReset: boolean;
  clearStreakResetFlag: () => void;
}

const StreakContext = createContext<StreakContextType | undefined>(undefined);

export function StreakProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [lifetimeAnalogies, setLifetimeAnalogies] = useState(0);
  const [loadingStreak, setLoadingStreak] = useState(false);
  const [streakWasReset, setStreakWasReset] = useState(false);
  const [hasShownResetNotification, setHasShownResetNotification] = useState(false);

  const fetchStreakData = useCallback(async () => {
    if (user) {
      try {
        setLoadingStreak(true);
        
        // Get user's timezone
        const getUserTimezone = () => {
          try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
          } catch (error) {
            console.warn("Could not get user timezone, falling back to UTC:", error);
            return "UTC";
          }
        };
        
        const timezoneStr = getUserTimezone();
        
        const [streakResponse, lifetimeResponse] = await Promise.all([
          api.getUserStreak(user.id, timezoneStr),
          api.getUserLifetimeAnalogiesCount(user.id)
        ]);
        setStreakData(streakResponse);
        setLifetimeAnalogies(lifetimeResponse.lifetime_count || 0);
        
        // Check if streak was reset during this fetch
        if (streakResponse.streak_was_reset && !hasShownResetNotification) {
          setStreakWasReset(true);
          setHasShownResetNotification(true);
          
          // Format the last analogy time for the notification
          let lastAnalogyTime = "unknown time";
          if (streakResponse.last_analogy_time) {
            try {
              const date = new Date(streakResponse.last_analogy_time);
              lastAnalogyTime = date.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              });
            } catch (e) {
              console.error("Error formatting date:", e);
            }
          }
          
          // Show global notification instead of multiple alerts
          showNotification({
            title: "Streak Reset",
            message: `Your daily streak has been reset because your last analogy was generated on ${lastAnalogyTime}. Keep going to build it back up!`,
            type: "warning",
            confirmText: "Got it!"
          });
          
          // Acknowledge the streak reset so it won't show again
          try {
            await api.acknowledgeStreakReset(user.id);
            console.log("Streak reset acknowledged successfully");
          } catch (error) {
            console.error("Error acknowledging streak reset:", error);
          }
          
          console.log("Streak was reset during fetch");
        }
      } catch (error) {
        console.error("Error fetching streak data:", error);
      } finally {
        setLoadingStreak(false);
      }
    }
  }, [user, hasShownResetNotification, showNotification]);

  const refreshStreakData = useCallback(async () => {
    await fetchStreakData();
  }, [fetchStreakData]);

  const clearStreakResetFlag = useCallback(() => {
    setStreakWasReset(false);
  }, []);

  useEffect(() => {
    fetchStreakData();
  }, [fetchStreakData]);

  return (
    <StreakContext.Provider value={{
      streakData,
      lifetimeAnalogies,
      loadingStreak,
      refreshStreakData,
      streakWasReset,
      clearStreakResetFlag
    }}>
      {children}
    </StreakContext.Provider>
  );
}

export function useStreak() {
  const context = useContext(StreakContext);
  if (context === undefined) {
    throw new Error('useStreak must be used within a StreakProvider');
  }
  return context;
} 