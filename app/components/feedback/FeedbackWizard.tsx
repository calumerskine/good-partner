import { trackEvent } from "@/lib/analytics";
import {
  useSubmitFeedback,
  type FeltValue,
  type NoticedValue,
} from "@/lib/api";
import { type ActionType } from "@/lib/state/actions.model";
import tw from "@/lib/tw";
import { useState } from "react";
import { Text, View } from "react-native";
import FeedbackCard from "./FeedbackCard";
import SuccessScreen from "./SuccessScreen";

interface FeedbackWizardProps {
  completionId: string;
  category: ActionType;
  onComplete: () => void;
}

export default function FeedbackWizard({
  category,
  completionId,
  onComplete,
}: FeedbackWizardProps) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [wasNoticed, setWasNoticed] = useState<NoticedValue | null>(null);
  const [felt, setFelt] = useState<FeltValue | null>(null);

  const submitFeedback = useSubmitFeedback();

  const handleNoticedSelect = (value: NoticedValue) => {
    setWasNoticed(value);
    trackEvent("feedback_noticed_selected", { value });
    setTimeout(() => setStep(2), 300);
  };

  const handleFeltSelect = async (value: FeltValue) => {
    setFelt(value);
    trackEvent("feedback_felt_selected", { value });
    try {
      await submitFeedback.mutateAsync({
        completionId,
        wasNoticed: wasNoticed!,
        felt: value,
      });
      trackEvent("feedback_submitted", {
        was_noticed: wasNoticed,
        felt: value,
      });
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
    return <SuccessScreen category={category} onNext={handleNext} />;
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

        {step === 1 && (
          <View style={tw`gap-3`}>
            <Text
              style={tw`text-charcoal/70 font-gabarito text-lg text-center mb-2`}
            >
              Was the action noticed?
            </Text>
            <FeedbackCard
              label="Not yet"
              selected={wasNoticed === "not_yet"}
              onPress={() => handleNoticedSelect("not_yet")}
            />
            <FeedbackCard
              label="A little"
              selected={wasNoticed === "a_little"}
              onPress={() => handleNoticedSelect("a_little")}
            />
            <FeedbackCard
              label="Yes, definitely"
              selected={wasNoticed === "yes_definitely"}
              onPress={() => handleNoticedSelect("yes_definitely")}
            />
          </View>
        )}

        {step === 2 && (
          <View style={tw`gap-3`}>
            <Text
              style={tw`text-charcoal/70 font-gabarito text-lg text-center mb-2`}
            >
              How did it feel for you?
            </Text>
            <FeedbackCard
              label="Neutral"
              selected={felt === "neutral"}
              onPress={() => handleFeltSelect("neutral")}
            />
            <FeedbackCard
              label="Good"
              selected={felt === "good"}
              onPress={() => handleFeltSelect("good")}
            />
            <FeedbackCard
              label="Great"
              selected={felt === "great"}
              onPress={() => handleFeltSelect("great")}
            />
          </View>
        )}
      </View>
    </View>
  );
}
