import PressableCard from "@/components/ui/pressable-card";
import { useAuth } from "@/hooks/use-auth";
import { trackEvent } from "@/lib/analytics";
import { useGetActiveActions } from "@/lib/api";
import { ActionTypes } from "@/lib/state/actions.model";
import tw from "@/lib/tw";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { Animated, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ActionsScreen() {
  const { user } = useAuth();
  const { data: userActions = [], isLoading } = useGetActiveActions(user?.id);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, []);

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
        <Animated.View style={[tw`pt-6`, { opacity: fadeAnim }]}>
          <Text style={tw`text-4xl text-black font-gabarito font-black mb-2`}>
            Actions
          </Text>
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
                <View style={tw`px-6 py-4`}>
                  <View style={tw`flex-row items-center gap-2`}>
                    <Text
                      style={tw`text-3xl text-ink font-gabarito font-medium`}
                    >
                      {action.title}
                    </Text>
                    {action.icon({ style: tw`text-${action.color}-600` })}
                  </View>
                  <View style={tw`mt-2`}>
                    <Text
                      style={tw`text-base font-gabarito text-ink/90 leading-1.2`}
                    >
                      {action.description}
                    </Text>
                  </View>
                </View>
              </PressableCard>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
