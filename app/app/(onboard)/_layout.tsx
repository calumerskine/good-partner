import { useAuth } from "@/hooks/use-auth";
import { Redirect, Stack } from "expo-router";

export default function OnboardScreenLayout() {
  const { user, isLoading } = useAuth();

  // Don't show anything while loading to prevent flash
  if (isLoading) {
    return null;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "white" },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="areas" />
    </Stack>
  );
}
