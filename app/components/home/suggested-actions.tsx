import { useMountAnimation, useSwipeOut } from "@/hooks/animations";
import { useReminderPrompt } from "@/hooks/use-reminder-prompt";
import { trackEvent } from "@/lib/analytics";
import {
  CatalogAction,
  useActivateAction,
  useGetSuggestedActions,
  useSkipAction,
  UserProfile,
} from "@/lib/api";
import { ActionTypes } from "@/lib/state/actions.model";
import tw from "@/lib/tw";
import { User } from "@supabase/supabase-js";
import { router } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { useState } from "react";
import { Animated, Text, View } from "react-native";
import SuggestionCard from "./suggestion-card";
import Button from "../ui/button";
import PressableCard from "../ui/pressable-card";

function skipText(index: number) {
  switch (index) {
    case 0:
      return "Not the right time";
    case 1:
      return "Another suggestion";
    case 2:
      return "Another suggestion";
    case 3:
      return "Last suggestion for today";
    case 4:
      return "See more suggestions";
    default:
      "Not the right time";
  }
  return "Not the right time";
}

export default function SuggestedActions({
  user,
  profile,
  isLoading,
}: {
  user: User | null;
  profile?: UserProfile | null;
  isLoading: boolean;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const headingAnim = useMountAnimation({ fromOpacity: 0, fromTranslateY: 8, duration: 250, delay: 0 });
  const buttonsAnim = useMountAnimation({ fromOpacity: 0, fromTranslateY: 8, duration: 250, delay: 160 });
  const swipeOut = useSwipeOut();

  const { data: suggestedActions = [] } = useGetSuggestedActions(
    user?.id,
    profile?.categories,
  );

  const activateAction = useActivateAction();
  const skipAction = useSkipAction();
  const { shouldPrompt, markShown } = useReminderPrompt(user?.id);

  const handleActivate = async (actionId: string) => {
    if (!user) return;
    try {
      await activateAction.mutateAsync({ userId: user.id, actionId });
      trackEvent("suggestion_activated", { action_id: actionId, index: currentIndex });
      if (shouldPrompt) {
        markShown();
        router.replace(`/(action)/${actionId}/reminders` as any);
      }
    } catch (error) {
      console.error("Error activating action:", error);
    }
  };

  const handleSkip = async (actionId: string) => {
    if (!user) return;
    const nextIndex = currentIndex + 1;
    try {
      await Promise.all([
        new Promise<void>((resolve) => swipeOut.triggerExit(resolve)),
        skipAction.mutateAsync({ userId: user.id, actionId }),
      ]);
      trackEvent("suggestion_skipped", { action_id: actionId, index: currentIndex });
      // Card is now opacity 0, off-screen left. Safe to swap content.
      if (nextIndex >= suggestedActions.length) {
        router.replace("/(tabs)/(actions)" as any);
      } else {
        setCurrentIndex(nextIndex);
        swipeOut.triggerEntrance();
      }
    } catch (error) {
      console.error("Error skipping action:", error);
      swipeOut.reset();
    }
  };

  if (isLoading) {
    return (
      <View style={tw`py-12 items-center`}>
        <Text style={tw`text-charcoal font-gabarito text-lg`}>Loading...</Text>
      </View>
    );
  }

  if (!suggestedActions.length) {
    return null;
  }

  const currentAction = suggestedActions[currentIndex] as
    | CatalogAction
    | undefined;
  const allExhausted = currentIndex >= suggestedActions.length;
  const categoryInfo = currentAction
    ? ActionTypes[
        currentAction.category.toUpperCase() as keyof typeof ActionTypes
      ]
    : null;

  return (
    <View style={tw`flex-1 flex-col`}>
      {allExhausted ? (
        /* Browse Library state */
        <PressableCard color="indigo" shade={500}>
          <View style={tw`p-6 flex justify-center items-center`}>
            <Text style={tw`text-3xl font-gabarito font-bold text-white`}>
              Browse the full library
            </Text>
            <ArrowRight size={40} color="white" />
          </View>
        </PressableCard>
      ) : currentAction ? (
        <>
          <View style={tw`flex-1`}>
            <Animated.View style={headingAnim.animatedStyle}>
              <Text style={tw`text-2xl text-black font-gabarito font-bold mb-4`}>
                Your move for today:
              </Text>
            </Animated.View>
            <Animated.View style={[tw`flex-1`, swipeOut.animatedStyle]}>
              <SuggestionCard
                action={currentAction}
                forYou={
                  <Text style={tw`font-bold pt-0.5`}>
                    For you {currentIndex + 1}/{suggestedActions.length}
                  </Text>
                }
              />
            </Animated.View>
          </View>
          <Animated.View style={[tw`pb-2 gap-3`, buttonsAnim.animatedStyle]}>
            <Button
              color={categoryInfo!.buttonColor as any}
              onPress={() => handleActivate(currentAction.id)}
              disabled={activateAction.isPending || skipAction.isPending}
              style="min-w-full"
            >
              I'm on it
            </Button>
            <Button
              color="ghost"
              size="sm"
              onPress={() => handleSkip(currentAction.id)}
              disabled={activateAction.isPending || skipAction.isPending}
            >
              {skipText(currentIndex)}
            </Button>
          </Animated.View>
        </>
      ) : null}
    </View>
  );
}
