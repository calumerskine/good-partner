import ActiveActions from "@/components/home/active-actions";
import HomeHeader from "@/components/home/home-header";
import SuggestedActions from "@/components/home/suggested-actions";
import ActionReminderSheet from "@/components/reminders/action-reminder-sheet";
import { useAuth } from "@/hooks/use-auth";
import { trackEvent } from "@/lib/analytics";
import {
  useGetActiveActions,
  useGetDailyContent,
  useGetUserProfile,
} from "@/lib/api";
import tw from "@/lib/tw";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const { user } = useAuth();
  const { data: userActions = [], isLoading } = useGetActiveActions(user?.id);
  const { isLoading: isProfileLoading, data: profile } = useGetUserProfile(
    user?.id,
  );
  const [reminderSheetActionId, setReminderSheetActionId] = useState<string | null>(null);
  const reminderSheetAction = userActions.find((a) => a.id === reminderSheetActionId) ?? null;

  const dayNumber = profile ? (profile.totalDaysActive ?? 1) : undefined;
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
    <SafeAreaView edges={["top"]} style={tw`bg-white flex-1 px-6`}>
      <HomeHeader dayNumber={dayNumber ?? 1} />
      {/* Daily message */}
      <Text
        style={tw`text-xl font-gabarito text-charcoal mt-3 mb-5`}
        numberOfLines={1}
      >
        {dailyContent?.headlineMessage ?? "Everyone starts here"}
      </Text>
      {userActions.length > 0 ? (
        <ActiveActions
          isLoading={isLoading}
          userActions={userActions}
          onRemind={setReminderSheetActionId}
        />
      ) : (
        <SuggestedActions
          user={user}
          profile={profile}
          isLoading={isLoading}
        />
      )}
      {reminderSheetAction && (
        <ActionReminderSheet
          userActionId={reminderSheetAction.id}
          currentReminderAt={reminderSheetAction.reminderAt}
          onClose={() => setReminderSheetActionId(null)}
        />
      )}
    </SafeAreaView>
  );
}
