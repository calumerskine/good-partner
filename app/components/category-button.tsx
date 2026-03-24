import tw from "@/lib/tw";
import { CheckCircle, Circle } from "lucide-react-native";
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
        `bg-${color}-${selected ? 300 : 200} border-black`,
      )}
    >
      <View style={tw`flex-row items-start justify-between mb-2`}>
        <View style={tw`flex-1 pr-4`}>
          <Text style={tw`font-gabarito font-bold text-xl text-ink mb-2`}>
            {text}
          </Text>
          <Text style={tw`font-gabarito text-base text-ink/80`}>
            {description}
          </Text>
        </View>

        <View
          style={tw.style(
            `w-6 h-6 rounded-full border-2 items-center justify-center border-${color}-800`,
            // selected ? `bg-${color} ` : "bg-white",
          )}
        >
          {selected ? <CheckCircle /> : <Circle />}
          {/* {selected && <Text style={tw`text-ink text-sm`}>✓</Text>} */}
        </View>
      </View>
    </Pressable>
  );
};
