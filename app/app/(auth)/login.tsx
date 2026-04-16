import Button from "@/components/ui/button";
import { FormScrollView } from "@/components/ui/form-scroll-view";
import Input from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { trackEvent } from "@/lib/analytics";
import tw from "@/lib/tw";
import { FontAwesome } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Platform,
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
  const router = useRouter();
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

  const handleSocialAuth = async (provider: "google" | "apple") => {
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
      router.replace("/");
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
    <FormScrollView
      contentContainerStyle={[
        tw`bg-white flex-grow items-center justify-center px-6 pt-12`,
        ,
      ]}
    >
      {/* Form content — hidden until form reveal animation */}
      <Animated.View style={[tw`w-full max-w-md`, formAnimatedStyle]}>
        <View style={tw`mb-12 gap-4`}>
          <Text
            style={tw`text-4xl text-ink font-gabarito font-bold text-center`}
          >
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </Text>
          <Text
            style={tw`text-xl text-ink/80 font-gabarito text-center leading-relaxed`}
          >
            {mode === "login"
              ? "Sign in to continue your journey"
              : "Start building meaningful connections"}
          </Text>
        </View>

        <View style={tw`gap-4`}>
          {Platform.OS === "ios" && (
            <View
              style={isLoading ? tw`opacity-50` : undefined}
              pointerEvents={isLoading ? "none" : "auto"}
            >
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={
                  AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                }
                buttonStyle={
                  AppleAuthentication.AppleAuthenticationButtonStyle
                    .WHITE_OUTLINE
                }
                cornerRadius={18}
                style={{ height: 56 }}
                onPress={() => handleSocialAuth("apple")}
              />
            </View>
          )}
          <TouchableOpacity
            style={tw`w-full h-14 flex-row items-center justify-center border border-ink rounded-2xl gap-3`}
            onPress={() => handleSocialAuth("google")}
            disabled={isLoading}
          >
            <FontAwesome name="google" size={18} color="ink" />
            <Text style={tw`text-ink font-gabarito font-light text-[22px]`}>
              Sign up with Google
            </Text>
          </TouchableOpacity>
        </View>

        <View style={tw`flex-row items-center gap-3 w-full my-8`}>
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
                  autoComplete={mode === "login" ? "password" : "new-password"}
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

        <View style={tw`w-full gap-6 pt-0`}>
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
    </FormScrollView>
  );
}
