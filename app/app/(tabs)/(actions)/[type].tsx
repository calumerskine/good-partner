import BauhausSkiaShape from "@/components/shapes/bauhaus-skia-shape";
import { trackEvent } from "@/lib/analytics";
import { CatalogAction, useGetActionsByCategory } from "@/lib/api";
import { getHexColor } from "@/lib/colors";
import { ActionTypes } from "@/lib/state/actions.model";
import tw from "@/lib/tw";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
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
          <Pressable>
            <View style={tw`bg-charcoal rounded-full p-2 inline-flex`}>
              <ArrowLeft size={20} style={tw`text-white`} />
            </View>
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
          <Link href={`/(action)/${item.id}?catalog=true`} asChild>
            <Pressable
              style={tw`bg-${category.lightColor}/40 rounded-xl p-4 overflow-hidden relative`}
            >
              <BauhausSkiaShape
                seed={item.id}
                type="hexagon"
                color={getHexColor(category.color)}
                distance={0.7}
                opacity={0.3}
                shapeScale={0.7}
              />
              <BauhausSkiaShape
                seed={item.id}
                type="pill"
                color={getHexColor(category.color)}
                anchor="bottom-left"
                distance={1}
                opacity={0.2}
                shapeScale={0.7}
              />
              <View style={tw`flex`}>
                <Text
                  style={tw`text-lg font-gabarito font-bold text-charcoal mr-4 leading-loose`}
                >
                  {item.title}
                </Text>

                {item.description ? (
                  <Text
                    style={tw`text-base text-charcoal/80 font-gabarito leading`}
                    numberOfLines={3}
                  >
                    {item.description}
                  </Text>
                ) : null}
                {/* <View
                  style={tw`bg-${category.color} rounded-full p-2 inline-flex mt-6`}
                >
                  <ArrowRight size={20} />
                </View> */}
              </View>
            </Pressable>
          </Link>
        )}
      />
    </SafeAreaView>
  );
}
