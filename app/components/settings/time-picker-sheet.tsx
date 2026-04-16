import { useHaptics } from "@/hooks/use-haptics";
import tw from "@/lib/tw";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

const timeStrToLocalDate = (timeStr: string): Date => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
};

const localDateToTimeStr = (date: Date): string => {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
};

interface TimePickerSheetProps {
  type: "morning" | "evening";
  currentTime: string;
  onSave: (timeStr: string) => void;
  onClose: () => void;
}

export default function TimePickerSheet({
  type,
  currentTime,
  onSave,
  onClose,
}: TimePickerSheetProps) {
  const { trigger } = useHaptics();
  const [pendingDate, setPendingDate] = useState(() =>
    timeStrToLocalDate(currentTime),
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
    onSave(localDateToTimeStr(pendingDate));
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
          textColor="#000000"
          onChange={(_, date) => {
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
