"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ComponentSpinner, LoadingMessage } from "@/components/LoadingSpinner";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("Auth callback initiated");
        console.log("Current URL:", window.location.href);
        console.log("Search params:", searchParams.toString());
        
        // Get the next parameter for where to redirect after successful auth
        const next = searchParams.get("next") || "/";
        console.log("Redirect target:", next);
        
        // Check if we have a hash fragment (which contains the auth code)
        if (typeof window !== "undefined" && window.location.hash) {
          console.log("Hash fragment found:", window.location.hash);
          
          // Exchange the code for a session
          const { data, error } = await supabase.auth.exchangeCodeForSession(
            window.location.href
          );

          if (error) {
            console.error("Error exchanging code for session:", error);
            setError("Authentication failed. Please try again.");
            setIsProcessing(false);
            return;
          }

          if (data.session) {
            console.log("Successfully authenticated user:", data.user?.email);
            // Redirect to the intended route
            router.replace(next);
          } else {
            console.error("No session returned from code exchange");
            setError("Authentication failed. Please try again.");
            setIsProcessing(false);
          }
        } else {
          // No hash fragment, redirect to home
          console.log("No auth code found, redirecting to home");
          router.replace("/");
        }
      } catch (err) {
        console.error("Unexpected error during auth callback:", err);
        setError("An unexpected error occurred. Please try again.");
        setIsProcessing(false);
      }
    };

    handleCallback();
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Authentication Error</div>
          <div className="text-gray-300 mb-6">{error}</div>
          <button
            onClick={() => router.push("/login")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <ComponentSpinner className="mx-auto mb-4" />
        <LoadingMessage message="Verifying Your Email..." />
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <ComponentSpinner className="mx-auto mb-4" />
          <LoadingMessage message="Loading..." />
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
