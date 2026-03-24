import { useAuth } from "@/hooks/use-auth";
import {
  useClearActionReminder,
  useGetReminderConfig,
  useSetActionReminder,
} from "@/lib/api";
import tw from "@/lib/tw";
import DateTimePicker from "@react-native-community/datetimepicker";
import { addDays, format, isBefore } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

interface ActionReminderSheetProps {
  userActionId: string;
  currentReminderAt: Date | null;
  onClose: () => void;
}

// Convert a 'HH:MM' UTC time string to a local Date on a given day offset.
// Sets UTC hours directly on a Date to avoid double-offset bug.
function utcTimeToLocalDate(utcTimeStr: string, dayOffset = 0): Date {
  const [hours, minutes] = utcTimeStr.split(":").map(Number);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const d = addDays(new Date(), dayOffset);
  d.setUTCHours(hours, minutes, 0, 0);
  return toZonedTime(d, tz);
}

export default function ActionReminderSheet({
  userActionId,
  currentReminderAt,
  onClose,
}: ActionReminderSheetProps) {
  const { user } = useAuth();
  const { data: reminderConfig } = useGetReminderConfig(user?.id);
  const { mutateAsync: setReminder } = useSetActionReminder();
  const { mutateAsync: clearReminder } = useClearActionReminder();

  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSubmittingRef = useRef(false);

  const translateY = useSharedValue(500);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withTiming(0, { duration: 300 });
    overlayOpacity.value = withTiming(1, { duration: 250 });
  }, []);

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  const dismiss = () => {
    translateY.value = withTiming(500, { duration: 280 });
    overlayOpacity.value = withTiming(0, { duration: 220 }, () =>
      runOnJS(onClose)(),
    );
  };

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value * 0.45,
  }));

  const handleSelect = async (reminderAt: Date) => {
    if (!user || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    try {
      await setReminder({
        userId: user.id,
        userActionId,
        reminderAt: reminderAt.toISOString(),
      });
      setConfirmation(`Reminder set for ${format(reminderAt, "EEE, h:mm a")}`);
      dismissTimerRef.current = setTimeout(() => dismiss(), 1400);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleClear = async () => {
    if (!user) return;
    await clearReminder({ userId: user.id, userActionId });
    dismiss();
  };

  // Compute preset dates from the user's configured times
  const tonightDate = reminderConfig
    ? utcTimeToLocalDate(reminderConfig.eveningReminderTime, 0)
    : null;
  const tomorrowMorningDate = reminderConfig
    ? utcTimeToLocalDate(reminderConfig.morningReminderTime, 1)
    : null;
  const tomorrowEveningDate = reminderConfig
    ? utcTimeToLocalDate(reminderConfig.eveningReminderTime, 1)
    : null;

  // "Tonight" is only valid if we haven't passed the evening time yet
  const isTonightAvailable =
    tonightDate !== null && isBefore(new Date(), tonightDate);

  return (
    <>
      {/* Overlay */}
      <Animated.View
        style={[tw`absolute inset-0 bg-black`, overlayStyle]}
        pointerEvents="box-none"
      >
        <Pressable style={tw`flex-1`} onPress={dismiss} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          tw`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 pb-12`,
          sheetStyle,
        ]}
      >
        {/* Drag handle */}
        <View style={tw`w-10 h-1 bg-charcoal/20 rounded-full self-center mb-5`} />

        <Text style={tw`text-xl font-gabarito font-bold text-charcoal mb-4`}>
          Set a reminder
        </Text>

        {confirmation ? (
          <View style={tw`py-8 items-center`}>
            <Text style={tw`font-gabarito text-charcoal text-base`}>
              {confirmation}
            </Text>
          </View>
        ) : (
          <>
            <View style={tw`gap-3 mb-3`}>
              {isTonightAvailable && tonightDate && (
                <Pressable
                  style={tw`border-2 border-charcoal/15 rounded-xl p-4`}
                  onPress={() => handleSelect(tonightDate)}
                >
                  <Text style={tw`font-gabarito font-bold text-charcoal`}>
                    Tonight
                  </Text>
                  <Text style={tw`font-gabarito text-sm text-charcoal/55 mt-0.5`}>
                    {format(tonightDate, "h:mm a")}
                  </Text>
                </Pressable>
              )}

              {tomorrowMorningDate && (
                <Pressable
                  style={tw`border-2 border-charcoal/15 rounded-xl p-4`}
                  onPress={() => handleSelect(tomorrowMorningDate)}
                >
                  <Text style={tw`font-gabarito font-bold text-charcoal`}>
                    Tomorrow morning
                  </Text>
                  <Text style={tw`font-gabarito text-sm text-charcoal/55 mt-0.5`}>
                    {format(tomorrowMorningDate, "EEE, h:mm a")}
                  </Text>
                </Pressable>
              )}

              {tomorrowEveningDate && (
                <Pressable
                  style={tw`border-2 border-charcoal/15 rounded-xl p-4`}
                  onPress={() => handleSelect(tomorrowEveningDate)}
                >
                  <Text style={tw`font-gabarito font-bold text-charcoal`}>
                    Tomorrow evening
                  </Text>
                  <Text style={tw`font-gabarito text-sm text-charcoal/55 mt-0.5`}>
                    {format(tomorrowEveningDate, "EEE, h:mm a")}
                  </Text>
                </Pressable>
              )}

              <Pressable
                style={tw`border-2 border-charcoal/15 rounded-xl p-4`}
                onPress={() => setShowCustomPicker(true)}
              >
                <Text style={tw`font-gabarito font-bold text-charcoal`}>
                  Custom time
                </Text>
                <Text style={tw`font-gabarito text-sm text-charcoal/55 mt-0.5`}>
                  Pick a date and time
                </Text>
              </Pressable>
            </View>

            {currentReminderAt && (
              <Pressable onPress={handleClear} style={tw`py-3 items-center`}>
                <Text style={tw`font-gabarito text-sm text-red-500`}>
                  Clear reminder
                </Text>
              </Pressable>
            )}

            {showCustomPicker && (
              <DateTimePicker
                value={new Date()}
                mode="datetime"
                minimumDate={new Date()}
                onChange={(event, date) => {
                  if (event.type === "dismissed" || event.type === "set") {
                    setShowCustomPicker(false);
                  }
                  if (event.type === "set" && date) {
                    handleSelect(date);
                  }
                }}
              />
            )}
          </>
        )}
      </Animated.View>
    </>
  );
}
