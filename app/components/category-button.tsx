import tw from "@/lib/tw";
import { Pressable, Text, View } from "react-native";

export const CategoryButton = ({
  text,
  description,
  category,
  color,
  onPress,
  selected,
}: {
  text: string;
  description: string;
  category: string;
  color: string;
  onPress: (category: string) => void;
  selected?: boolean;
}) => {
  return (
    <Pressable
      onPress={() => onPress(category)}
      style={tw.style(
        `rounded-2xl p-6 border-2 mb-4`,
        `bg-${color}/20 border-${color}`,
      )}
    >
      <View style={tw`flex-row items-start justify-between mb-2`}>
        <View style={tw`flex-1 pr-4`}>
          <Text style={tw`font-gabarito font-bold text-xl text-charcoal mb-2`}>
            {text}
          </Text>
          <Text style={tw`font-gabarito text-sm text-charcoal/80`}>
            {description}
          </Text>
        </View>

        <View
          style={tw.style(
            `w-6 h-6 rounded-full border-2 items-center justify-center border-${color}`,
            selected ? `bg-${color} ` : "bg-background",
          )}
        >
          {selected && <Text style={tw`text-black text-sm`}>✓</Text>}
        </View>
      </View>
    </Pressable>
  );
};
