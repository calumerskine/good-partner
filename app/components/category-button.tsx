import tw from "@/lib/tw";
import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import PressableRadio from "./ui/pressable-radio";
import { Check } from "lucide-react-native";

const fallbackColor = "#e5e7eb";

function twColor(name: string): string {
  return tw.color(name) ?? fallbackColor;
}

export const CategoryButton = ({
  text,
  description,
  category,
  color,
  onPress,
  selected,
}: {
  text: string;
  description: string;
  category: string;
  color: string;
  onPress: (category: string) => void;
  selected?: boolean;
}) => {
  const progress = useSharedValue(selected ? 1 : 0);

  const borderColorSelected = twColor(`${color}-300`);
  const circleBgUnselected = twColor(`${color}-200`);
  const circleBgSelected = twColor(`${color}-500`);

  useEffect(() => {
    progress.value = withTiming(selected ? 1 : 0, { duration: 150 });
  }, [selected]);

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [fallbackColor, borderColorSelected],
    ),
  }));

  const animatedCircleStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [circleBgUnselected, circleBgSelected],
    ),
  }));

  const animatedCheckStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  return (
    <PressableRadio
      onPress={() => {
        onPress(category);
      }}
      selected={selected ?? false}
      shade={300}
      deepFactor={1}
    >
      <Animated.View style={[tw`p-6 border rounded-2xl`, animatedBorderStyle]}>
        {/* <View
          style={tw`bg-${color}-300 rounded-lg flex flex-row items-center px-3 py-1`}
        >
          <Text style={tw`uppercase font-gabarito font-medium mr-2 text-sm`}>
            {category}
          </Text>
        </View> */}
        <View style={tw`flex-row items-start justify-between`}>
          <View style={tw`flex-1 pr-4`}>
            <Text style={tw`font-gabarito font-bold text-xl text-ink/70 mb-2`}>
              {text}
            </Text>
            <Text style={tw`font-gabarito text-base text-ink/80`}>
              {description}
            </Text>
          </View>
          <Animated.View
            style={[
              tw`w-9 h-9 rounded-full items-center justify-center`,
              animatedCircleStyle,
            ]}
          >
            <Animated.View style={animatedCheckStyle}>
              <Check size={24} style={tw`text-${color}-100`} />
            </Animated.View>
          </Animated.View>
        </View>
      </Animated.View>
    </PressableRadio>
  );
};
