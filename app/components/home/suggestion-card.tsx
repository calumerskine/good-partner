import { CatalogAction } from "@/lib/api";
import { ActionTypes } from "@/lib/state/actions.model";
import tw from "@/lib/tw";
import { Text, View } from "react-native";
import Button from "../ui/button";
import PressableCard from "../ui/pressable-card";

type Props = {
  action: CatalogAction;
  onActivate: (actionId: string) => void;
  onSkip: (actionId: string) => void;
  isActivating: boolean;
  isSkipping: boolean;
  skipText: string;
};

export default function SuggestionCard({
  action,
  onActivate,
  onSkip,
  isActivating,
  isSkipping,
  skipText,
}: Props) {
  const { id, title, description, category } = action;
  // ActionTypes keys are uppercase (ATTENTION, AFFECTION, etc.)
  // category strings from the DB are title-case (Attention, Affection, etc.)
  const categoryInfo =
    ActionTypes[category.toUpperCase() as keyof typeof ActionTypes];

  const firstSentence = description
    ? description.substring(0, description.indexOf(".") + 1)
    : "";

  return (
    <PressableCard color={categoryInfo.color} shade={100} showShadow>
      <View style={tw`p-6 items-start`}>
        <View
          style={tw`bg-white rounded-lg flex flex-row items-center px-3 py-1`}
        >
          <Text style={tw`uppercase font-gabarito font-medium mr-2 text-sm`}>
            {categoryInfo.title}
          </Text>
          {categoryInfo.icon()}
        </View>
        {/* Content */}
        <View style={tw`flex-1 mt-3`}>
          <Text
            style={tw`text-2xl font-gabarito font-bold text-black leading-1.3 mt-4`}
          >
            {title}
          </Text>
          {firstSentence ? (
            <Text style={tw`text-lg text-black font-gabarito leading-1.6 mt-3`}>
              {firstSentence}
            </Text>
          ) : null}
        </View>
        <View style={tw`gap-3 mt-5`}>
          <Button
            color={categoryInfo.buttonColor as any}
            onPress={() => onActivate(id)}
            disabled={isActivating || isSkipping}
            style="min-w-full"
          >
            I'm on it
          </Button>
          <Button
            color="muted"
            onPress={() => onSkip(id)}
            disabled={isActivating || isSkipping}
          >
            {skipText}
          </Button>
        </View>
      </View>
    </PressableCard>
  );
}
