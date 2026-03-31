import { useAuth } from "@/hooks/use-auth";
import { useClearActionReminder, useSetActionReminder } from "@/lib/api";
import tw from "@/lib/tw";
import DateTimePicker from "@react-native-community/datetimepicker";
import { addHours, format, isBefore, set } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

interface ActionReminderSheetProps {
  userActionId: string;
  currentReminderAt: Date | null;
  onClose: () => void;
}

export default function ActionReminderSheet({
  userActionId,
  currentReminderAt,
  onClose,
}: ActionReminderSheetProps) {
  const { user } = useAuth();
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
      scheduleOnRN(onClose),
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

  const inTwoHoursDate = addHours(new Date(), 2);
  const tonightAt9 = set(new Date(), {
    hours: 21,
    minutes: 0,
    seconds: 0,
    milliseconds: 0,
  });
  const isTonightAvailable = isBefore(new Date(), tonightAt9);

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
        <View style={tw`w-10 h-1 bg-black/20 rounded-full self-center mb-5`} />

        <Text style={tw`text-xl font-gabarito font-bold text-black mb-4`}>
          Set a reminder
        </Text>

        {confirmation ? (
          <View style={tw`py-8 items-center`}>
            <Text style={tw`font-gabarito text-black text-base`}>
              {confirmation}
            </Text>
          </View>
        ) : (
          <>
            <View style={tw`gap-3 mb-3`}>
              <Pressable
                style={tw`border-2 border-black/15 rounded-xl p-4`}
                onPress={() => handleSelect(inTwoHoursDate)}
              >
                <Text style={tw`font-gabarito font-bold text-black`}>
                  In 2 hours
                </Text>
                <Text style={tw`font-gabarito text-sm text-black/55 mt-0.5`}>
                  {format(inTwoHoursDate, "h:mm a")}
                </Text>
              </Pressable>

              {isTonightAvailable && (
                <Pressable
                  style={tw`border-2 border-black/15 rounded-xl p-4`}
                  onPress={() => handleSelect(tonightAt9)}
                >
                  <Text style={tw`font-gabarito font-bold text-black`}>
                    Tonight at 9pm
                  </Text>
                  <Text style={tw`font-gabarito text-sm text-black/55 mt-0.5`}>
                    9:00 PM
                  </Text>
                </Pressable>
              )}

              <Pressable
                style={tw`border-2 border-black/15 rounded-xl p-4`}
                onPress={() => setShowCustomPicker(true)}
              >
                <Text style={tw`font-gabarito font-bold text-black`}>
                  Custom
                </Text>
                <Text style={tw`font-gabarito text-sm text-black/55 mt-0.5`}>
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
                textColor="#000000"
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
