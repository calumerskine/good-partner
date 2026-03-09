import tw from "@/lib/tw";
import { View } from "react-native";

export default function Form({ children }: { children: React.ReactNode }) {
  return <View style={tw`flex-1 gap-4 w-full`}>{children}</View>;
}
