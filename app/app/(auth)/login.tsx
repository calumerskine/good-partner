import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { trackEvent } from "@/lib/analytics";
import tw from "@/lib/tw";
import { FontAwesome } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const brownieAsset = require("@/assets/images/brownie.webp");

type AuthMode = "login" | "signup";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();

  const formOpacity = useSharedValue(0);

  const formAnimatedStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
  }));

  useEffect(() => {
    formOpacity.value = withDelay(
      200,
      withTiming(
        1,
        { duration: 600, easing: Easing.out(Easing.quad) },
        () => {},
      ),
    );
  }, []);

  const [mode, setMode] = useState<AuthMode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    user,
    isLoading: authLoading,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signInWithApple,
  } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Clear error when switching modes
  useEffect(() => {
    setError(null);
  }, [mode]);

  const onSubmit = async (data: { email: string; password: string }) => {
    setIsLoading(true);
    setError(null);
    const eventPrefix = mode === "signup" ? "auth_signup" : "auth_login";
    trackEvent(`${eventPrefix}_initiated`);
    try {
      if (mode === "signup") {
        await signUpWithEmail(data.email, data.password);
      } else {
        await signInWithEmail(data.email, data.password);
      }
      trackEvent(`${eventPrefix}_succeeded`);
    } catch (error) {
      trackEvent(`${eventPrefix}_failed`, {
        error: error instanceof Error ? error.message : "unknown",
      });
      setError(
        error instanceof Error ? error.message : "An unknown error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === "login" ? "signup" : "login"));
  };

  const handleSocialSignIn = async (provider: "google" | "apple") => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    const eventPrefix = mode === "signup" ? "auth_signup" : "auth_login";
    trackEvent(`${eventPrefix}_initiated`);
    try {
      const user =
        provider === "google"
          ? await signInWithGoogle()
          : await signInWithApple();
      if (!user) return; // user cancelled
      trackEvent(`${eventPrefix}_succeeded`);
    } catch (err) {
      trackEvent(`${eventPrefix}_failed`, {
        error: err instanceof Error ? err.message : "unknown",
      });
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // If user is already authenticated, redirect to root which will handle the navigation
  if (user && !authLoading) {
    return <Redirect href="/" />;
  }

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white`}>
        <ActivityIndicator size="large" color="#2E3130" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={tw`flex-1 bg-white`}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Form content — hidden until form reveal animation */}
      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={[
          tw`flex-grow items-center justify-center px-6`,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[tw`w-full max-w-md`, formAnimatedStyle]}>
          <View style={tw`mb-12`}>
            <Text
              style={tw`text-4xl text-ink text-center font-gabarito font-black mb-3`}
            >
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </Text>
            <Text style={tw`text-xl text-ink/80 text-center font-gabarito`}>
              {mode === "login"
                ? "Sign in to continue your journey"
                : "Start building meaningful connections"}
            </Text>
          </View>

          <View style={tw`w-full gap-4 mb-6`}>
            {Platform.OS === "ios" && (
              <View
                style={isLoading ? tw`opacity-50` : undefined}
                pointerEvents={isLoading ? "none" : "auto"}
              >
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={
                    mode === "signup"
                      ? AppleAuthentication.AppleAuthenticationButtonType
                          .SIGN_UP
                      : AppleAuthentication.AppleAuthenticationButtonType
                          .SIGN_IN
                  }
                  buttonStyle={
                    AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                  }
                  cornerRadius={100}
                  style={{ height: 56 }}
                  onPress={() => handleSocialSignIn("apple")}
                />
              </View>
            )}
            <TouchableOpacity
              style={tw`w-full h-14 flex-row items-center justify-center border-2 border-ink/15 rounded-full gap-1.5`}
              onPress={() => handleSocialSignIn("google")}
              disabled={isLoading}
            >
              <FontAwesome name="google" size={16} color={tw.color("ink")} />
              <Text style={tw`text-ink font-gabarito font-bold text-xl`}>
                {mode === "signup"
                  ? "Sign up with Google"
                  : "Sign in with Google"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={tw`flex-row items-center gap-3 w-full mb-6`}>
            <View style={tw`flex-1 h-px bg-ink/10`} />
            <Text style={tw`text-ink/40 font-gabarito text-sm`}>or</Text>
            <View style={tw`flex-1 h-px bg-ink/10`} />
          </View>

          <View style={tw`w-full gap-5 mb-6`}>
            <Controller
              control={control}
              rules={{
                required: "Email is required",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Invalid email address",
                },
              }}
              render={({ field: { onChange, value } }) => (
                <View style={tw`w-full`}>
                  <Input
                    name="email"
                    placeholder="Email address"
                    value={value}
                    onChangeText={onChange}
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                  />
                  {errors.email && (
                    <Text
                      style={tw`text-red-600 text-sm mt-2 ml-4 font-gabarito`}
                    >
                      {errors.email.message}
                    </Text>
                  )}
                </View>
              )}
              name="email"
            />

            <Controller
              control={control}
              rules={{
                required: "Password is required",
                minLength: {
                  value: 6,
                  message: "Password must be at least 6 characters",
                },
              }}
              render={({ field: { onChange, value } }) => (
                <View style={tw`w-full`}>
                  <Input
                    name="password"
                    placeholder="Password"
                    value={value}
                    onChangeText={onChange}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete={
                      mode === "login" ? "password" : "new-password"
                    }
                  />
                  {errors.password && (
                    <Text
                      style={tw`text-red-600 text-sm mt-2 ml-4 font-gabarito`}
                    >
                      {errors.password.message}
                    </Text>
                  )}
                </View>
              )}
              name="password"
            />
          </View>

          {error && (
            <View
              style={tw`w-full p-5 bg-red-600/10 rounded-2xl border-2 border-red-600/30 mb-6`}
            >
              <Text
                style={tw`text-red-600 font-gabarito text-base leading-relaxed`}
              >
                {error}
              </Text>
            </View>
          )}

          <View style={tw`w-full gap-6`}>
            <Button disabled={isLoading} onPress={handleSubmit(onSubmit)}>
              {isLoading
                ? "Loading..."
                : mode === "login"
                  ? "Sign In"
                  : "Sign Up"}
            </Button>

            <View style={tw`flex-row items-center justify-center gap-2`}>
              <Text style={tw`text-ink/80 font-gabarito text-base`}>
                {mode === "login"
                  ? "Don't have an account?"
                  : "Already have an account?"}
              </Text>
              <TouchableOpacity onPress={toggleMode} disabled={isLoading}>
                <Text
                  style={tw`text-indigo-400 font-gabarito font-bold text-base`}
                >
                  {mode === "login" ? "Sign Up" : "Sign In"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
