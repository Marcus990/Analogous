"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import ProfileCompletionGuard from "./ProfileCompletionGuard";
import { useNotification } from "@/lib/notificationContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireProfileCompletion?: boolean;
  redirectTo?: string;
}

export default function ProtectedRoute({ 
  children, 
  requireProfileCompletion = true,
  redirectTo = "/signupinformation"
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const { showNotification } = useNotification();
  const [notified, setNotified] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        if (!notified) {
          showNotification({
            title: "Authentication Required",
            message: "Please log in to continue.",
            type: "error",
            confirmText: "OK",
          });
          setNotified(true);
        }
        router.push('/login');
      } else {
        setIsChecking(false);
      }
    }
  }, [user, loading, router, showNotification, notified]);

  // Show loading while checking authentication
  if (loading || isChecking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user, don't render anything (will redirect)
  if (!user) {
    return null;
  }

  // If profile completion is required, wrap with ProfileCompletionGuard
  if (requireProfileCompletion) {
    return (
      <ProfileCompletionGuard redirectTo={redirectTo}>
        {children}
      </ProfileCompletionGuard>
    );
  }

  // Otherwise, just render the children
  return <>{children}</>;
}
