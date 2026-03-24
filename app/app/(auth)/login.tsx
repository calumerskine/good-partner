import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { trackEvent } from "@/lib/analytics";
import tw from "@/lib/tw";
import { Redirect } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const brownieAsset = require("@/assets/images/brownie.webp");

type AuthMode = "login" | "signup";

export default function LoginScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const BROWNIE_SIZE = 120;
  const BROWNIE_TOP_OFFSET = 24;

  const BROWNIE_LEFT = (screenWidth - BROWNIE_SIZE) / 2;
  const BROWNIE_START_TOP = (screenHeight - BROWNIE_SIZE) / 2;
  const BROWNIE_END_TOP = insets.top + BROWNIE_TOP_OFFSET;
  // translateY = 0 means brownie at center; BROWNIE_Y_OFFSET means brownie at top
  const BROWNIE_Y_OFFSET = BROWNIE_END_TOP - BROWNIE_START_TOP; // large negative number
  // Padding for form so content sits below settled brownie (BROWNIE_END_TOP already includes insets.top)
  const FORM_PADDING_TOP = BROWNIE_END_TOP + BROWNIE_SIZE + 16;

  const [isIntroComplete, setIsIntroComplete] = useState(false);
  const stageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wiggleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scale = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const formOpacity = useSharedValue(0);

  const brownieAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

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
    <View style={tw`flex-1 bg-white`}>
      {/* Form content — hidden until form reveal animation */}
      <SafeAreaView style={tw`flex-1 justify-start items-center px-6`}>
        <Animated.View
          style={[
            tw`w-full max-w-md`,
            { paddingTop: FORM_PADDING_TOP },
            formAnimatedStyle,
          ]}
        >
          <View style={tw`mb-12`}>
            <Text
              style={tw`text-5xl text-ink text-center font-gabarito font-black mb-3`}
            >
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </Text>
            <Text style={tw`text-xl text-ink/80 text-center font-gabarito`}>
              {mode === "login"
                ? "Sign in to continue your journey"
                : "Start building meaningful connections"}
            </Text>
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
                <Text style={tw`text-grape font-gabarito font-bold text-base`}>
                  {mode === "login" ? "Sign Up" : "Sign In"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}
