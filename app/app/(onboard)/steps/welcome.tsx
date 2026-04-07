import Button from "@/components/ui/button";
import tw from "@/lib/tw";
import { Text, View } from "react-native";

type Props = {
  onNext: () => void;
};

export function WelcomeStep({ onNext }: Props) {
  return (
    <View style={tw`flex-1 items-center justify-between px-6 pt-12`}>
      {/* <View style={tw`flex-1`} /> */}

      <View style={tw`items-center gap-8 px-4`}>
        <View
          style={tw`w-32 h-32 rounded-full bg-indigo-100 items-center justify-center mb-4`}
        >
          <Text style={tw`text-6xl`}>✨</Text>
        </View>

        <View style={tw`items-center gap-4`}>
          <Text
            style={tw`text-5xl text-ink font-gabarito font-black text-center leading-tight`}
          >
            Welcome to{"\n"}The Good Partner
          </Text>
          <Text
            style={tw`text-xl text-ink/80 font-gabarito text-center leading-relaxed px-6`}
          >
            Your partner in building stronger relationships through thoughtful
            actions
          </Text>
        </View>
      </View>

      {/* <View style={tw`flex-1`} /> */}

      <View style={tw`w-full gap-4 pt-6 pb-2`}>
        <Button onPress={onNext}>Get Started</Button>
      </View>
    </View>
  );
}
