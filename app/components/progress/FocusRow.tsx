import { ActionTypes } from "@/lib/state/actions.model";
import { getHexColor } from "@/lib/colors";
import tw from "@/lib/tw";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { MotiView } from "moti";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";

type CategoryCompletion = {
  categoryKey: string;
  totalCompletions: number;
};

type FocusRowProps = {
  categories: CategoryCompletion[];
};

const CATEGORY_MAP: Record<string, keyof typeof ActionTypes> = {
  ATTENTION: "ATTENTION",
  AFFECTION: "AFFECTION",
  INITIATIVE: "INITIATIVE",
  REPAIR: "REPAIR",
};

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function FocusRow({ categories }: FocusRowProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (categories.length === 0) {
    return null;
  }

  return (
    <View style={tw`mb-6`}>
      <Text style={tw`text-lg text-charcoal font-gabarito font-bold mb-3 px-1`}>
        Focus Areas
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw`gap-3 px-1`}
        snapToInterval={280}
        decelerationRate="fast"
      >
        {categories.map((cat, index) => {
          const actionType = ActionTypes[CATEGORY_MAP[cat.categoryKey]];
          const lightColorHex = getHexColor(actionType.lightColor);
          const darkColorHex = getHexColor(actionType.darkColor);
          const colorHex = getHexColor(actionType.color);

          return (
            <MotiView
              key={cat.categoryKey}
              from={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: animated ? 1 : 0, scale: animated ? 1 : 0.95 }}
              transition={{ delay: index * 100, duration: 300 }}
              style={[
                tw`w-64 rounded-2xl p-5 border-2`,
                {
                  backgroundColor: hexToRgba(lightColorHex, 0.15),
                  borderColor: colorHex,
                  shadowColor: colorHex,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 3,
                },
              ]}
            >
              <View
                style={[
                  tw`absolute top-3 right-3 w-6 h-6 rounded-full items-center justify-center`,
                  { backgroundColor: darkColorHex },
                ]}
              >
                <FontAwesome name="bullseye" size={11} color="white" />
              </View>

              <View style={tw`mb-3`}>
                <Text style={tw`text-4xl`}>{actionType.icon}</Text>
              </View>

              <Text style={tw`text-xl text-charcoal font-gabarito font-bold mb-1`}>
                {actionType.title}
              </Text>

              <Text
                style={[
                  tw`text-5xl font-gabarito font-black mb-1`,
                  { color: darkColorHex },
                ]}
              >
                {cat.totalCompletions}
              </Text>
              <Text style={tw`text-sm text-charcoal/60 font-gabarito mb-3`}>
                Total Actions
              </Text>

              <View style={tw`flex-row items-center gap-1`}>
                <View
                  style={[tw`w-2 h-2 rounded-full`, { backgroundColor: colorHex }]}
                />
                <Text style={tw`text-xs text-charcoal/70 font-gabarito font-medium`}>
                  Main Focus
                </Text>
              </View>
            </MotiView>
          );
        })}
      </ScrollView>
    </View>
  );
}
