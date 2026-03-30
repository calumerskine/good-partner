import PressableRadio from "@/components/ui/pressable-radio";
import Button from "@/components/ui/button";
import tw from "@/lib/tw";
import { ScrollView, Text, View } from "react-native";

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
    <View style={tw`flex-1`}>
      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-6 pt-6 pb-4`}
        showsVerticalScrollIndicator={false}
      >
        <View style={tw`mb-8`}>
          <Text
            style={tw`text-4xl text-charcoal font-gabarito font-black mb-3 leading-tight`}
          >
            How would you describe your relationship right now?
          </Text>
        </View>

        <View style={tw`gap-3`}>
          {OPTIONS.map((option) => (
            <PressableRadio
              key={option.value}
              selected={selected === option.value}
              onPress={() => onSelect(option.value)}
              color="indigo"
              showColor
              shade={100}
            >
              <View style={tw`p-5`}>
                <Text
                  style={tw`font-gabarito text-lg text-charcoal font-medium`}
                >
                  {option.label}
                </Text>
              </View>
            </PressableRadio>
          ))}
        </View>
      </ScrollView>

      <View style={tw`p-6 pb-2`}>
        <Button onPress={onNext} disabled={!selected}>
          Continue
        </Button>
      </View>
    </View>
  );
}
