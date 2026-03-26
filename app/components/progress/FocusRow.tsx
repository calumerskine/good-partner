import { getHexColor } from "@/lib/colors";
import { ActionTypes } from "@/lib/state/actions.model";
import tw from "@/lib/tw";
import { MotiView } from "moti";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import PressableCard from "../ui/pressable-card";

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

  const renderCard = (
    cat: CategoryCompletion,
    index: number,
    cardStyle?: object,
  ) => {
    const actionType = ActionTypes[CATEGORY_MAP[cat.categoryKey]];
    const darkColorHex = getHexColor(actionType.darkColor);
    const category = ActionTypes[CATEGORY_MAP[cat.categoryKey]];

    return (
      <MotiView
        key={cat.categoryKey}
        style={cardStyle}
        from={{ opacity: 0, scale: 0.95 }}
        animate={{
          opacity: animated ? 1 : 0,
          scale: animated ? 1 : 0.95,
        }}
        transition={{ delay: index * 100, duration: 300 }}
      >
        <PressableCard color={category.color} shade={100}>
          <View style={tw`p-4`}>
            <View
              style={tw`flex flex-row-reverse justify-between items-center`}
            >
              <View>{category.icon({ size: 26 })}</View>
              <Text style={tw`text-xl text-ink font-gabarito font-bold`}>
                {actionType.title}
              </Text>
            </View>

            <Text
              style={[
                tw`text-5xl font-gabarito font-black pt-4 text-${category.color}-500`,
              ]}
            >
              {cat.totalCompletions}
            </Text>
          </View>
        </PressableCard>
      </MotiView>
    );
  };

  const cards = categories.map((cat, index) => renderCard(cat, index));

  if (vertical) {
    const rows: CategoryCompletion[][] = [];
    for (let i = 0; i < categories.length; i += 2) {
      rows.push(categories.slice(i, i + 2));
    }
    return (
      <View style={tw`gap-3`}>
        {rows.map((pair, rowIndex) => (
          <View key={rowIndex} style={tw`flex-row gap-3`}>
            {pair.map((cat, colIndex) =>
              renderCard(cat, rowIndex * 2 + colIndex, tw`flex-1`),
            )}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={tw`mb-6`}>
      <Text style={tw`text-lg text-ink font-gabarito font-bold mb-3 px-1`}>
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
