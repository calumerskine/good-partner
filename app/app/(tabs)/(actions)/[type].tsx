import { trackEvent } from "@/lib/analytics";
import { CatalogAction, useGetActionsByCategory } from "@/lib/api";
import { getHexColor } from "@/lib/colors";
import { ActionTypes } from "@/lib/state/actions.model";
import tw from "@/lib/tw";
import Entypo from "@expo/vector-icons/Entypo";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
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
    <SafeAreaView edges={["top"]} style={tw`flex-1 bg-background`}>
      <View style={tw`w-full px-5 py-4 flex-row items-center justify-between`}>
        <Link href=".." asChild>
          <Pressable style={tw`p-3 pl-0`}>
            <Entypo name="chevron-left" size={30} color="charcoal" />
          </Pressable>
        </Link>
        <View style={tw`flex-row items-center gap-2`}>
          <Text
            style={tw`text-4xl text-${category.darkColor} font-gabarito font-black`}
          >
            {category.title}
          </Text>
          <FontAwesome
            name={category.iconName}
            size={30}
            color={getHexColor(category.darkColor)}
          />
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
                style={tw`text-charcoal/60 font-gabarito text-base self-end mb-2`}
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
          <Link href={`/(action)/${item.id}?catalog=true`} asChild>
            <Pressable
              style={tw`bg-mediumGrey rounded-2xl p-6 border-[3px] border-${category.darkColor} shadow-md`}
            >
              <View>
                <View style={tw`flex-row items-center justify-between mb-2`}>
                  <Text
                    style={tw`text-lg font-gabarito font-bold text-black mr-4 leading-1.2`}
                  >
                    {item.title}
                  </Text>
                  <FontAwesome
                    name="chevron-right"
                    size={16}
                    color={getHexColor(category.darkColor)}
                  />
                </View>

                {item.description ? (
                  <Text
                    style={tw`text-base text-charcoal font-gabarito leading`}
                    numberOfLines={3}
                  >
                    {item.description}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          </Link>
        )}
      />
    </SafeAreaView>
  );
}
