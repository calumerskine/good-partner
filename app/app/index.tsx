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

  if (isLoading || (user && isProfileLoading)) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white`}>
        <ActivityIndicator size="large" color="#2E3130" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(onboard)" />;
  }

  if (!profile?.hasCompletedOnboarding) {
    return <Redirect href="/(onboard)" />;
  }

  return <Redirect href="/(tabs)/(home)" />;
}
