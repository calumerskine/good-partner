import ActiveActions from "@/components/home/active-actions";
import HomeHeader from "@/components/home/home-header";
import SuggestedActions from "@/components/home/suggested-actions";
import { useAuth } from "@/hooks/use-auth";
import { trackEvent } from "@/lib/analytics";
import {
  useGetActiveActions,
  useGetDailyContent,
  useGetUserProfile,
} from "@/lib/api";
import tw from "@/lib/tw";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const { user } = useAuth();
  const { data: userActions = [], isLoading } = useGetActiveActions(user?.id);
  const { isLoading: isProfileLoading, data: profile } = useGetUserProfile(
    user?.id,
  );

  const dayNumber = profile ? (profile.totalDaysActive ?? 0) + 1 : undefined;
  const { data: dailyContent } = useGetDailyContent(dayNumber);

  useFocusEffect(
    useCallback(() => {
      trackEvent("screen_viewed", { screen_name: "Home" });
    }, []),
  );

  if (isLoading || isProfileLoading) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white`}>
        <ActivityIndicator size="large" color="#2E3130" />
      </View>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={tw`bg-white flex-1`}>
      <ScrollView
        contentContainerStyle={tw`px-6 flex-grow`}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader
          dayNumber={dayNumber ?? 1}
          headlineMessage={dailyContent?.headlineMessage ?? "Everyone starts here"}
        />

        {userActions.length > 0 ? (
          <ActiveActions isLoading={isLoading} userActions={userActions} />
        ) : null}

        <SuggestedActions user={user} profile={profile} isLoading={isLoading} />
      </ScrollView>
    </SafeAreaView>
  );
}
