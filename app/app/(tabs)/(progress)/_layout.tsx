import { Stack } from "expo-router";

export default function ProgressScreenLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: "black" },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
