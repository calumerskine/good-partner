import tw from "@/lib/tw";
import { View } from "react-native";

export default function Avatar({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={tw`bg-peach rounded-full w-50 h-50 items-center justify-center`}
    >
      {children}
    </View>
  );
}
