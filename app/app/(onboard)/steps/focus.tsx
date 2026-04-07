import { CategoryButton } from "@/components/category-button";
import Button from "@/components/ui/button";
import { ActionTypes } from "@/lib/state/actions.model";
import tw from "@/lib/tw";
import { ScrollView, Text, View } from "react-native";

const FOCUS_OPTIONS = {
  ATTENTION: {
    title: "Being more present & connected",
    description: "Focus on quality time and active listening",
    color: ActionTypes.ATTENTION.color,
  },
  AFFECTION: {
    title: "Showing more affection & appreciation",
    description: "Express love through words and actions",
    color: ActionTypes.AFFECTION.color,
  },
  INITIATIVE: {
    title: "Taking ownership & sharing mental load",
    description: "Plan dates and manage tasks together",
    color: ActionTypes.INITIATIVE.color,
  },
  REPAIR: {
    title: "Handling conflicts & emotions",
    description: "Build better communication and resolution skills",
    color: ActionTypes.REPAIR.color,
  },
};

type Props = {
  selected: string[];
  onToggle: (key: string) => void;
  onNext: () => void;
};

export function FocusStep({ selected, onToggle, onNext }: Props) {
  return (
    <View style={tw`flex-1 px-6 pt-3`}>
      <View style={tw`mb-5 text-center`}>
        <Text
          style={tw`text-3xl text-ink font-gabarito font-bold text-center mb-2`}
        >
          What would you like to focus on?
        </Text>
        <Text style={tw`text-lg text-ink/80 font-gabarito text-center`}>
          You can choose multiple.
        </Text>
      </View>
      <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
        <View style={tw`gap-2`}>
          {Object.entries(FOCUS_OPTIONS).map(([key, value]) => (
            <View key={key}>
              <CategoryButton
                text={value.title}
                description={value.description}
                color={value.color}
                category={key}
                onPress={onToggle}
                selected={selected.includes(key)}
              />
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={tw`w-full pt-6 pb-2`}>
        <Button onPress={onNext} disabled={selected.length === 0}>
          Continue
        </Button>
        <View style={tw`h-5 mt-2`}>
          {selected.length === 0 && (
            <Text style={tw`text-ink/80 font-gabarito text-center`}>
              Please select at least one area to continue
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
