import { Stack } from "expo-router";

export default function HomeScreenLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: "white" },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
