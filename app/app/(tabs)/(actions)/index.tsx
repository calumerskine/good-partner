import BauhausSkiaShape from "@/components/shapes/bauhaus-skia-shape";
import { useAuth } from "@/hooks/use-auth";
import { trackEvent } from "@/lib/analytics";
import { useGetActiveActions, useGetUserProfile } from "@/lib/api";
import { getCategoryColors, getHexColor } from "@/lib/colors";
import { ActionTypes } from "@/lib/state/actions.model";
import tw from "@/lib/tw";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ActionsScreen() {
  const { user, signOut } = useAuth();
  const { data: profile } = useGetUserProfile(user?.id);
  const { data: userActions = [], isLoading } = useGetActiveActions(user?.id);

  useFocusEffect(
    useCallback(() => {
      trackEvent("screen_viewed", { screen_name: "Actions" });
    }, []),
  );

  return (
    <SafeAreaView edges={["top"]} style={tw`flex-1 bg-background`}>
      <BauhausSkiaShape
        type="triangle"
        anchor="top-right"
        distance={0.6}
        size={500}
        strokeWidth={6}
        shapeScale={1.2}
        color={getHexColor("peach")}
        opacity={0.2}
        animation="float"
        strokeOnly
      />
      <BauhausSkiaShape
        type="pill"
        anchor="bottom-left"
        distance={0.2}
        size={400}
        strokeWidth={7}
        shapeScale={1.6}
        color={getHexColor("blue")}
        opacity={0.2}
        strokeOnly
      />
      <BauhausSkiaShape
        type="circle"
        anchor="bottom-left"
        distance={1}
        size={600}
        nudge={[-50, -50]}
        strokeWidth={6}
        shapeScale={1.2}
        color={getHexColor("mint")}
        opacity={0.6}
        strokeOnly
      />
      <ScrollView
        style={tw`flex-1 w-full`}
        contentContainerStyle={tw`px-6 pb-8`}
        showsVerticalScrollIndicator={false}
      >
        <View style={tw`pt-6`}>
          <Text style={tw`text-4xl text-black font-gabarito font-black mb-2`}>
            Actions
          </Text>
        </View>

        <Text style={tw`text-lg text-charcoal/70 font-gabarito font mb-4`}>
          Browse by area of focus
        </Text>
        <View style={tw`gap-4 mb-4`}>
          {Object.entries(ActionTypes).map(([key, action]) => (
            <Link href={`/(tabs)/(actions)/${key}`} key={key} asChild>
              <Pressable style={tw``}>
                {/* <LinearGradient
                  colors={[getHexColor("grape"), getHexColor(action.color)]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.85, y: 0.85 }}
                  style={tw`rounded-2xl p-6 pt-5`}
                > */}
                <View
                  style={tw`rounded p-6 border pt-5 bg-${action.title.toLowerCase()}-surface border-b-4 border-${action.title.toLowerCase()}-main`}
                >
                  <View
                    style={tw`absolute flex items-center justify-center right-2 top-2 w-8 h-8`}
                  >
                    <FontAwesome
                      name={action.iconName}
                      size={20}
                      color={getCategoryColors(action.darkColor)}
                    />
                  </View>
                  <View style={tw`gap-2`}>
                    <Text
                      style={tw`text-xl font-gabarito font-black text-${action.title.toLowerCase()}-ink tracking-wider uppercase`}
                    >
                      {action.title}
                    </Text>
                    <Text
                      style={tw`text-base font-gabarito text-charcoal leading-1.2`}
                    >
                      {action.description}
                    </Text>
                  </View>
                </View>
                {/* </LinearGradient> */}
              </Pressable>
            </Link>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
