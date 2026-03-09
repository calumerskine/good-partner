import { Stack } from "expo-router";

export default function AuthScreenLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "black" },
      }}
    >
      <Stack.Screen name="login" />
    </Stack>
  );
}
