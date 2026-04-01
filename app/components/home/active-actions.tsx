import { useMountAnimation } from "@/hooks/animations";
import { UserAction, useCompleteAction, useDeactivateAction } from "@/lib/api";
import { ActionTypes } from "@/lib/state/actions.model";
import { env } from "@/lib/env";
import tw from "@/lib/tw";
import { Link, router } from "expo-router";
import { useCallback } from "react";
import { Animated, Text, View } from "react-native";
import { format, isBefore, isToday, isTomorrow } from "date-fns";
import Button from "../ui/button";
import PressableCard from "../ui/pressable-card";
import Svg, { Path } from "react-native-svg";
import { Check } from "lucide-react-native";
import { Image } from "expo-image";
import { useAssets } from "expo-asset";

export function ActionCard({
  item,
  completed = false,
}: {
  item: UserAction;
  completed?: boolean;
}) {
  const [starImage, error] = useAssets([
    require("../../assets/images/star.png"),
  ]);

  console.log("image", starImage?.[0]);

  const categoryInfo =
    ActionTypes[item.action.category as keyof typeof ActionTypes];

  const firstSentence = item.action.description
    ? item.action.description.substring(
        0,
        item.action.description.indexOf(".") + 1,
      )
    : "";

  return (
    <PressableCard
      color={categoryInfo.color}
      shade={200}
      showShadow
      fillHeight
      style={tw`h-76`}
      onPress={() => router.push(`/(action)/${item.id}` as any)}
    >
      <View style={tw`p-6 items-start flex-1`}>
        <View
          style={tw`flex flex-row justify-between items-baseline w-full pb-4`}
        >
          <View style={tw`flex flex-row items-center gap-2`}>
            {completed ? (
              <>
                <Text style={tw`font-bold`}>Completed</Text>
                <View
                  style={tw`absolute left-20 mb-2 ml-1 w-8 h-8 rounded-full bg-green-500 items-center justify-center`}
                >
                  <Check size={18} color="white" strokeWidth={3} />
                </View>
              </>
            ) : (
              <>
                <Text style={tw`font-bold`}>In Progress</Text>
                <View
                  style={tw`bg-green-400 border-green-500 border w-3 h-3 rounded-full`}
                />
              </>
            )}
          </View>
          <View
            style={tw`bg-${categoryInfo.color}-300 rounded-lg flex flex-row items-center px-3 py-1`}
          >
            <Text style={tw`uppercase font-gabarito font-medium mr-2 text-sm`}>
              {categoryInfo.title}
            </Text>
            {categoryInfo.icon()}
          </View>
        </View>
        <View style={tw`flex-1 mt-2`}>
          <Text
            style={tw`text-2xl font-gabarito font-bold text-black`}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {item.action.title}
          </Text>
          <Image source={starImage?.[0].localUri} />
          <Text
            style={tw`text-lg text-black font-gabarito leading-relaxed mt-3`}
            numberOfLines={4}
            ellipsizeMode="tail"
          >
            {firstSentence}
          </Text>
        </View>
        {completed && (
          <View
            style={tw`w-20 h-20 rounded-full bg-transparent items-center justify-center pt-12`}
          >
            {/* <Check size={16} color="white" strokeWidth={3} /> */}
            {/* <Star /> */}
          </View>
        )}
      </View>
    </PressableCard>
  );
}

function ActionCardButtons({
  item,
  onRemind,
}: {
  item: UserAction;
  onRemind: () => void;
}) {
  const categoryInfo =
    ActionTypes[item.action.category as keyof typeof ActionTypes];
  const completeAction = useCompleteAction();
  const deactivateAction = useDeactivateAction();

  const handleComplete = useCallback(async () => {
    try {
      const completion = await completeAction.mutateAsync(item.id);
      router.replace(
        `/(action)/${item.id}/success?completionId=${completion.id}&categoryId=${item.action.category}&previousXp=${completion.previousXp}&newXp=${completion.newXp}` as any,
      );
    } catch (error) {
      console.error("Error completing action:", error);
    }
  }, [completeAction, item.id, item.action.category]);

  const handleDeactivate = useCallback(async () => {
    try {
      await deactivateAction.mutateAsync(item.id);
    } catch (error) {
      console.error("Error deactivating action:", error);
    }
  }, [deactivateAction, item.id]);

  return (
    <View style={tw`gap-2`}>
      <Button
        onPress={handleComplete}
        disabled={completeAction.isPending}
        color="green"
        style="min-w-full"
      >
        {completeAction.isPending ? "Loading..." : "✓ I've done it!"}
      </Button>
      {env.flags.useReminders && (
        <Button color="ghost" size="sm" onPress={onRemind}>
          {item.reminderAt && isBefore(new Date(), item.reminderAt)
            ? isToday(item.reminderAt)
              ? `Today, ${format(item.reminderAt, "h:mm a")}`
              : isTomorrow(item.reminderAt)
                ? `Tomorrow, ${format(item.reminderAt, "h:mm a")}`
                : format(item.reminderAt, "EEE, h:mm a")
            : "Remind me"}
        </Button>
      )}
      <Button
        color="ghost"
        size="sm"
        onPress={handleDeactivate}
        disabled={deactivateAction.isPending}
      >
        Not today after all
      </Button>
    </View>
  );
}

export default function ActiveActions({
  isLoading,
  userActions,
  onRemind,
}: {
  isLoading: boolean;
  userActions: UserAction[];
  onRemind: (id: string) => void;
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

  return (
    <View style={tw`flex-1 flex-col`}>
      <Animated.View style={headingAnim.animatedStyle}>
        <Text style={tw`text-2xl text-black font-gabarito font-bold mb-4`}>
          Your move for today:
        </Text>
      </Animated.View>

      {isLoading ? (
        <View style={tw`py-12 items-center`}>
          <Text style={tw`text-ink font-gabarito text-lg`}>Loading...</Text>
        </View>
      ) : userActions.length > 0 ? (
        <>
          <Animated.View style={[tw`flex-1`, cardsAnim.animatedStyle]}>
            <View style={tw`flex-1 gap-4 pb-4`}>
              {userActions.map((item: UserAction) => (
                <ActionCard key={item.id} item={item} />
              ))}
            </View>
          </Animated.View>
          <Animated.View style={[tw`pb-2`, buttonsAnim.animatedStyle]}>
            {userActions.map((item: UserAction) => (
              <ActionCardButtons
                key={item.id}
                item={item}
                onRemind={() => onRemind(item.id)}
              />
            ))}
          </Animated.View>
        </>
      ) : (
        <View style={tw`rounded-2xl p-8 bg-mediumGrey`}>
          <Text style={tw`text-base text-ink font-gabarito mb-6`}>
            Choose an action to focus on today and start building meaningful
            habits
          </Text>
          <Link href="/(tabs)/(actions)" asChild>
            <Button>
              <Text style={tw`text-black font-gabarito`}>Browse Actions</Text>
            </Button>
          </Link>
        </View>
      )}
    </View>
  );
}

function Star() {
  return (
    <Svg viewBox="0 0 24 24" style={tw`w-12 h-12`}>
      <Path
        fill={tw.color("yellow-400")}
        stroke={tw.color("yellow-950")}
        strokeWidth="0.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        d="M11.23 3.37l-2.07 4.88a1 1 0 01-.78.57l-5.28.45a1 1 0 00-.57 1.76l4.02 3.48a1 1 0 01.3 0.93l-1.2 5.14a1 1 0 001.48 1.08l4.59-2.77a1 1 0 011.06 0l4.59 2.77a1 1 0 001.48-1.08l-1.2-5.14a1 1 0 01.3-0.93l4.02-3.48a1 1 0 00-.57-1.76l-5.28-.45a1 1 0 01-.78-.57l-2.07-4.88a1 1 0 00-1.84 0z"
      />
    </Svg>
  );
}
