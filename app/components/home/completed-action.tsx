import { useMountAnimation } from "@/hooks/animations";
import { UserAction } from "@/lib/api";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { Check } from "lucide-react-native";
import { Animated, Text, View } from "react-native";
import { ActionCard } from "./active-actions";
import Button from "../ui/button";

export default function CompletedAction({
  action,
  streakDays,
  onDoAnother,
}: {
  action: UserAction;
  streakDays: number;
  onDoAnother: () => void;
}) {
  const headingAnim = useMountAnimation({
    fromOpacity: 0,
    fromTranslateY: 8,
    duration: 250,
    delay: 0,
  });
  const cardsAnim = useMountAnimation({
    fromOpacity: 0,
    fromTranslateY: 8,
    duration: 250,
    delay: 80,
  });
  const buttonsAnim = useMountAnimation({
    fromOpacity: 0,
    fromTranslateY: 8,
    duration: 250,
    delay: 160,
  });

  const progressLabel =
    streakDays >= 3
      ? `🔥 You're on a ${streakDays}-day streak`
      : "See your progress";

  return (
    <View style={tw`flex-1 flex-col`}>
      <Animated.View style={headingAnim.animatedStyle}>
        <View style={tw`flex-row items-center gap-2 mb-4`}>
          <Check size={22} color="#2E3130" strokeWidth={2.5} />
          <Text style={tw`text-2xl text-black font-gabarito font-bold`}>
            Done for today.
          </Text>
        </View>
      </Animated.View>

      <Animated.View style={[tw`flex-1`, cardsAnim.animatedStyle]}>
        <View style={tw`flex-1 pb-4`}>
          <ActionCard item={action} completed />
        </View>
      </Animated.View>

      <Animated.View style={[tw`pb-2 gap-3`, buttonsAnim.animatedStyle]}>
        <Button
          color="indigo"
          style="min-w-full"
          onPress={() => router.push("/(tabs)/(progress)" as any)}
        >
          {progressLabel}
        </Button>
        <Button color="ghost" size="sm" onPress={onDoAnother}>
          Do Another
        </Button>
      </Animated.View>
    </View>
  );
}
