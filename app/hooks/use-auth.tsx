import { initialiseAnalytics } from "@/lib/analytics";
import { env } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { Session, User } from "@supabase/supabase-js";
import * as AppleAuthentication from "expo-apple-authentication";
import React, { createContext, useContext, useEffect, useState } from "react";

GoogleSignin.configure({
  // webClientId: env.google.webClientId,
  iosClientId: env.google.iosClientId,
});

type AuthEvent =
  | "INITIAL_SESSION"
  | "SIGNED_IN"
  | "SIGNED_OUT"
  | "TOKEN_REFRESHED"
  | "USER_UPDATED"
  | "PASSWORD_RECOVERY";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  lastEvent: AuthEvent | null;
  signUpWithEmail: (email: string, password: string) => Promise<User | null>;
  signInWithEmail: (email: string, password: string) => Promise<User>;
  signInWithGoogle: () => Promise<User | null>;
  signInWithApple: () => Promise<User | null>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  signOut: async () => {},
  lastEvent: null,
  signUpWithEmail: async () => null as unknown as User,
  signInWithEmail: async () => null as unknown as User,
  signInWithGoogle: async () => null,
  signInWithApple: async () => null,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastEvent, setLastEvent] = useState<AuthEvent | null>(null);

  async function identifyAuthUser(userId: string) {
    const { data } = await supabase
      .from("user_profiles")
      .select("user_tier")
      .eq("user_id", userId)
      .single();

    initialiseAnalytics(userId, data?.user_tier ?? "free");
  }

  useEffect(() => {
    let mounted = true;

    async function initialise() {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(currentSession);
        if (currentSession?.user.id) {
          identifyAuthUser(currentSession.user.id);
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Error getting session:", error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initialise();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      setLastEvent(event as AuthEvent);

      if (event === "SIGNED_OUT") {
        setSession(null);
      } else if (newSession) {
        setSession(newSession);
        identifyAuthUser(newSession.user.id);
      }

      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUpWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return data.user;
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return data.user;
  };

  const signInWithGoogle = async (): Promise<User | null> => {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      if (!idToken) throw new Error("Google sign-in failed. Please try again.");

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });
      if (error) {
        console.error("Google sign-in Supabase error:", error);
        throw new Error(error.message ?? "Sign-in failed. Please try again.");
      }
      if (!data.user) throw new Error("Sign-in failed. Please try again.");
      return data.user;
    } catch (error: unknown) {
      console.error("Google sign-in error:", error);
      const err = error as Error & { code?: string };
      if (err.code === statusCodes.SIGN_IN_CANCELLED) return null;
      if (err.code === statusCodes.IN_PROGRESS)
        throw new Error("Sign-in is already in progress. Please wait.");
      if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE)
        throw new Error(
          "Google Play Services are not available on this device.",
        );
      if (err.message && !err.code) throw err;
      throw new Error(
        "Something went wrong with Google sign-in. Please try again.",
      );
    }
  };

  const signInWithApple = async (): Promise<User | null> => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        throw new Error("Apple sign-in failed. Please try again.");
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
      });
      if (error) {
        console.error("Apple sign-in Supabase error:", error);
        throw new Error(error.message ?? "Sign-in failed. Please try again.");
      }
      if (!data.user) throw new Error("Sign-in failed. Please try again.");
      return data.user;
    } catch (error: unknown) {
      console.error("Apple sign-in error:", error);
      const err = error as Error & { code?: string };
      if (err.code === "ERR_REQUEST_CANCELED") return null;
      if (err.message && !err.code) throw err;
      throw new Error(
        "Something went wrong with Apple sign-in. Please try again.",
      );
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const user = session?.user ?? null;

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        isLoading,
        signOut,
        lastEvent,
        signUpWithEmail,
        signInWithEmail,
        signInWithGoogle,
        signInWithApple,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
