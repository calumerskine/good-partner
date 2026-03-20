import { CatalogAction } from "@/lib/api";
import { ActionTypes } from "@/lib/state/actions.model";
import tw from "@/lib/tw";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import Button from "../ui/button";

type Props = {
  action: CatalogAction;
  onActivate: (actionId: string) => void;
  onSkip: (actionId: string) => void;
  isActivating: boolean;
  isSkipping: boolean;
};

export default function SuggestionCard({
  action,
  onActivate,
  onSkip,
  isActivating,
  isSkipping,
}: Props) {
  const { id, title, description, category } = action;
  // ActionTypes keys are uppercase (ATTENTION, AFFECTION, etc.)
  // category strings from the DB are title-case (Attention, Affection, etc.)
  const categoryInfo = ActionTypes[category.toUpperCase() as keyof typeof ActionTypes];

  const firstSentence = description
    ? description.substring(0, description.indexOf(".") + 1)
    : "";

  return (
    <View style={tw`flex-1`}>
      {/* Card (tappable → detail screen) */}
      <Link href={`/(action)/${id}?catalog=true`} asChild>
        <Pressable
          style={tw`flex-1 rounded-2xl p-7 pt-10 border-2 bg-${categoryInfo.color}-200`}
        >
          {/* Category icon */}
          <View style={tw`absolute top-4 right-4`}>
            <FontAwesome
              name={categoryInfo.iconName}
              size={26}
              style={tw`text-${categoryInfo.color}-500`}
            />
          </View>

          {/* Content */}
          <View style={tw`flex-1 justify-center items-center gap-4`}>
            <Text
              style={tw`text-2xl font-gabarito font-bold text-black leading-1.3 text-center`}
            >
              {title}
            </Text>
            {firstSentence ? (
              <Text
                style={tw`text-lg text-black font-gabarito leading-1.6 text-center`}
              >
                {firstSentence}
              </Text>
            ) : null}
          </View>
        </Pressable>
      </Link>

      {/* Actions */}
      <View style={tw`gap-3 mt-5`}>
        <Button
          // Map AFFECTION's "pink" token → "raspberry" to match Button's actual color keys.
          // Valid Button colors: grape, peach, mint, raspberry, orange, blue, yellow, muted, ghost, charcoal.
          color={(categoryInfo.buttonColor === "pink" ? "raspberry" : categoryInfo.buttonColor) as any}
          onPress={() => onActivate(id)}
          disabled={isActivating || isSkipping}
        >
          I'm on it
        </Button>
        <Button
          color="ghost"
          onPress={() => onSkip(id)}
          disabled={isActivating || isSkipping}
        >
          Not the right moment
        </Button>
      </View>
    </View>
  );
}
