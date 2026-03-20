import Button from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useHaptics } from "@/hooks/use-haptics";
import { useThrottle } from "@/hooks/use-throttle";
import { trackEvent } from "@/lib/analytics";
import {
  useGetNotificationsEnabled,
  useGetUserProfile,
  useToggleNotificationsEnabled,
} from "@/lib/api";
import { env } from "@/lib/env";
import { oneSignalService } from "@/lib/onesignal";
import { ActionTypes } from "@/lib/state/actions.model";
import tw from "@/lib/tw";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { data: profile } = useGetUserProfile(user?.id);
  const { data: notificationsEnabled } = useGetNotificationsEnabled(user?.id);
  const { mutateAsync: toggleNotifications } = useToggleNotificationsEnabled();
  const { hapticsEnabled, loaded: hapticsLoaded, toggleHaptics } = useHaptics();

  useFocusEffect(
    useCallback(() => {
      trackEvent("screen_viewed", { screen_name: "Settings" });
    }, []),
  );

  if (!user) return null;

  const handleSetNotifications = useThrottle(async () => {
    const shouldEnable = !notificationsEnabled;

    if (shouldEnable) {
      const granted = await oneSignalService.getPermission();
      if (!granted) return;
    }

    await toggleNotifications({ userId: user.id, enabled: shouldEnable });
    trackEvent("settings_notifications_toggled", { enabled: shouldEnable });
  }, 500);

  return (
    <SafeAreaView edges={["top"]} style={tw`flex-1 bg-amber-400`}>
      <ScrollView
        style={tw`flex-1 w-full`}
        contentContainerStyle={tw`px-6 pb-8`}
        showsVerticalScrollIndicator={false}
      >
        <View style={tw`py-6 mb-3`}>
          <Text style={tw`text-4xl text-black font-gabarito font-black mb-2`}>
            Settings
          </Text>
        </View>

        <View style={tw`mb-6`}>
          <View style={tw`bg-white border-2 rounded-xl p-5 mb-3`}>
            <View style={tw`flex-row items-baseline justify-between mb-3`}>
              <Text style={tw`text-charcoal font-gabarito font-bold text-lg`}>
                Your focus areas
              </Text>
              <Button
                size="sm"
                color="indigo"
                onPress={() =>
                  router.push("/(tabs)/(settings)/edit-focus-areas")
                }
              >
                Edit
              </Button>
            </View>
            {profile?.categories && profile.categories.length > 0 ? (
              <View style={tw`gap-3`}>
                {profile.categories.map((cat) => {
                  const categoryKey = cat.name as keyof typeof ActionTypes;
                  const categoryData = ActionTypes[categoryKey];
                  const color = categoryData?.color || "white";
                  const border = categoryData?.darkColor;

                  return (
                    <View key={cat.id} style={tw`flex-row items-center gap-3`}>
                      <View
                        style={tw`w-3 h-3 rounded-full bg-${color} border border-${border}`}
                      />
                      <Text
                        style={tw`text-charcoal/80 font-gabarito font-medium text-base`}
                      >
                        {categoryData?.title || cat.name}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={tw`text-white/50 font-gabarito text-base`}>
                No categories selected
              </Text>
            )}
          </View>
        </View>

        <View style={tw`mb-6`}>
          <Text style={tw`text-lg font-gabarito font-bold text-charcoal mb-3`}>
            Preferences
          </Text>
          <View style={tw`bg-white border-2 rounded-xl p-5`}>
            <View style={tw`flex-row items-center justify-between mb-3`}>
              <Text style={tw`text-charcoal font-gabarito font-bold text-lg`}>
                Haptics
              </Text>
              {hapticsLoaded && (
                <Switch value={hapticsEnabled} onValueChange={toggleHaptics} />
              )}
            </View>
            <Text
              style={tw`font-gabarito text-sm text-charcoal/80 leading-relaxed`}
            >
              Vibration feedback on interactions.
            </Text>
          </View>
        </View>

        {env.flags.useReminders && (
          <View style={tw`mb-6`}>
            <Text
              style={tw`text-lg font-gabarito font-bold text-charcoal mb-3`}
            >
              Notifications
            </Text>
            <View style={tw`bg-white border-2 rounded-xl p-5`}>
              <View style={tw`flex-row items-center justify-between mb-3`}>
                <Text style={tw`text-charcoal font-gabarito font-bold text-lg`}>
                  Daily reminders
                </Text>
                <Switch
                  value={notificationsEnabled ?? false}
                  onValueChange={handleSetNotifications}
                />
              </View>
              <Text
                style={tw`font-gabarito text-sm text-charcoal/80 leading-relaxed`}
              >
                Get a gentle reminder to complete your daily action and stay on
                track.
              </Text>
            </View>
          </View>
        )}

        <View style={tw`mb-6`}>
          <Text style={tw`text-lg font-gabarito font-bold text-charcoal mb-3`}>
            Account
          </Text>

          <View style={tw`bg-white border-2 rounded-xl p-5 mb-3`}>
            <View style={tw`flex-row items-baseline justify-between mb-1`}>
              <Text
                style={tw`text-charcoal font-gabarito font-bold text-lg mb-3`}
              >
                User
              </Text>
              <Button
                size="sm"
                color="pink"
                onPress={() => {
                  trackEvent("auth_signout");
                  signOut();
                }}
              >
                Sign Out
              </Button>
            </View>
            <Text
              style={tw`text-charcoal/80 font-gabarito font-medium text-base`}
            >
              {user.email}
            </Text>
          </View>
        </View>

        {__DEV__ && (
          <View style={tw`mt-8`}>
            <Text
              style={tw`text-lg font-gabarito font-bold text-charcoal mb-3`}
            >
              Debug Info
            </Text>

            <View style={tw`bg-white border-2 rounded-2xl p-4 mb-3`}>
              <Text
                style={tw`text-charcoal font-gabarito font-bold text-sm mb-2`}
              >
                Database
              </Text>
              <Text style={tw`text-charcoal font-mono text-xs`}>
                {env.supabase.url.includes("localhost")
                  ? "Local"
                  : "Production"}
              </Text>
            </View>

            <View style={tw`bg-white border-2 rounded-2xl p-4 mb-3`}>
              <Text
                style={tw`text-charcoal font-gabarito font-bold text-sm mb-2`}
              >
                Reminders
              </Text>
              <Text style={tw`text-charcoal font-mono text-xs`}>
                OneSignal status:{" "}
                {oneSignalService.hasInitialised ? "Enabled" : "Disabled"}
              </Text>
            </View>

            <View style={tw`bg-white border-2 rounded-2xl p-4 mb-3`}>
              <Text
                style={tw`text-charcoal font-gabarito font-bold text-sm mb-2`}
              >
                User
              </Text>
              <Text style={tw`text-charcoal font-mono text-xs`}>
                {JSON.stringify(user, null, 2)}
              </Text>
            </View>

            <View style={tw`bg-white border-2 rounded-2xl p-4`}>
              <Text
                style={tw`text-charcoal font-gabarito font-bold text-sm mb-2`}
              >
                Profile
              </Text>
              <Text style={tw`text-charcoal font-mono text-xs`}>
                {JSON.stringify(profile, null, 2)}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
