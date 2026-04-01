import Button from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { trackEvent } from "@/lib/analytics";
import {
  useToggleActionNotificationsEnabled,
  useToggleNotificationsEnabled,
  useUpdateReminderConfig,
} from "@/lib/api";
import { env } from "@/lib/env";
import { notifeeService } from "@/lib/notifee";
import { oneSignalService } from "@/lib/onesignal";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RemindersPromptScreen() {
  const { user } = useAuth();
  const { mutateAsync: toggleNotifications } = useToggleNotificationsEnabled();
  const { mutateAsync: toggleActionNotifications } =
    useToggleActionNotificationsEnabled();
  const { mutateAsync: updateReminderConfig } = useUpdateReminderConfig();

  useEffect(() => {
    trackEvent("screen_viewed", { screen_name: "Reminders Prompt" });
    trackEvent("reminders_prompt_shown");
  }, []);

  const handleEnable = async () => {
    if (!user) return;

    try {
      const granted = await oneSignalService.getPermission();
      if (granted) {
        await toggleNotifications({ userId: user.id, enabled: true });
        await updateReminderConfig({
          userId: user.id,
          config: { morningReminderEnabled: true, eveningReminderEnabled: true },
        });
        if (env.flags.useActionNotifications) {
          await notifeeService.requestPermission();
          await toggleActionNotifications({ userId: user.id, enabled: true });
        }
      }
      trackEvent("reminders_prompt_responded", { value: "enabled" });
    } catch (error) {
      console.error("Error enabling reminders:", error);
    }
    router.replace("/(tabs)/(home)");
  };

  const handleDismiss = () => {
    trackEvent("reminders_prompt_responded", { value: "dismissed" });
    router.replace("/(tabs)/(home)");
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <View style={tw`flex-1 items-center justify-between px-6`}>
        <View style={tw`flex-1`} />

        <View style={tw`items-center gap-6 px-4`}>
          <View
            style={tw`w-32 h-32 rounded-full bg-mint/20 items-center justify-center mb-4`}
          >
            <Text style={tw`text-7xl`}>🔔</Text>
          </View>
          <Text
            style={tw`text-charcoal font-gabarito font-black text-4xl text-center mb-4`}
          >
            Stay on track with reminders
          </Text>
          <Text
            style={tw`text-charcoal/70 font-gabarito text-xl text-center mb-8 px-4`}
          >
            A daily reminder can help you build consistency and follow through
            on your actions.
          </Text>
        </View>

        <View style={tw`flex-1`} />

        <View style={tw`w-full pb-6 gap-3`}>
          <Button onPress={handleEnable} color="green">
            Enable Reminders
          </Button>
          <Button onPress={handleDismiss} color="ghost" size="sm">
            <Text style={tw`text-charcoal`}>Not Now</Text>
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
