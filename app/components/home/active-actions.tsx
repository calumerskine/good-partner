import { useMountAnimation } from "@/hooks/animations";
import { UserAction, useCompleteAction, useDeactivateAction } from "@/lib/api";
import { ActionTypes } from "@/lib/state/actions.model";
import { env } from "@/lib/env";
import tw from "@/lib/tw";
import { Link, router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { Animated, ScrollView, Text, View } from "react-native";
import { format, isBefore, isToday, isTomorrow } from "date-fns";
import Button from "../ui/button";
import PressableCard from "../ui/pressable-card";

function ActionCard({ item }: { item: UserAction }) {
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
            <Text style={tw`font-bold`}>In Progress</Text>
            <View
              style={tw`bg-green-400 border-green-500 border w-3 h-3 rounded-full`}
            />
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
          <Text
            style={tw`text-lg text-black font-gabarito leading-relaxed mt-3`}
            numberOfLines={4}
            ellipsizeMode="tail"
          >
            {firstSentence}
          </Text>
        </View>
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
  const headingAnim = useMountAnimation({ fromOpacity: 0, fromTranslateY: 8, duration: 250, delay: 0 });
  const cardsAnim = useMountAnimation({ fromOpacity: 0, fromTranslateY: 8, duration: 250, delay: 80 });
  const buttonsAnim = useMountAnimation({ fromOpacity: 0, fromTranslateY: 8, duration: 250, delay: 160 });

  useFocusEffect(
    useCallback(() => {
      headingAnim.trigger();
      cardsAnim.trigger();
      buttonsAnim.trigger();
    }, []),
  );

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
            <ScrollView
              style={tw`flex-1`}
              contentContainerStyle={tw`gap-4 pb-4`}
              showsVerticalScrollIndicator={false}
            >
              {userActions.map((item: UserAction) => (
                <ActionCard key={item.id} item={item} />
              ))}
            </ScrollView>
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
