import { Stack } from "expo-router";

export default function ActionScreenLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "black" },
      }}
    >
      <Stack.Screen name="[id]" />
      <Stack.Screen name="[id]/success" />
      <Stack.Screen name="[id]/reminders" />
    </Stack>
  );
}
