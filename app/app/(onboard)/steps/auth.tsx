import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import tw from "@/lib/tw";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";

type FormValues = {
  email: string;
  password: string;
};

type Props = {
  onSignup: (email: string, password: string) => Promise<void>;
};

export function AuthStep({ onSignup }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async ({ email, password }: FormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      await onSignup(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={tw`flex-1`}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`flex-grow px-6 justify-center pb-4`}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={tw`mb-10`}>
          <Text
            style={tw`text-4xl text-charcoal font-gabarito font-black mb-3 leading-tight`}
          >
            You're all set.{"\n"}Create your account to save your progress.
          </Text>
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
                  <Text style={tw`text-red-600 text-sm mt-2 ml-4 font-gabarito`}>
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
                  <Text style={tw`text-red-600 text-sm mt-2 ml-4 font-gabarito`}>
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
            <Text style={tw`text-red-600 font-gabarito text-base leading-relaxed`}>
              {error}
            </Text>
          </View>
        )}

        <Button disabled={isLoading} onPress={handleSubmit(onSubmit)}>
          {isLoading ? "Creating account..." : "Let's go →"}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
