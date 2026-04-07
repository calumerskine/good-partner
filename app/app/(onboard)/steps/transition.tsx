import Button from "@/components/ui/button";
import tw from "@/lib/tw";
import { Text, View } from "react-native";

type Props = {
  onNext: () => void;
};

export function TransitionStep({ onNext }: Props) {
  return (
    <View style={tw`flex-1 items-center justify-between px-6 pt-20`}>
      <View style={tw`items-center gap-6 px-4`}>
        <Text style={tw`text-4xl text-ink font-gabarito font-bold text-center`}>
          Three quick questions to make this yours.
        </Text>
        <Text
          style={tw`text-xl text-ink/80 font-gabarito text-center leading-relaxed`}
        >
          Takes less than a minute. 👉
        </Text>
      </View>

      <View style={tw`flex-1`} />

      <View style={tw`w-full pt-6 pb-2`}>
        <Button onPress={onNext}>Continue</Button>
      </View>
    </View>
  );
}
