import Button from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useHaptics } from "@/hooks/use-haptics";
import { useThrottle } from "@/hooks/use-throttle";
import { trackEvent } from "@/lib/analytics";
import {
  useGetNotificationsEnabled,
  useGetReminderConfig,
  useGetUserProfile,
  useToggleNotificationsEnabled,
  useUpdateReminderConfig,
} from "@/lib/api";
import { env } from "@/lib/env";
import { oneSignalService } from "@/lib/onesignal";
import { ActionTypes } from "@/lib/state/actions.model";
import tw from "@/lib/tw";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect, useRouter } from "expo-router";
import { format } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { useCallback, useState } from "react";
import { ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

// Convert a 'HH:MM' UTC time string into a local Date (today)
const utcTimeStrToLocalDate = (utcTimeStr: string): Date => {
  const [hours, minutes] = utcTimeStr.split(":").map(Number);
  const d = new Date();
  d.setUTCHours(hours, minutes, 0, 0);
  return toZonedTime(d, tz);
};

// Convert a local Date back to a 'HH:MM' UTC string
const localDateToUtcTimeStr = (date: Date): string => {
  const utc = fromZonedTime(date, tz);
  const h = utc.getUTCHours().toString().padStart(2, "0");
  const m = utc.getUTCMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
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
  const { mutateAsync: updateReminderConfig, isPending: isUpdatingReminders } = useUpdateReminderConfig();
  const [showMorningPicker, setShowMorningPicker] = useState(false);
  const [showEveningPicker, setShowEveningPicker] = useState(false);
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
    <SafeAreaView edges={["top"]} style={tw`flex-1 bg-white`}>
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
                        style={tw`w-4 h-4 rounded-full bg-${color}-300 border border-${color}-800`}
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
            <Text style={tw`text-lg font-gabarito font-bold text-charcoal mb-3`}>
              Notifications
            </Text>
            <View style={tw`bg-white border-2 rounded-xl p-5`}>
              {/* Master toggle */}
              <View style={tw`flex-row items-center justify-between mb-3`}>
                <Text style={tw`text-charcoal font-gabarito font-bold text-lg`}>
                  Daily reminders
                </Text>
                <Switch
                  value={notificationsEnabled ?? false}
                  onValueChange={handleSetNotifications}
                />
              </View>
              <Text style={tw`font-gabarito text-sm text-charcoal/80 leading-relaxed`}>
                Get a gentle reminder to complete your daily action and stay on track.
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
                        onValueChange={(val) =>
                          updateReminderConfig({
                            userId: user.id,
                            config: { morningReminderEnabled: val },
                          })
                        }
                      />
                      <Text style={tw`font-gabarito text-charcoal`}>Morning</Text>
                    </View>
                    <View style={tw`flex-row items-center gap-3`}>
                      <Text style={tw`font-gabarito text-charcoal/70`}>
                        {formatTimeForDisplay(reminderConfig.morningReminderTime)}
                      </Text>
                      <Button
                        size="sm"
                        color="ghost"
                        onPress={() => setShowMorningPicker(true)}
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
                        onValueChange={(val) =>
                          updateReminderConfig({
                            userId: user.id,
                            config: { eveningReminderEnabled: val },
                          })
                        }
                      />
                      <Text style={tw`font-gabarito text-charcoal`}>Evening</Text>
                    </View>
                    <View style={tw`flex-row items-center gap-3`}>
                      <Text style={tw`font-gabarito text-charcoal/70`}>
                        {formatTimeForDisplay(reminderConfig.eveningReminderTime)}
                      </Text>
                      <Button
                        size="sm"
                        color="ghost"
                        onPress={() => setShowEveningPicker(true)}
                      >
                        Edit
                      </Button>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Time pickers — rendered outside the card to avoid layout issues */}
            {showMorningPicker && reminderConfig && (
              <DateTimePicker
                value={utcTimeStrToLocalDate(reminderConfig.morningReminderTime)}
                mode="time"
                onChange={(event, date) => {
                  if (event.type === "dismissed" || event.type === "set") {
                    setShowMorningPicker(false);
                  }
                  if (event.type === "set" && date) {
                    updateReminderConfig({
                      userId: user.id,
                      config: { morningReminderTime: localDateToUtcTimeStr(date) },
                    });
                  }
                }}
              />
            )}
            {showEveningPicker && reminderConfig && (
              <DateTimePicker
                value={utcTimeStrToLocalDate(reminderConfig.eveningReminderTime)}
                mode="time"
                onChange={(event, date) => {
                  if (event.type === "dismissed" || event.type === "set") {
                    setShowEveningPicker(false);
                  }
                  if (event.type === "set" && date) {
                    updateReminderConfig({
                      userId: user.id,
                      config: { eveningReminderTime: localDateToUtcTimeStr(date) },
                    });
                  }
                }}
              />
            )}
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
                color="gray"
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
