"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import ProfileCompletionGuard from "./ProfileCompletionGuard";
import { useNotification } from "@/lib/notificationContext";
import { ComponentSpinner, LoadingMessage } from "./LoadingSpinner";

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
          <ComponentSpinner className="mx-auto mb-4" />
          <LoadingMessage message="Loading..." />
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
