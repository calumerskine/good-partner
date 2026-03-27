import PressableCard from "@/components/ui/pressable-card";
import { useMountAnimation } from "@/hooks/animations";
import { useAuth } from "@/hooks/use-auth";
import { trackEvent } from "@/lib/analytics";
import { useGetActiveActions, useGetUserProfile } from "@/lib/api";
import { ActionTypes } from "@/lib/state/actions.model";
import tw from "@/lib/tw";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { Animated, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function AnimatedCard({
  delay,
  children,
}: {
  delay: number;
  children: React.ReactNode;
}) {
  const anim = useMountAnimation({
    fromOpacity: 0,
    fromTranslateY: 10,
    duration: 280,
    delay,
  });
  return <Animated.View style={anim.animatedStyle}>{children}</Animated.View>;
}

export default function ActionsScreen() {
  const { user, signOut } = useAuth();
  const { data: profile } = useGetUserProfile(user?.id);
  const { data: userActions = [], isLoading } = useGetActiveActions(user?.id);

  const titleAnim = useMountAnimation({
    fromOpacity: 0,
    fromTranslateY: 10,
    duration: 280,
    delay: 0,
  });
  const subtitleAnim = useMountAnimation({
    fromOpacity: 0,
    fromTranslateY: 10,
    duration: 280,
    delay: 80,
  });

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
        <Animated.View style={[tw`pt-6`, titleAnim.animatedStyle]}>
          <Text style={tw`text-4xl text-black font-gabarito font-black mb-2`}>
            Actions
          </Text>
        </Animated.View>

        <Animated.View style={subtitleAnim.animatedStyle}>
          <Text style={tw`text-lg text-ink/70 font-gabarito font mb-4`}>
            Browse by area of focus
          </Text>
        </Animated.View>
        <View style={tw`gap-4 mb-4`}>
          {Object.entries(ActionTypes).map(([key, action], index) => (
            <AnimatedCard key={key} delay={160 + index * 60}>
              <PressableCard
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
                    {action.icon({ style: tw`text-ink/80` })}
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
            </AnimatedCard>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
