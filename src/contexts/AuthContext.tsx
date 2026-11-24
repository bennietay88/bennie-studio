/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { UserProfile, UserRole } from "../types";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  business: any | null;
  loading: boolean;
  error: string | null;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    pass: string,
    role?: UserRole,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  isAuthReady: boolean;
  clearError: () => void;
  isSigningIn: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [business, setBusiness] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const activeUid = useRef<string | null>(null);
  const profileRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setUser(null);
      setProfile(null);
      setBusiness(null);
      setLoading(false);
      setIsAuthReady(true);
      return;
    }

    let scheduled: ReturnType<typeof setTimeout> | undefined;
    let active = true;
    // INITIAL_SESSION is emitted by Supabase after initialization. Avoid a
    // second getSession request racing the subscription's initial event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const currentUser = session?.user ?? null;
      const uid = currentUser?.id ?? null;
      const changed = activeUid.current !== uid;
      activeUid.current = uid;
      setUser(currentUser);
      if (scheduled !== undefined) clearTimeout(scheduled);
      if (changed || !uid) {
        profileRequest.current?.abort();
        profileRequest.current = null;
        setProfile(null);
        setBusiness(null);
      }

      if (uid) {
        if (changed) {
          setLoading(true);
          setIsAuthReady(false);
        }
        // Run database and auth queries outside the auth callback's lock.
        scheduled = setTimeout(() => {
          scheduled = undefined;
          if (active && activeUid.current === uid) void fetchProfile(uid);
        }, 0);
      } else {
        setLoading(false);
        setIsAuthReady(true);
      }
    });

    return () => {
      active = false;
      if (scheduled !== undefined) clearTimeout(scheduled);
      activeUid.current = null;
      profileRequest.current?.abort();
      profileRequest.current = null;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (uid: string) => {
    if (activeUid.current !== uid) return;
    profileRequest.current?.abort();
    const controller = new AbortController();
    profileRequest.current = controller;
    const signal = controller.signal;
    const current = () => !signal.aborted && activeUid.current === uid && profileRequest.current === controller;
    try {
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .abortSignal(signal)
        .single();

      if (!current()) return;
      let resolvedProfile = data;
      if (profileError && profileError.code === "PGRST116") {
        // Profile provisioning is server-controlled. The browser never calls
        // the SECURITY DEFINER RPC or chooses role/business fields.
        const { data: sessionData } = await supabase.auth.getSession();
        if (!current()) return;
        const accessToken = sessionData.session?.access_token;
        if (!accessToken || sessionData.session?.user.id !== uid) throw new Error("AUTH_SESSION_REQUIRED");
        const response = await fetch("/api/auth/ensure-profile", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.profile) {
          throw new Error(payload.error || "PROFILE_PROVISIONING_FAILED");
        }
        resolvedProfile = payload.profile;
      } else if (profileError) {
        throw profileError;
      }

      if (!current() || !resolvedProfile) return;
      setProfile(mapProfile(resolvedProfile));
      if (resolvedProfile.business_id) {
        const { data: bizData } = await supabase
          .from("businesses")
          .select("*")
          .eq("id", resolvedProfile.business_id)
          .abortSignal(signal)
          .maybeSingle();
        if (current()) setBusiness(bizData || null);
      } else {
        setBusiness(null);
      }
    } catch (err: any) {
      if (!current()) return;
      console.error("Error fetching profile:", err);
      setError(err.message);
    } finally {
      if (current()) {
        profileRequest.current = null;
        setLoading(false);
        setIsAuthReady(true);
      }
    }
  };

  const mapProfile = (dbProfile: any): UserProfile => ({
    uid: dbProfile.id,
    email: dbProfile.email,
    role: dbProfile.role,
    businessId: dbProfile.business_id,
    onboardingCompleted: dbProfile.onboarding_completed,
    status: dbProfile.status,
    staffPermissions: Array.isArray(dbProfile.staff_permissions)
      ? dbProfile.staff_permissions
      : [],
    createdAt: new Date(dbProfile.created_at).getTime(),
  });

  const signInWithEmail = async (email: string, pass: string) => {
    if (!isSupabaseConfigured) {
      setError("Authentication is unavailable because this preview deployment is missing Supabase configuration.");
      return;
    }
    if (isSigningIn) return;
    setError(null);
    if (!isSupabaseConfigured) {
      setError("Authentication is currently unavailable. Please try again later.");
      return;
    }
    setIsSigningIn(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (signInError) {
        throw new Error(
          "Invalid login credentials. Please check your email and password, or create an account from the sign-up page.",
        );
      }
    } catch (err: any) {
      console.error("Email sign in error:", err);
      setError(err.message);
    } finally {
      setIsSigningIn(false);
    }
  };

  const signUpWithEmail = async (
    email: string,
    pass: string,
    role?: UserRole,
  ) => {
    if (!isSupabaseConfigured) {
      setError("Authentication is unavailable because this preview deployment is missing Supabase configuration.");
      return;
    }
    if (isSigningIn) return;
    setError(null);
    if (!isSupabaseConfigured) {
      setError("Authentication is currently unavailable. Please try again later.");
      return;
    }
    setIsSigningIn(true);
    try {
      // Public signup intent is deliberately constrained to two safe account
      // classes. The server still owns the actual profile role and never
      // accepts an arbitrary role supplied by the browser.
      const signupKind = role === "affiliate" ? "affiliate" : "customer";
      const { error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: { signup_kind: signupKind },
        },
      });
      if (error) {
        if (error.message.toLowerCase().includes("already registered")) {
          throw new Error(
            "This email is already registered. Please sign in instead.",
          );
        }
        throw error;
      }
    } catch (err: any) {
      console.error("Email sign up error:", err);
      setError(err.message);
    } finally {
      setIsSigningIn(false);
    }
  };

  const clearError = () => setError(null);

  const logout = async () => {
    if (!isSupabaseConfigured) return;
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const resetPassword = async (email: string) => {
    if (!isSupabaseConfigured) {
      setError("Authentication is unavailable because this preview deployment is missing Supabase configuration.");
      return;
    }
    setError(null);
    if (!isSupabaseConfigured) {
      const message = "Authentication is currently unavailable. Please try again later.";
      setError(message);
      toast.error(message);
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset email sent!");
    } catch (err: any) {
      console.error("Reset password error:", err);
      setError(err.message);
      toast.error(err.message);
    }
  };

  const updatePassword = async (password: string) => {
    if (!isSupabaseConfigured) {
      setError("Authentication is unavailable because this preview deployment is missing Supabase configuration.");
      return;
    }
    setError(null);
    if (!isSupabaseConfigured) {
      const message = "Authentication is currently unavailable. Please try again later.";
      setError(message);
      toast.error(message);
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated successfully!");
    } catch (err: any) {
      console.error("Update password error:", err);
      setError(err.message);
      toast.error(err.message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        business,
        loading,
        error,
        signInWithEmail,
        signUpWithEmail,
        logout,
        refreshProfile,
        resetPassword,
        updatePassword,
        isAuthReady,
        clearError,
        isSigningIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
