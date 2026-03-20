import tw from "@/lib/tw";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

type Props = {
  dayNumber: number;
};

export default function HomeHeader({ dayNumber }: Props) {
  return (
    <View style={tw`flex-row items-center justify-between pt-4 pb-2`}>
      {/* Day badge */}
      <View style={tw`bg-indigo-400 px-4 py-1.5 rounded-full`}>
        <Text style={tw`text-white font-gabarito font-bold text-base`}>
          Day {dayNumber}
        </Text>
      </View>

      {/* Avatar → settings.
          Note: components/ui/avatar.tsx exists but is sized w-50 h-50 (large profile card use).
          Use an inline Pressable circle here — sized for a header icon. */}
      <Pressable
        onPress={() => router.push("/(tabs)/(settings)" as any)}
        style={tw`w-10 h-10 rounded-full bg-amber-400 items-center justify-center`}
        hitSlop={8}
      >
        {/* Placeholder initial — replace with real user initial/photo once design is confirmed */}
        <Text style={tw`text-charcoal font-gabarito font-bold text-base`}>
          Me
        </Text>
      </Pressable>
    </View>
  );
}
