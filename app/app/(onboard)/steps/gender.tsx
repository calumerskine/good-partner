import PressableRadio from "@/components/ui/pressable-radio";
import Button from "@/components/ui/button";
import tw from "@/lib/tw";
import { Text, View } from "react-native";

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
    <View style={tw`flex-1 items-center justify-between px-6 pt-3`}>
      <View style={tw`items-center gap-3 flex-1`}>
        <View style={tw`mb-3`}>
          <Text
            style={tw`text-3xl text-ink font-gabarito font-bold text-center mb-2`}
          >
            About you
          </Text>
          <Text style={tw`text-lg text-ink/80 font-gabarito text-center`}>
            This helps us tailor suggestions for you.
          </Text>
        </View>

        <View style={tw`gap-3 min-w-full`}>
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
                <Text
                  style={tw`font-gabarito text-lg text-charcoal font-medium`}
                >
                  {option.label}
                </Text>
              </View>
            </PressableRadio>
          ))}
        </View>
      </View>

      <View style={tw`w-full pt-6 pb-2`}>
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
