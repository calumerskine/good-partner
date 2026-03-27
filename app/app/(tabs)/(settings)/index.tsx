import Button from "@/components/ui/button";
import TimePickerSheet from "@/components/settings/time-picker-sheet";
import { useMountAnimation } from "@/hooks/animations";
import { useAuth } from "@/hooks/use-auth";
import { useHaptics } from "@/hooks/use-haptics";
import { useThrottle } from "@/hooks/use-throttle";
import { trackEvent } from "@/lib/analytics";
import {
  useGetActionNotificationsEnabled,
  useGetNotificationsEnabled,
  useGetReminderConfig,
  useGetUserProfile,
  useToggleActionNotificationsEnabled,
  useToggleNotificationsEnabled,
  useUpdateReminderConfig,
} from "@/lib/api";
import { env } from "@/lib/env";
import { notifeeService } from "@/lib/notifee";
import { oneSignalService } from "@/lib/onesignal";
import { ActionTypes } from "@/lib/state/actions.model";
import tw from "@/lib/tw";
import { useFocusEffect, useRouter } from "expo-router";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { useCallback, useState } from "react";
import { Animated, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

const utcTimeStrToLocalDate = (utcTimeStr: string): Date => {
  const [hours, minutes] = utcTimeStr.split(":").map(Number);
  const d = new Date();
  d.setUTCHours(hours, minutes, 0, 0);
  return toZonedTime(d, tz);
};

const formatTimeForDisplay = (utcTimeStr: string): string =>
  format(utcTimeStrToLocalDate(utcTimeStr), "h:mm a");

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { data: profile } = useGetUserProfile(user?.id);
  const { data: notificationsEnabled } = useGetNotificationsEnabled(user?.id);
  const { mutateAsync: toggleNotifications } = useToggleNotificationsEnabled();
  const { data: reminderConfig } = useGetReminderConfig(user?.id);
  const { mutateAsync: updateReminderConfig, isPending: isUpdatingReminders } =
    useUpdateReminderConfig();
  const { data: actionNotificationsEnabled } = useGetActionNotificationsEnabled(user?.id);
  const { mutateAsync: toggleActionNotifications } = useToggleActionNotificationsEnabled();
  const [activePicker, setActivePicker] = useState<
    "morning" | "evening" | null
  >(null);
  const { hapticsEnabled, loaded: hapticsLoaded, toggleHaptics } = useHaptics();

  const titleAnim = useMountAnimation({
    fromOpacity: 0,
    fromTranslateY: 10,
    duration: 280,
    delay: 0,
  });
  const userAnim = useMountAnimation({
    fromOpacity: 0,
    fromTranslateY: 10,
    duration: 280,
    delay: 80,
  });
  const focusAnim = useMountAnimation({
    fromOpacity: 0,
    fromTranslateY: 10,
    duration: 280,
    delay: 160,
  });
  const hapticsAnim = useMountAnimation({
    fromOpacity: 0,
    fromTranslateY: 10,
    duration: 280,
    delay: 240,
  });
  const remindersAnim = useMountAnimation({
    fromOpacity: 0,
    fromTranslateY: 10,
    duration: 280,
    delay: 320,
  });
  const actionNotifAnim = useMountAnimation({
    fromOpacity: 0,
    fromTranslateY: 10,
    duration: 280,
    delay: 400,
  });
  const debugAnim = useMountAnimation({
    fromOpacity: 0,
    fromTranslateY: 10,
    duration: 280,
    delay: 480,
  });

  useFocusEffect(
    useCallback(() => {
      trackEvent("screen_viewed", { screen_name: "Settings" });
      titleAnim.trigger();
      userAnim.trigger();
      focusAnim.trigger();
      hapticsAnim.trigger();
      remindersAnim.trigger();
      actionNotifAnim.trigger();
      debugAnim.trigger();
    }, []),
  );

  const handleSetNotifications = useThrottle(async () => {
    const shouldEnable = !notificationsEnabled;

    if (shouldEnable) {
      const granted = await oneSignalService.getPermission();
      if (!granted) return;
    }

    await toggleNotifications({ userId: user?.id!, enabled: shouldEnable });
    trackEvent("settings_notifications_toggled", { enabled: shouldEnable });
  }, 500);

  const handleSetActionNotifications = useThrottle(async () => {
    const shouldEnable = !actionNotificationsEnabled;

    if (shouldEnable) {
      const granted = await notifeeService.requestPermission();
      if (!granted) return;
    }

    await toggleActionNotifications({ userId: user?.id!, enabled: shouldEnable });
    trackEvent("settings_action_notifications_toggled", { enabled: shouldEnable });
  }, 500);

  if (!user) return null;

  return (
    <SafeAreaView edges={["top"]} style={tw`flex-1 bg-white`}>
      <ScrollView
        style={tw`flex-1 w-full`}
        contentContainerStyle={tw`px-6 pb-8`}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[tw`py-6 mb-0`, titleAnim.animatedStyle]}>
          <Text style={tw`text-4xl text-black font-gabarito font-black mb-2`}>
            Settings
          </Text>
        </Animated.View>

        <Animated.View style={[tw`mb-8`, userAnim.animatedStyle]}>
          {/* <Text style={tw`text-lg font-gabarito font-bold text-ink mb-3`}>
            Account
          </Text> */}

          <View style={tw`bg-white rounded-xl mb-3`}>
            <View style={tw`flex-row items-baseline justify-between mb-1`}>
              <Text style={tw`text-ink font-gabarito font-bold text-lg mb-3`}>
                User
              </Text>
              <Button
                size="sm"
                color="rose"
                onPress={() => {
                  trackEvent("auth_signout");
                  signOut();
                }}
              >
                Sign Out
              </Button>
            </View>
            <Text style={tw`text-ink/80 font-gabarito font-medium text-base`}>
              {user.email}
            </Text>
          </View>
        </Animated.View>

        <Animated.View style={[tw`mb-8`, focusAnim.animatedStyle]}>
          <View style={tw`bg-white rounded-xl mb-3`}>
            <View style={tw`flex-row items-baseline justify-between mb-3`}>
              <Text style={tw`text-ink font-gabarito font-bold text-lg`}>
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

                  return (
                    <View key={cat.id} style={tw`flex-row items-center gap-3`}>
                      <View style={tw`w-4 h-4 rounded-full bg-${color}-400`} />
                      <Text
                        style={tw`text-ink/80 font-gabarito font-medium text-base`}
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
        </Animated.View>

        <Animated.View style={[tw`mb-8`, hapticsAnim.animatedStyle]}>
          {/* <Text style={tw`text-lg font-gabarito font-bold text-ink mb-3`}>
            Preferences
          </Text> */}
          <View style={tw`bg-white rounded-xl`}>
            <View style={tw`flex-row items-center justify-between mb-3`}>
              <Text style={tw`text-ink font-gabarito font-bold text-lg`}>
                Haptics
              </Text>
              {hapticsLoaded && (
                <Switch
                  value={hapticsEnabled}
                  onValueChange={toggleHaptics}
                  trackColor={{ false: "#767577", true: "#8E97FD" }}
                />
              )}
            </View>
            <Text style={tw`font-gabarito text-sm text-ink/80 leading-relaxed`}>
              Vibration feedback on interactions.
            </Text>
          </View>
        </Animated.View>

        {env.flags.useReminders && (
          <Animated.View style={[tw`mb-8`, remindersAnim.animatedStyle]}>
            {/* <Text style={tw`text-lg font-gabarito font-bold text-ink mb-3`}>
              Notifications
            </Text> */}
            <View style={tw`bg-white rounded-xl`}>
              {/* Master toggle */}
              <View style={tw`flex-row items-center justify-between mb-3`}>
                <Text style={tw`text-ink font-gabarito font-bold text-lg`}>
                  Daily reminders
                </Text>
                <Switch
                  value={notificationsEnabled ?? false}
                  onValueChange={handleSetNotifications}
                  trackColor={{ false: "#767577", true: "#8E97FD" }}
                />
              </View>
              <Text
                style={tw`font-gabarito text-sm text-ink/80 leading-relaxed`}
              >
                Get a gentle reminder to complete your daily action and stay on
                track.
              </Text>

              {/* Per-type rows — only show when master switch is on */}
              {notificationsEnabled && reminderConfig && (
                <View style={tw`mt-4 gap-3`}>
                  {/* Morning row */}
                  <View style={tw`flex-row items-center justify-between`}>
                    <View style={tw`flex-row items-center gap-2`}>
                      <Switch
                        value={reminderConfig.morningReminderEnabled}
                        disabled={isUpdatingReminders}
                        trackColor={{ false: "#767577", true: "#8E97FD" }}
                        onValueChange={(val) =>
                          updateReminderConfig({
                            userId: user.id,
                            config: { morningReminderEnabled: val },
                          })
                        }
                      />
                      <Text style={tw`font-gabarito text-ink`}>Morning</Text>
                    </View>
                    <View style={tw`flex-row items-center gap-3`}>
                      <Text style={tw`font-gabarito text-ink/70`}>
                        {formatTimeForDisplay(
                          reminderConfig.morningReminderTime,
                        )}
                      </Text>
                      <Button
                        size="sm"
                        color="ghost"
                        onPress={() => setActivePicker("morning")}
                      >
                        Edit
                      </Button>
                    </View>
                  </View>

                  {/* Evening row */}
                  <View style={tw`flex-row items-center justify-between`}>
                    <View style={tw`flex-row items-center gap-2`}>
                      <Switch
                        value={reminderConfig.eveningReminderEnabled}
                        disabled={isUpdatingReminders}
                        trackColor={{ false: "#767577", true: "#8E97FD" }}
                        onValueChange={(val) =>
                          updateReminderConfig({
                            userId: user.id,
                            config: { eveningReminderEnabled: val },
                          })
                        }
                      />
                      <Text style={tw`font-gabarito text-ink`}>Evening</Text>
                    </View>
                    <View style={tw`flex-row items-center gap-3`}>
                      <Text style={tw`font-gabarito text-ink/70`}>
                        {formatTimeForDisplay(
                          reminderConfig.eveningReminderTime,
                        )}
                      </Text>
                      <Button
                        size="sm"
                        color="ghost"
                        onPress={() => setActivePicker("evening")}
                      >
                        Edit
                      </Button>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {env.flags.useActionNotifications && (
          <Animated.View style={[tw`mb-8`, actionNotifAnim.animatedStyle]}>
            <View style={tw`bg-white rounded-xl`}>
              <View style={tw`flex-row items-center justify-between mb-3`}>
                <Text style={tw`text-ink font-gabarito font-bold text-lg`}>
                  Action reminders
                </Text>
                <Switch
                  value={actionNotificationsEnabled ?? false}
                  onValueChange={handleSetActionNotifications}
                  trackColor={{ false: "#767577", true: "#8E97FD" }}
                />
              </View>
              <Text style={tw`font-gabarito text-sm text-ink/80 leading-relaxed`}>
                Get a notification while your action is in progress to help you remember to complete it.
              </Text>
            </View>
          </Animated.View>
        )}

        {__DEV__ && (
          <Animated.View style={[tw`mt-8`, debugAnim.animatedStyle]}>
            <Text style={tw`text-lg font-gabarito font-bold text-ink mb-3`}>
              Debug Info
            </Text>

            <View style={tw`bg-white rounded-2xl p-4 mb-3`}>
              <Text style={tw`text-ink font-gabarito font-bold text-sm mb-2`}>
                Database
              </Text>
              <Text style={tw`text-ink font-mono text-xs`}>
                {env.supabase.url.includes("localhost")
                  ? "Local"
                  : "Production"}
              </Text>
            </View>

            <View style={tw`bg-white rounded-2xl p-4 mb-3`}>
              <Text style={tw`text-ink font-gabarito font-bold text-sm mb-2`}>
                Reminders
              </Text>
              <Text style={tw`text-ink font-mono text-xs`}>
                OneSignal status:{" "}
                {oneSignalService.hasInitialised ? "Enabled" : "Disabled"}
              </Text>
            </View>

            <View style={tw`bg-white rounded-2xl p-4 mb-3`}>
              <Text style={tw`text-ink font-gabarito font-bold text-sm mb-2`}>
                User
              </Text>
              <Text style={tw`text-ink font-mono text-xs`}>
                {JSON.stringify(user, null, 2)}
              </Text>
            </View>

            <View style={tw`bg-white rounded-2xl p-4`}>
              <Text style={tw`text-ink font-gabarito font-bold text-sm mb-2`}>
                Profile
              </Text>
              <Text style={tw`text-ink font-mono text-xs`}>
                {JSON.stringify(profile, null, 2)}
              </Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>
      {activePicker && reminderConfig && (
        <TimePickerSheet
          type={activePicker}
          currentUtcTime={
            activePicker === "morning"
              ? reminderConfig.morningReminderTime
              : reminderConfig.eveningReminderTime
          }
          onSave={(utcTimeStr) =>
            updateReminderConfig({
              userId: user.id,
              config:
                activePicker === "morning"
                  ? { morningReminderTime: utcTimeStr }
                  : { eveningReminderTime: utcTimeStr },
            })
          }
          onClose={() => setActivePicker(null)}
        />
      )}
    </SafeAreaView>
  );
}
