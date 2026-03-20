import { useReminderPrompt } from "@/hooks/use-reminder-prompt";
import {
  CatalogAction,
  useActivateAction,
  useGetSuggestedActions,
  useSkipAction,
  UserProfile,
} from "@/lib/api";
import tw from "@/lib/tw";
import { User } from "@supabase/supabase-js";
import { Link, router } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Button from "../ui/button";
import SuggestionCard from "./suggestion-card";

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
    try {
      await skipAction.mutateAsync({ userId: user.id, actionId });
      setCurrentIndex((i) => i + 1);
    } catch (error) {
      console.error("Error skipping action:", error);
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

  return (
    <View style={tw`flex-1 pt-4`}>
      <Text style={tw`text-3xl text-black font-gabarito font-bold mb-6`}>
        Pick your action
      </Text>

      {/* Progress dots */}
      <View style={tw`flex-row justify-center gap-2 mb-6`}>
        {suggestedActions.map((_: CatalogAction, i: number) => (
          <View
            key={i}
            style={tw.style(
              `w-2 h-2 rounded-full`,
              i < currentIndex
                ? `bg-charcoal/30`
                : i === currentIndex
                  ? `bg-grape`
                  : `bg-charcoal/20`,
            )}
          />
        ))}
      </View>

      {allExhausted ? (
        /* Browse Library state */
        <Link href="/(tabs)/(actions)" asChild>
          <Pressable
            style={tw`flex-1 bg-grape rounded-2xl items-center justify-center gap-8 p-10 min-h-64`}
          >
            <Text
              style={tw`text-3xl font-gabarito font-bold text-white leading-1.1 text-center`}
            >
              Browse the full library
            </Text>
            <ArrowRight size={40} color="white" />
          </Pressable>
        </Link>
      ) : currentAction ? (
        <SuggestionCard
          action={currentAction}
          onActivate={handleActivate}
          onSkip={handleSkip}
          isActivating={activateAction.isPending}
          isSkipping={skipAction.isPending}
        />
      ) : null}
    </View>
  );
}
