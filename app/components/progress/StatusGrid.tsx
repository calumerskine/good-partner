import { getHexColor } from "@/lib/colors";
import { ActionTypes } from "@/lib/state/actions.model";
import tw from "@/lib/tw";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { MotiView } from "moti";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

type CategoryCompletion = {
  categoryKey: string;
  totalCompletions: number;
  hasActivityToday: boolean;
};

type StatusGridProps = {
  categories: CategoryCompletion[];
};

const CATEGORY_MAP: Record<string, keyof typeof ActionTypes> = {
  ATTENTION: "ATTENTION",
  AFFECTION: "AFFECTION",
  INITIATIVE: "INITIATIVE",
  REPAIR: "REPAIR",
};

export function StatusGrid({ categories }: StatusGridProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (categories.length === 0) {
    return (
      <View style={tw`flex-1 items-center justify-center py-12`}>
        <Text style={tw`text-charcoal/50 font-gabarito text-center`}>
          All categories are focus areas!
        </Text>
      </View>
    );
  }

  return (
    <View style={tw`mb-6 flex-1`}>
      <Text style={tw`text-lg text-charcoal font-gabarito font-bold mb-3 px-1`}>
        Status
      </Text>
      <View style={tw`flex-row flex-wrap gap-3 px-1`}>
        {categories.map((cat, index) => {
          const actionType = ActionTypes[CATEGORY_MAP[cat.categoryKey]];
          const isActive = cat.hasActivityToday;

          return (
            <MotiView
              key={cat.categoryKey}
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: animated ? 1 : 0, scale: animated ? 1 : 0.9 }}
              transition={{ delay: index * 80, duration: 300 }}
              style={[
                tw`w-[47%] rounded-2xl p-4 border border-mediumGrey`,
                { aspectRatio: 1 },
              ]}
            >
              <FontAwesome
                name={actionType.iconName as any}
                size={28}
                color={isActive ? getHexColor(actionType.darkColor) : "#9CA3AF"}
              />

              <Text style={tw`text-4xl font-gabarito font-black text-charcoal mt-2 mb-1`}>
                {cat.totalCompletions}
              </Text>
              <Text style={tw`text-xs text-charcoal/60 font-gabarito`}>
                Total Actions
              </Text>

              {isActive && (
                <View style={tw`absolute bottom-3 right-3 w-2 h-2 rounded-full bg-green-500`} />
              )}
            </MotiView>
          );
        })}
      </View>
    </View>
  );
}
