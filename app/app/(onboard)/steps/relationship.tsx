import PressableRadio from "@/components/ui/pressable-radio";
import Button from "@/components/ui/button";
import tw from "@/lib/tw";
import { Text, View } from "react-native";

const OPTIONS = [
  { value: "great", label: "Really good, I just want to keep growing" },
  { value: "distance", label: "Mostly solid, but I sense some distance" },
  { value: "rough", label: "We're going through a rough patch" },
  { value: "crisis", label: "We've had a real crisis recently" },
];

type Props = {
  selected: string | null;
  onSelect: (value: string) => void;
  onNext: () => void;
};

export function RelationshipStep({ selected, onSelect, onNext }: Props) {
  return (
    <View style={tw`flex-1 items-center justify-between px-6 pt-3`}>
      <View style={tw`items-center gap-3 flex-1`}>
        <Text
          style={tw`text-3xl text-ink font-gabarito font-bold mb-3 leading-tight text-center`}
        >
          How would you describe your relationship right now?
        </Text>

        <View style={tw`gap-3`}>
          {OPTIONS.map((option) => (
            <PressableRadio
              key={option.value}
              selected={selected === option.value}
              onPress={() => onSelect(option.value)}
              colorMode="selected"
              color="green"
              shade={300}
              pressDepth={6}
            >
              <View style={tw`p-5`}>
                <Text style={tw`font-gabarito text-lg text-ink font-medium`}>
                  {option.label}
                </Text>
              </View>
            </PressableRadio>
          ))}
        </View>
      </View>

      <View style={tw`w-full pt-6 pb-2`}>
        <Button onPress={onNext} disabled={!selected}>
          Continue
        </Button>
        <View style={tw`h-5 mt-2`}>
          {!selected && (
            <Text style={tw`text-ink/80 font-gabarito text-center`}>
              Please select an option to continue
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
