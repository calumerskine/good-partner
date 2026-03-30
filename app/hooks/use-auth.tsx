import { initialiseAnalytics } from "@/lib/analytics";
import { env } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { Session, User } from "@supabase/supabase-js";
import * as AppleAuthentication from "expo-apple-authentication";
import React, { createContext, useContext, useEffect, useState } from "react";

GoogleSignin.configure({
  webClientId: env.google.webClientId,
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
      if (!idToken) throw new Error("No ID token returned from Google");

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });
      if (error) throw error;
      if (!data.user) throw new Error("No user returned from Supabase");
      return data.user;
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return null;
      throw error;
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
        throw new Error("No identity token from Apple");
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
      });
      if (error) throw error;
      if (!data.user) throw new Error("No user returned from Supabase");
      return data.user;
    } catch (error: any) {
      if (error.code === "ERR_REQUEST_CANCELED") return null;
      throw error;
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
