import Button from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import {
  useSubmitFeedback,
  type FeltValue,
  type NoticedValue,
} from "@/lib/api";
import tw from "@/lib/tw";
import { useState } from "react";
import { Text, View } from "react-native";
import FeedbackCard from "./FeedbackCard";

interface FeedbackWizardProps {
  actionId: string;
  completionId: string;
  onComplete: () => void;
}

export default function FeedbackWizard({
  actionId,
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
  };

  const handleFeltSelect = (value: FeltValue) => {
    setFelt(value);
    trackEvent("feedback_felt_selected", { value });
  };

  const handleNext = async () => {
    if (step === 0 && wasNoticed) {
      setStep(1);
    } else if (step === 1 && felt && wasNoticed) {
      try {
        await submitFeedback.mutateAsync({
          completionId,
          wasNoticed,
          felt,
        });
        trackEvent("feedback_submitted", {
          was_noticed: wasNoticed,
          felt,
        });
        setStep(2);
      } catch (error) {
        console.error("Error submitting feedback:", error);
      }
    }
  };

  const canProceed = step === 0 ? !!wasNoticed : !!felt;

  if (step === 2) {
    return (
      <View style={tw`flex-1 items-center justify-between px-6`}>
        <View style={tw`flex-1`} />

        <View style={tw`items-center gap-6 px-4`}>
          <View
            style={tw`w-32 h-32 rounded-full bg-mint/20 items-center justify-center mb-4`}
          >
            <Text style={tw`text-7xl`}>✨</Text>
          </View>
          <Text
            style={tw`text-charcoal font-gabarito font-black text-5xl text-center mb-4`}
          >
            Great job!
          </Text>
          <Text
            style={tw`text-charcoal/70 font-gabarito text-xl text-center mb-8 px-4`}
          >
            Every action counts. You're building something meaningful.
          </Text>
        </View>
        <View style={tw`flex-1`} />
        <Button onPress={onComplete}>Continue</Button>
      </View>
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

        {step === 0 && (
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

        {step === 1 && (
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

      <View style={tw`pb-6`}>
        <Button
          onPress={handleNext}
          disabled={!canProceed || submitFeedback.isPending}
          color="mint"
        >
          {submitFeedback.isPending
            ? "Submitting..."
            : step === 1
            ? "Submit"
            : "Next"}
        </Button>
      </View>
    </View>
  );
}
