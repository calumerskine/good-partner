import FeedbackWizard from "@/components/feedback/FeedbackWizard";
import { trackEvent } from "@/lib/analytics";
import tw from "@/lib/tw";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ActionSuccessScreen() {
  const { id, completionId } = useLocalSearchParams<{ id: string; completionId: string }>();

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
        actionId={id}
        completionId={completionId}
        onComplete={handleComplete}
      />
    </SafeAreaView>
  );
}
