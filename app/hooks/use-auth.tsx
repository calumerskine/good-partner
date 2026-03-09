import { initialiseAnalytics } from "@/lib/analytics";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useState } from "react";

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
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  signOut: async () => {},
  lastEvent: null,
  signUpWithEmail: async () => null as unknown as User,
  signInWithEmail: async () => null as unknown as User,
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

        // Always set loading to false after checking, even if no session
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

    // Listen for auth changes
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

      // Loading should be false after any auth event
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
