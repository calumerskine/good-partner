import PressableRadio from "@/components/ui/pressable-radio";
import Button from "@/components/ui/button";
import tw from "@/lib/tw";
import { ScrollView, Text, View } from "react-native";

const OPTIONS = [
  { value: "man", label: "Man" },
  { value: "woman", label: "Woman" },
  { value: "nonbinary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

type Props = {
  selected: string | null;
  onSelect: (value: string) => void;
  onNext: () => void;
  isSubmitting?: boolean;
};

export function GenderStep({
  selected,
  onSelect,
  onNext,
  isSubmitting,
}: Props) {
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
            About you
          </Text>
          <Text
            style={tw`text-lg text-charcoal/80 font-gabarito leading-relaxed`}
          >
            This helps us tailor suggestions for you.
          </Text>
        </View>

        <View style={tw`gap-3`}>
          {OPTIONS.map((option) => (
            <PressableRadio
              key={option.value}
              selected={selected === option.value}
              onPress={() => onSelect(option.value)}
              color="indigo"
              colorMode="selected"
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
        <Button onPress={onNext} disabled={!selected || isSubmitting}>
          {isSubmitting ? "Setting up..." : "Continue"}
        </Button>
        <View style={tw`h-5 mt-2`}>
          {!selected && (
            <Text style={tw`text-charcoal/80 font-gabarito text-center`}>
              Please select an option to continue
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
