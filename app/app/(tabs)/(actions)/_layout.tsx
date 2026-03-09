import { Stack } from "expo-router";

export default function ActionsScreenLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: "black" },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[type]" options={{ headerShown: false }} />
    </Stack>
  );
}
