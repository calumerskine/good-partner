import { useHaptics } from "@/hooks/use-haptics";
import tw from "@/lib/tw";
import DateTimePicker from "@react-native-community/datetimepicker";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

const utcTimeStrToLocalDate = (utcTimeStr: string): Date => {
  const [hours, minutes] = utcTimeStr.split(":").map(Number);
  const d = new Date();
  d.setUTCHours(hours, minutes, 0, 0);
  return toZonedTime(d, tz);
};

const localDateToUtcTimeStr = (date: Date): string => {
  const utc = fromZonedTime(date, tz);
  const h = utc.getUTCHours().toString().padStart(2, "0");
  const m = utc.getUTCMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
};

interface TimePickerSheetProps {
  type: "morning" | "evening";
  currentUtcTime: string;
  onSave: (utcTimeStr: string) => void;
  onClose: () => void;
}

export default function TimePickerSheet({
  type,
  currentUtcTime,
  onSave,
  onClose,
}: TimePickerSheetProps) {
  const { trigger } = useHaptics();
  const [pendingDate, setPendingDate] = useState(() =>
    utcTimeStrToLocalDate(currentUtcTime),
  );

  const translateY = useSharedValue(500);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withTiming(0, { duration: 300 });
    overlayOpacity.value = withTiming(1, { duration: 250 });
  }, []);

  const dismiss = () => {
    translateY.value = withTiming(500, { duration: 280 });
    overlayOpacity.value = withTiming(0, { duration: 220 }, () =>
      scheduleOnRN(onClose),
    );
  };

  const handleDone = () => {
    onSave(localDateToUtcTimeStr(pendingDate));
    dismiss();
  };

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value * 0.45,
  }));

  return (
    <>
      <Animated.View
        style={[tw`absolute inset-0 bg-black`, overlayStyle]}
        pointerEvents="box-none"
      >
        <Pressable style={tw`flex-1`} onPress={dismiss} />
      </Animated.View>

      <Animated.View
        style={[
          tw`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 pb-12`,
          sheetStyle,
        ]}
      >
        <View style={tw`w-10 h-1 bg-black/20 rounded-full self-center mb-5`} />

        <View style={tw`flex-row items-center justify-between mb-2`}>
          <Text style={tw`text-xl font-gabarito font-bold text-black`}>
            {type === "morning" ? "Morning reminder" : "Evening reminder"}
          </Text>
        </View>

        <DateTimePicker
          value={pendingDate}
          mode="time"
          display="spinner"
          onValueChange={(_, date) => {
            if (date) setPendingDate(date);
          }}
          style={tw`w-full`}
        />

        <View style={tw`flex-row gap-3 mt-2`}>
          <Pressable
            style={tw`flex-1 border-2 border-black/15 rounded-xl py-3 items-center`}
            onPress={() => {
              trigger("impactLight");
              dismiss();
            }}
          >
            <Text style={tw`font-gabarito font-bold text-black`}>Cancel</Text>
          </Pressable>
          <Pressable
            style={tw`flex-1 bg-black rounded-xl py-3 items-center`}
            onPress={() => {
              trigger("success");
              handleDone();
            }}
          >
            <Text style={tw`font-gabarito font-bold text-white`}>Done</Text>
          </Pressable>
        </View>
      </Animated.View>
    </>
  );
}
