import { Stack } from "expo-router";

export default function SettingsScreenLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: "white" },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="edit-focus-areas"
        options={{ headerShown: false, presentation: "modal" }}
      />
    </Stack>
  );
}
