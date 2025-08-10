"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { User, AuthError } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  signIn: (
    email: string,
    password: string,
    captchaToken?: string
  ) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
    captchaToken?: string
  ) => Promise<{ error: AuthError | null }>;
  completeUserProfile: (
    firstName: string,
    lastName: string,
    username: string,
    optInEmailMarketing: boolean
  ) => Promise<{ error: AuthError | null; data?: any }>;
  resetPassword: (
    email: string,
    captchaToken?: string
  ) => Promise<{ error: AuthError | null }>;
  setupUserProfile: () => Promise<{ error: AuthError | null; data?: any }>;
  checkProfileCompletion: () => Promise<{ isComplete: boolean; hasProfile: boolean }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        console.error("Error getting session:", error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.email);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkProfileCompletion = async (): Promise<{ isComplete: boolean; hasProfile: boolean }> => {
    if (!user) {
      return { isComplete: false, hasProfile: false };
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        return { isComplete: false, hasProfile: false };
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/${user.id}/profile-status`, {
        method: "GET",
        headers: { 
          "Authorization": `Bearer ${sessionData.session.access_token}`
        },
      });

      if (response.ok) {
        const statusData = await response.json();
        return { 
          isComplete: statusData.is_complete, 
          hasProfile: statusData.has_profile 
        };
      } else {
        console.error("Failed to check profile completion:", response.status);
        return { isComplete: false, hasProfile: false };
      }
    } catch (error) {
      console.error("Error checking profile completion:", error);
      return { isComplete: false, hasProfile: false };
    }
  };

  const signIn = async (email: string, password: string, captchaToken?: string) => {
    try {
      // First call backend endpoint for additional rate limiting and logging
      const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, captchaToken }),
      });

      if (!backendResponse.ok) {
        if (backendResponse.status === 429) {
          return { error: { message: "Too many login attempts. Please wait a minute before trying again.", name: "RateLimitError" } as AuthError };
        }
        const errorBody = await backendResponse.json();
        return { error: { message: errorBody.detail || "Failed to process login request", name: "LoginError" } as AuthError };
      }

      // Then call Supabase Auth for the actual login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          captchaToken,
        },
      });
      if (!error && data.user) {
        setUser(data.user);
        
        // Check profile completion instead of auto-creating profiles
        try {
          const { isComplete, hasProfile } = await checkProfileCompletion();
          
          if (!hasProfile) {
            // User has no profile - they need to complete signup
            console.log("User has no profile - redirecting to complete signup");
            // Note: We'll handle the redirect in the component that uses this hook
          } else if (!isComplete) {
            // User has a profile but it's incomplete (generic defaults)
            console.log("User has incomplete profile - redirecting to complete signup");
            // Note: We'll handle the redirect in the component that uses this hook
          } else {
            console.log("User profile is complete");
          }
        } catch (profileError) {
          console.error("Error checking profile completion:", profileError);
        }
      }
      return { error };
    } catch (error) {
      console.error("Sign in error:", error);
      return { error: error as AuthError };
    }
  };

  const signUp = async (email: string, password: string, captchaToken?: string) => {
    try {
      // First call backend endpoint for additional rate limiting and logging
      const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          captchaToken,
        }),
      });

      if (!backendResponse.ok) {
        if (backendResponse.status === 429) {
          return {
            error: {
              message: "Too many signup attempts. Please wait a minute before trying again.",
              name: "RateLimitError",
            } as AuthError,
          };
        }
        const errorBody = await backendResponse.json();
        console.error("Sign up error response:", errorBody);
        return {
          error: {
            message: errorBody.detail || "Signup failed",
            name: "SignUpError",
          } as AuthError,
        };
      }

      const result = await backendResponse.json();

      // Attempt to get session after backend signup
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      setUser(sessionData?.session?.user ?? null);

      return { error: null };
    } catch (error) {
      console.error("Sign up error:", error);
      return { error: error as AuthError };
    }
  };

  const completeUserProfile = async (
    firstName: string,
    lastName: string,
    username: string,
    optInEmailMarketing: boolean
  ) => {
    if (!user) {
      return { error: { message: "No user logged in", name: "AuthError" } as AuthError };
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        return { error: { message: "No valid session", name: "AuthError" } as AuthError };
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/complete-user-profile`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionData.session.access_token}`
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          username,
          opt_in_email_marketing: optInEmailMarketing,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        return {
          error: {
            message: errorBody.detail || "Failed to complete user profile",
            name: "ProfileError",
          } as AuthError,
        };
      }

      const result = await response.json();
      return { error: null, data: result };
    } catch (error) {
      console.error("Complete user profile error:", error);
      return { error: error as AuthError };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const resetPassword = async (email: string, captchaToken?: string) => {
    try {
      const redirectUrl = typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : `${process.env.NEXT_PUBLIC_SITE_URL || "https://analogous.app"}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
        captchaToken,
      });

      if (error) {
        return { error: error as AuthError };
      }

      return { error: null };
    } catch (error) {
      console.error("Reset password error:", error);
      return { error: error as AuthError };
    }
  };

  const setupUserProfile = async () => {
    if (!user) {
      return { error: { message: "No user logged in", name: "AuthError" } as AuthError };
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        return { error: { message: "No valid session", name: "AuthError" } as AuthError };
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/setup-user-profile`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionData.session.access_token}`
        },
      });

      if (!response.ok) {
        const errorBody = await response.json();
        return {
          error: {
            message: errorBody.detail || "Failed to setup user profile",
            name: "ProfileSetupError",
          } as AuthError,
        };
      }

      const result = await response.json();
      return { error: null, data: result };
    } catch (error) {
      console.error("Profile setup error:", error);
      return { error: error as AuthError };
    }
  };

  const value = {
    user,
    signIn,
    signUp,
    completeUserProfile,
    resetPassword,
    setupUserProfile,
    checkProfileCompletion,
    signOut,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
