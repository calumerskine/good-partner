import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { trackEvent } from "@/lib/analytics";
import tw from "@/lib/tw";
import { FontAwesome } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Platform, Text, TouchableOpacity, View } from "react-native";

type FormValues = {
  email: string;
  password: string;
};

type Props = {
  onComplete: (userId: string) => Promise<void>;
};

export function AuthStep({ onComplete }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signUpWithEmail, signInWithGoogle, signInWithApple } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { email: "", password: "" },
  });

  const handleSocialAuth = async (provider: "google" | "apple") => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    trackEvent("auth_signup_initiated", { provider });
    try {
      const user =
        provider === "google"
          ? await signInWithGoogle()
          : await signInWithApple();
      if (!user) return; // user cancelled
      trackEvent("auth_signup_succeeded", { provider });
      await onComplete(user.id);
    } catch (err) {
      trackEvent("auth_signup_failed", {
        provider,
        error: err instanceof Error ? err.message : "unknown",
      });
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async ({ email, password }: FormValues) => {
    setIsLoading(true);
    setError(null);
    trackEvent("auth_signup_initiated", { provider: "email" });
    try {
      const user = await signUpWithEmail(email, password);
      if (!user) {
        throw new Error(
          "Please check your email to confirm your account, then sign in.",
        );
      }
      trackEvent("auth_signup_succeeded", { provider: "email" });
      await onComplete(user.id);
    } catch (err) {
      trackEvent("auth_signup_failed", {
        provider: "email",
        error: err instanceof Error ? err.message : "unknown",
      });
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={tw`flex-1 px-6 pt-3`}>
      <View style={tw`gap-4 mb-12`}>
        <Text style={tw`text-4xl text-ink font-gabarito font-bold text-center`}>
          You're all set.
        </Text>
        <Text
          style={tw`text-xl text-ink/80 font-gabarito text-center leading-relaxed`}
        >
          Create your account to save your progress.
        </Text>
      </View>
      <View style={tw`flex-1 justify-center pb-4`}>
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
        <View style={tw`flex-row items-center gap-3 my-8`}>
          <View style={tw`flex-1 h-px bg-ink/10`} />
          <Text style={tw`text-ink/40 font-gabarito text-sm`}>or</Text>
          <View style={tw`flex-1 h-px bg-ink/10`} />
        </View>
        <View style={tw`gap-5 mb-6`}>
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
              <View>
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
              <View>
                <Input
                  name="password"
                  placeholder="Password"
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
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
            style={tw`p-5 bg-red-600/10 rounded-2xl border-2 border-red-600/30 mb-6`}
          >
            <Text
              style={tw`text-red-600 font-gabarito text-base leading-relaxed`}
            >
              {error}
            </Text>
          </View>
        )}
      </View>
      <View style={tw`w-full pt-6 pb-2`}>
        <Button disabled={isLoading} onPress={handleSubmit(onSubmit)}>
          {isLoading ? "Creating account..." : "Continue with email"}
        </Button>
      </View>
    </View>
  );
}
