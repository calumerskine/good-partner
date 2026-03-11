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
      activeOpacity={0.8}
      style={tw`w-full py-4 px-5 rounded-2xl border-2 ${
        selected 
          ? "bg-mint border-mint shadow-md shadow-charcoal/30" 
          : "bg-white border-grape/20 shadow-md shadow-charcoal/10"
      }`}
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
