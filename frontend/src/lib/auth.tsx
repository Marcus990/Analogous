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
    firstName: string,
    lastName: string,
    username: string,
    optInEmailMarketing: boolean,
    captchaToken?: string
  ) => Promise<{ error: AuthError | null }>;
  resetPassword: (
    email: string
  ) => Promise<{ error: AuthError | null }>;
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
        
        // Call daily reset endpoint after successful login
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.access_token) {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/${data.user.id}/check-daily-reset`, {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${sessionData.session.access_token}`
              },
            });
          }
        } catch (resetError) {
          console.warn("Failed to check daily reset on login:", resetError);
          // Don't fail the login if daily reset check fails
        }
      }
      return { error };
    } catch (error) {
      console.error("Sign in error:", error);
      return { error: error as AuthError };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    username: string,
    optInEmailMarketing: boolean,
    captchaToken?: string
  ) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/signup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            first_name: firstName,
            last_name: lastName,
            username,
            opt_in_email_marketing: optInEmailMarketing,
            captchaToken,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          return {
            error: {
              message: "Too many signup attempts. Please wait a minute before trying again.",
              name: "RateLimitError",
            } as AuthError,
          };
        }
        const errorBody = await response.json();
        console.error("Sign up error response:", errorBody);
        return {
          error: {
            message: errorBody.detail || "Signup failed",
            name: "SignUpError",
          } as AuthError,
        };
      }

      const result = await response.json();

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

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      // First call backend endpoint for additional rate limiting and logging
      const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/request-password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!backendResponse.ok) {
        if (backendResponse.status === 429) {
          return { error: { message: "Too many password reset attempts. Please wait a minute before trying again.", name: "RateLimitError" } as AuthError };
        }
        const errorBody = await backendResponse.json();
        return { error: { message: errorBody.detail || "Failed to process password reset request", name: "ResetPasswordError" } as AuthError };
      }

      // Then call Supabase Auth for the actual password reset
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error };
    } catch (error) {
      console.error("Reset password error:", error);
      return { error: error as AuthError };
    }
  };

  const value = {
    user,
    signIn,
    signUp,
    resetPassword,
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
