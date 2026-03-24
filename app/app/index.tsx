import { useAuth } from "@/hooks/use-auth";
import { useGetUserProfile } from "@/lib/api";
import tw from "@/lib/tw";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

/**
 * Root index route that handles initial navigation based on authentication state.
 */
export default function Index() {
  const { user, isLoading } = useAuth();
  const { data: profile, isLoading: isProfileLoading } = useGetUserProfile(
    user?.id,
  );

  // Show loading spinner while checking authentication state
  if (isLoading || isProfileLoading) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white`}>
        <ActivityIndicator size="large" color="#2E3130" />
      </View>
    );
  }

  // Redirect based on authentication status
  if (!user) {
    // No authenticated user - go to login
    return <Redirect href="/(auth)/login" />;
  }

  // User is authenticated - check if they've completed onboarding
  if (!profile?.hasCompletedOnboarding) {
    return <Redirect href="/(onboard)" />;
  }

  return <Redirect href="/(tabs)/(home)" />;
}
