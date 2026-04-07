import { CatalogAction } from "@/lib/api";
import { ActionTypes } from "@/lib/state/actions.model";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { Text, View } from "react-native";
import PressableCard from "../ui/pressable-card";

type Props = {
  action: CatalogAction;
  forYou: React.ReactNode;
};

export default function SuggestionCard({ action, forYou }: Props) {
  const { title, description, category, id } = action;
  const categoryInfo =
    ActionTypes[category.toUpperCase() as keyof typeof ActionTypes];

  const firstSentence = description
    ? description.substring(0, description.indexOf(".") + 1)
    : "";

  return (
    <PressableCard
      color={categoryInfo.color}
      shade={200}
      showShadow
      fillHeight
      style={tw`h-76`}
      onPress={() => router.push(`/(action)/${id}?catalog=true` as any)}
    >
      <View style={tw`p-6 items-start flex-1`}>
        <View style={tw`flex flex-row justify-between items-baseline w-full`}>
          {forYou}
          <View
            style={tw`bg-${categoryInfo.color}-300 rounded-lg flex flex-row items-center px-3 py-1`}
          >
            <Text style={tw`uppercase font-gabarito font-medium mr-2 text-sm`}>
              {categoryInfo.title}
            </Text>
            {categoryInfo.icon({ style: tw`text-${categoryInfo.color}-600` })}
          </View>
        </View>
        <View style={tw`flex-1 mt-2`}>
          <Text
            style={tw`text-2xl font-gabarito font-bold text-black mt-4`}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {title}
          </Text>
          {firstSentence ? (
            <Text
              style={tw`text-lg text-black font-gabarito leading-relaxed mt-3`}
              numberOfLines={3}
              ellipsizeMode="tail"
            >
              {firstSentence}
            </Text>
          ) : null}
        </View>
      </View>
    </PressableCard>
  );
}
