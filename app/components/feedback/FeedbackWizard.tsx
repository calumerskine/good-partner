import { trackEvent } from "@/lib/analytics";
import { useSubmitFeedback, type FeltValue } from "@/lib/api";
import { useHaptics } from "@/hooks/use-haptics";
import { type ActionType } from "@/lib/state/actions.model";
import tw from "@/lib/tw";
import { useState } from "react";
import { Text, View } from "react-native";
import SuccessScreen from "./SuccessScreen";
import Button from "../ui/button";

interface FeedbackWizardProps {
  completionId: string;
  category: ActionType;
  previousXp: number;
  newXp: number;
  onComplete: () => void;
}

export default function FeedbackWizard({
  category,
  completionId,
  previousXp,
  newXp,
  onComplete,
}: FeedbackWizardProps) {
  const [step, setStep] = useState<0 | 1>(0);
  const [felt, setFelt] = useState<FeltValue | null>(null);

  const submitFeedback = useSubmitFeedback();
  const { trigger } = useHaptics();

  const handleFeltSelect = async (value: FeltValue) => {
    if (value === "neutral") trigger("impactLight");
    else if (value === "good") trigger("impactMedium");
    else if (value === "great") trigger("success");

    setFelt(value);
    trackEvent("feedback_felt_selected", { value });
    try {
      await submitFeedback.mutateAsync({
        completionId,
        felt: value,
      });
      trackEvent("feedback_submitted", { felt: value });
      onComplete();
    } catch (error) {
      console.error("Error submitting feedback:", error);
    }
  };

  const handleNext = async () => {
    if (step === 0) {
      setStep(1);
    }
  };

  if (step === 0) {
    return (
      <SuccessScreen
        category={category}
        previousXp={previousXp}
        newXp={newXp}
        onNext={handleNext}
      />
    );
  }

  return (
    <View style={tw`flex-1 px-6`}>
      <View style={tw`flex-1 justify-center gap-6`}>
        <View style={tw`items-center mb-4`}>
          <Text style={tw`text-4xl mb-2`}>✨</Text>
          <Text
            style={tw`text-charcoal font-gabarito font-black text-3xl text-center`}
          >
            How did it go?
          </Text>
        </View>

        <View style={tw`gap-6`}>
          <Button color="muted" onPress={() => handleFeltSelect("neutral")}>
            Neutral 😐
          </Button>
          <Button color="muted" onPress={() => handleFeltSelect("good")}>
            Good 🙂
          </Button>
          <Button color="muted" onPress={() => handleFeltSelect("great")}>
            Great 🤩
          </Button>
        </View>
      </View>
    </View>
  );
}
