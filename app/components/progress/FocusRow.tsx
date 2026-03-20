import { getHexColor } from "@/lib/colors";
import { ActionTypes } from "@/lib/state/actions.model";
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
  vertical?: boolean;
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

export function FocusRow({ categories, vertical = false }: FocusRowProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (categories.length === 0) {
    return null;
  }

  const cards = categories.map((cat, index) => {
    const actionType = ActionTypes[CATEGORY_MAP[cat.categoryKey]];
    const lightColorHex = getHexColor(actionType.lightColor);
    const darkColorHex = getHexColor(actionType.darkColor);
    const colorHex = getHexColor(actionType.color);

    return (
      <MotiView
        key={cat.categoryKey}
        from={{ opacity: 0, scale: 0.95 }}
        animate={{
          opacity: animated ? 1 : 0,
          scale: animated ? 1 : 0.95,
        }}
        transition={{ delay: index * 100, duration: 300 }}
        style={[
          vertical ? tw`w-full rounded-2xl p-5 border-2` : tw`w-64 rounded-2xl p-5 border-2`,
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
          style={tw`flex flex-row-reverse justify-between items-baseline`}
        >
          <View style={[tw``]}>
            <FontAwesome
              name={ActionTypes[CATEGORY_MAP[cat.categoryKey]].iconName}
              size={24}
              color={getHexColor(
                ActionTypes[CATEGORY_MAP[cat.categoryKey]].darkColor,
              )}
            />
          </View>
          <Text
            style={tw`text-xl text-charcoal font-gabarito font-bold mb-3`}
          >
            {actionType.title}
          </Text>
        </View>

        <Text
          style={[
            tw`text-5xl font-gabarito font-black mb-2`,
            { color: darkColorHex },
          ]}
        >
          {cat.totalCompletions}
        </Text>
        <Text style={tw`text-sm text-charcoal/60 font-gabarito mb-1`}>
          Actions Completed
        </Text>
      </MotiView>
    );
  });

  if (vertical) {
    return (
      <View style={tw`gap-3`}>
        {cards}
      </View>
    );
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
        {cards}
      </ScrollView>
    </View>
  );
}
