import FeedbackWizard from "@/components/feedback/FeedbackWizard";
import { trackEvent } from "@/lib/analytics";
import { ActionTypes, type ActionType } from "@/lib/state/actions.model";
import tw from "@/lib/tw";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

function getActionCategory(categoryName: string): ActionType {
  const categories: Record<string, ActionType> = {
    attention: ActionTypes.ATTENTION,
    affection: ActionTypes.AFFECTION,
    initiative: ActionTypes.INITIATIVE,
    repair: ActionTypes.REPAIR,
  };
  return categories[categoryName?.toLowerCase()] || ActionTypes.ATTENTION;
}

export default function ActionSuccessScreen() {
  const { completionId, categoryId, previousXp, newXp } = useLocalSearchParams<{
    completionId: string;
    categoryId: string;
    previousXp: string;
    newXp: string;
  }>();

  const category = getActionCategory(categoryId);

  useEffect(() => {
    trackEvent("screen_viewed", { screen_name: "Action Success" });
    trackEvent("feedback_started");
  }, []);

  const handleComplete = () => {
    router.replace("/(tabs)/(home)");
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-background`}>
      <FeedbackWizard
        completionId={completionId}
        category={category}
        previousXp={Number(previousXp) || 0}
        newXp={Number(newXp) || 0}
        onComplete={handleComplete}
      />
    </SafeAreaView>
  );
}
