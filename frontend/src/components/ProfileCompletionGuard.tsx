"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useNotification } from "@/lib/notificationContext";

interface ProfileCompletionGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export default function ProfileCompletionGuard({ 
  children, 
  redirectTo = "/signupinformation" 
}: ProfileCompletionGuardProps) {
  const { user, checkProfileCompletion } = useAuth();
  const router = useRouter();
  const { showNotification } = useNotification();
  const [isChecking, setIsChecking] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [notified, setNotified] = useState(false);

  useEffect(() => {
    const checkProfile = async () => {
      if (!user) {
        setIsChecking(false);
        return;
      }

      try {
        const { isComplete, hasProfile } = await checkProfileCompletion();
        
        if (!hasProfile || !isComplete) {
          // User needs to complete their profile
          if (!notified) {
            showNotification({
              title: "Complete Your Profile",
              message: "Please complete your profile before continuing.",
              type: "error",
              confirmText: "OK",
            });
            setNotified(true);
          }
          setShouldRedirect(true);
        }
      } catch (error) {
        console.error("Error checking profile completion:", error);
        // On error, assume profile is incomplete for safety
        setShouldRedirect(true);
      } finally {
        setIsChecking(false);
      }
    };

    checkProfile();
  }, [user, checkProfileCompletion, showNotification, notified]);

  useEffect(() => {
    if (shouldRedirect && !isChecking) {
      router.push(redirectTo);
    }
  }, [shouldRedirect, isChecking, router, redirectTo]);

  // Show loading while checking
  if (isChecking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Checking profile completion...</p>
        </div>
      </div>
    );
  }

  // If user needs to complete profile, show redirecting message
  if (shouldRedirect) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Redirecting to complete your profile...</p>
        </div>
      </div>
    );
  }

  // Profile is complete, render children
  return <>{children}</>;
}
