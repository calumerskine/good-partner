import BackButton from "@/components/ui/back-button";
import PressableCard from "@/components/ui/pressable-card";
import { trackEvent } from "@/lib/analytics";
import { CatalogAction, useGetActionsByCategory } from "@/lib/api";
import { ActionTypes } from "@/lib/state/actions.model";
import tw from "@/lib/tw";
import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ActionTypeScreen() {
  const { type } = useLocalSearchParams<{ type: keyof typeof ActionTypes }>();
  const { data: actions = [], isLoading } = useGetActionsByCategory(type);
  const category = ActionTypes[type];

  useEffect(() => {
    trackEvent("screen_viewed", { screen_name: "Category", category: type });
    trackEvent("category_viewed", { category: type });
  }, [type]);

  return (
    <SafeAreaView edges={["top"]} style={tw`flex-1 bg-white`}>
      <View style={tw`w-full px-5 py-4 flex-row items-center justify-between`}>
        <BackButton />
        <View style={tw`flex-row items-center gap-2`}>
          <Text
            style={tw`text-4xl text-${category.darkColor} font-gabarito font-black`}
          >
            {category.title}
          </Text>

          {category.icon({ size: 30 })}
        </View>
      </View>

      <FlatList
        data={actions}
        style={tw`flex-1 w-full`}
        contentContainerStyle={tw`px-6 pb-8`}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={tw`px-2`}>
            <Text
              style={tw`text-lg text-charcoal font-gabarito leading-relaxed mb-3`}
            >
              {category.description}
            </Text>

            {!isLoading && actions.length > 0 && (
              <Text
                style={tw`text-charcoal/60 font-gabarito text-base mb-3 mt-2`}
              >
                {actions.length} {actions.length === 1 ? "action" : "actions"}{" "}
                available
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={tw`py-12 items-center`}>
              <Text style={tw`text-white/70 font-gabarito text-lg`}>
                Loading...
              </Text>
            </View>
          ) : (
            <View style={tw`py-12 items-center px-6`}>
              <Text style={tw`text-5xl mb-6`}>🤔</Text>
              <Text
                style={tw`text-2xl text-white font-gabarito font-bold mb-3 text-center`}
              >
                No actions yet
              </Text>
              <Text
                style={tw`text-base text-white/70 font-gabarito text-center`}
              >
                Check back soon for new actions in this category.
              </Text>
            </View>
          )
        }
        ItemSeparatorComponent={() => <View style={tw`h-4`} />}
        renderItem={({ item }: { item: CatalogAction }) => (
          <PressableCard
            href={`/(action)/${item.id}?catalog=true`}
            color={category.color}
            shade={200}
          >
            <View style={tw`p-5`}>
              <Text
                style={tw`text-lg font-gabarito font-bold text-ink mr-4 leading-loose`}
              >
                {item.title}
              </Text>

              {item.description ? (
                <Text
                  style={tw`text-base text-ink/80 font-gabarito leading mt-1`}
                  numberOfLines={3}
                >
                  {item.description}
                </Text>
              ) : null}
            </View>
          </PressableCard>
        )}
      />
    </SafeAreaView>
  );
}
