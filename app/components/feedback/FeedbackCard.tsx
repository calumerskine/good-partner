import tw from "@/lib/tw";
import { Text, TouchableOpacity, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

interface FeedbackCardProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export default function FeedbackCard({ label, selected, onPress }: FeedbackCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={tw`w-full py-4 px-5 rounded-2xl border-2 ${
        selected ? "bg-mint border-mint" : "bg-white border-grape/20"
      }`}
      activeOpacity={0.7}
    >
      <View style={tw`flex-row items-center justify-between`}>
        <Text
          style={tw`text-lg font-gabarito font-bold ${
            selected ? "text-charcoal" : "text-charcoal/70"
          }`}
        >
          {label}
        </Text>
        {selected && (
          <FontAwesome name="check-circle" size={24} color={tw.color("charcoal")} />
        )}
      </View>
    </TouchableOpacity>
  );
}
