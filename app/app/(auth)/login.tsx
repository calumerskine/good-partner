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
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
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

  const brownieStaticStyle = {
    position: "absolute" as const,
    left: BROWNIE_LEFT,
    top: BROWNIE_START_TOP,
    width: BROWNIE_SIZE,
    height: BROWNIE_SIZE,
  };

  function runIdle() {
    setIsIntroComplete(true);

    // Bob: continuous sine wave ±4px around settled translateY position.
    // Two withTiming calls cover both directions; reverse: false (no auto-reverse needed).
    translateY.value = withRepeat(
      withSequence(
        withTiming(BROWNIE_Y_OFFSET - 4, {
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(BROWNIE_Y_OFFSET + 4, {
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1, // infinite
      true, // no auto-reverse (sequence handles both directions)
    );

    // Wiggle: soft shake every 4–7 seconds, rescheduled recursively
    // const scheduleWiggle = () => {
    //   const delay = Math.random() * 3000 + 4000; // 4000–7000ms
    //   wiggleTimerRef.current = setTimeout(() => {
    //     // Cancel any in-flight translateX animation before starting a new one
    //     cancelAnimation(translateX);
    //     translateX.value = withSequence(
    //       withTiming(3, { duration: 50 }),
    //       withTiming(-3, { duration: 50 }),
    //       withTiming(2, { duration: 40 }),
    //       withTiming(-2, { duration: 40 }),
    //       withTiming(0, { duration: 30 }),
    //     );
    //     scheduleWiggle();
    //   }, delay);
    // };
    // scheduleWiggle();
  }

  function runStage2() {
    // Slide brownie to top: translateY 0 → BROWNIE_Y_OFFSET (large negative = upward)
    translateY.value = withSpring(BROWNIE_Y_OFFSET, {
      mass: 1,
      stiffness: 180,
      damping: 22,
    });

    // Simultaneously scale down: 1.43 → 1.0 (eased, no bounce)
    scale.value = withTiming(1.0, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });

    // Form reveal: start 200ms into the slide, fade in over 600ms
    // Chains to runIdle when complete
    formOpacity.value = withDelay(
      200,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) }, () => {
        // formOpacity animation complete — start idle
        runOnJS(runIdle)();
      }),
    );
  }

  // Called from the spring worklet callback via runOnJS.
  // Schedules Stage 2 to fire after the shake completes (200ms total shake duration).
  function scheduleStage2() {
    stageTimerRef.current = setTimeout(runStage2, 200);
  }

  useEffect(() => {
    // Stage 1: Spawn — scale 0 → 1.43 with elastic spring
    scale.value = withSpring(
      1.43,
      { mass: 0.6, stiffness: 280, damping: 10 },
      () => {
        // Spring settled (~400ms from mount) — fire shake and schedule Stage 2.
        //
        // Note: withSequence does not propagate callbacks from inner steps reliably
        // in Reanimated v4. Instead, fire the shake (no callback needed) and
        // independently schedule Stage 2 via runOnJS + setTimeout for the shake duration.
        translateX.value = withSequence(
          withTiming(5, { duration: 35 }),
          withTiming(-5, { duration: 35 }),
          withTiming(4, { duration: 30 }),
          withTiming(-4, { duration: 30 }),
          withTiming(2, { duration: 25 }),
          withTiming(-2, { duration: 25 }),
          withTiming(0, { duration: 20 }),
        );
        // Schedule Stage 2 after shake finishes (200ms = sum of all shake withTiming durations)
        runOnJS(scheduleStage2)();
      },
    );

    // Cleanup: cancel animations and pending timers on unmount
    return () => {
      cancelAnimation(scale);
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      cancelAnimation(formOpacity);
      if (stageTimerRef.current) clearTimeout(stageTimerRef.current);
      if (wiggleTimerRef.current) clearTimeout(wiggleTimerRef.current);
    };
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
              style={tw`text-5xl text-charcoal text-center font-gabarito font-black mb-3`}
            >
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </Text>
            <Text
              style={tw`text-xl text-charcoal/80 text-center font-gabarito`}
            >
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
                      style={tw`text-raspberry text-sm mt-2 ml-4 font-gabarito`}
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
                      style={tw`text-raspberry text-sm mt-2 ml-4 font-gabarito`}
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
              style={tw`w-full p-5 bg-raspberry/10 rounded-2xl border-2 border-raspberry/30 mb-6`}
            >
              <Text
                style={tw`text-raspberry font-gabarito text-base leading-relaxed`}
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
              <Text style={tw`text-charcoal/80 font-gabarito text-base`}>
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
