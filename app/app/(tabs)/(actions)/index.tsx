import PressableCard from "@/components/ui/pressable-card";
import { useAuth } from "@/hooks/use-auth";
import { trackEvent } from "@/lib/analytics";
import { useGetActiveActions, useGetUserProfile } from "@/lib/api";
import { ActionTypes } from "@/lib/state/actions.model";
import tw from "@/lib/tw";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { ScrollView, Text, View } from "react-native";
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
    <SafeAreaView edges={["top"]} style={tw`flex-1 bg-white`}>
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

        <Text style={tw`text-lg text-ink/70 font-gabarito font mb-4`}>
          Browse by area of focus
        </Text>
        <View style={tw`gap-4 mb-4`}>
          {Object.entries(ActionTypes).map(([key, action]) => (
            <PressableCard
              key={key}
              href={`/(tabs)/(actions)/${key}`}
              color={action.color}
              shade={200}
            >
              {/* <LinearGradient
                  colors={[getHexColor("grape"), getHexColor(action.color)]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.85, y: 0.85 }}
                  style={tw`rounded-2xl p-6 pt-5`}
                > */}
              <View style={tw`px-6 py-4`}>
                <View style={tw`flex-row items-center gap-2`}>
                  <Text
                    style={tw`text-3xl text-${action.darkColor} font-gabarito font-medium`}
                  >
                    {action.title}
                  </Text>
                  {action.icon()}
                </View>
                <View style={tw`mt-2`}>
                  <Text
                    style={tw`text-base font-gabarito text-ink/90 leading-1.2`}
                  >
                    {action.description}
                  </Text>
                </View>
              </View>
              {/* </LinearGradient> */}
            </PressableCard>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
