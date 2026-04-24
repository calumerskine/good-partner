import ActiveActions from "@/components/home/active-actions";
import HomeHeader from "@/components/home/home-header";
import CompletedAction from "@/components/home/completed-action";
import SuggestedActions from "@/components/home/suggested-actions";
import ActionReminderSheet from "@/components/reminders/action-reminder-sheet";
import { useAuth } from "@/hooks/use-auth";
import { trackEvent } from "@/lib/analytics";
import {
  useGetActiveActions,
  useGetDailyContent,
  useGetTodayCompletedAction,
  useGetUserProfile,
} from "@/lib/api";
import tw from "@/lib/tw";
import { useMountAnimation } from "@/hooks/animations";
import { useFocusEffect } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { ActivityIndicator, Animated, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: userActions = [], isLoading } = useGetActiveActions(user?.id);
  const { isLoading: isProfileLoading, data: profile } = useGetUserProfile(
    user?.id,
  );
  const [reminderSheetActionId, setReminderSheetActionId] = useState<
    string | null
  >(null);
  const reminderSheetAction =
    userActions.find((a) => a.id === reminderSheetActionId) ?? null;
  const { data: todayCompletedAction = null, isLoading: isTodayLoading } =
    useGetTodayCompletedAction(user?.id);
  const [showSuggestedFlow, setShowSuggestedFlow] = useState(false);

  const dayNumber = profile ? Math.max(1, profile.totalDaysActive) : undefined;
  const { data: dailyContent } = useGetDailyContent(dayNumber);

  const headerAnim = useMountAnimation({
    fromOpacity: 0,
    fromTranslateY: 8,
    duration: 250,
    delay: 0,
  });
  const headlineAnim = useMountAnimation({
    fromOpacity: 0,
    fromTranslateY: 8,
    duration: 250,
    delay: 0,
  });

  useFocusEffect(
    useCallback(() => {
      trackEvent("screen_viewed", { screen_name: "Home" });
      // Invalidate today's completed action on every focus so stale data from
      // a previous day never persists when the app is backgrounded overnight.
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ["todayCompletedAction"] });
      }
    }, [queryClient, user?.id]),
  );

  if (
    isLoading ||
    isProfileLoading ||
    (isTodayLoading && userActions.length === 0)
  ) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white`}>
        <ActivityIndicator size="large" color="#2E3130" />
      </View>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={tw`bg-white flex-1 px-6`}>
      <Animated.View style={headerAnim.animatedStyle}>
        <HomeHeader dayNumber={dayNumber ?? 1} />
      </Animated.View>
      {/* Daily message */}
      <Animated.View style={headlineAnim.animatedStyle}>
        <Text
          style={tw`text-xl font-gabarito text-charcoal mt-3 mb-5`}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
        >
          {dailyContent?.headlineMessage ?? "Everyone starts here"}
        </Text>
      </Animated.View>
      {userActions.length > 0 ? (
        <ActiveActions
          isLoading={isLoading}
          userActions={userActions.slice(0, 1)}
          onRemind={setReminderSheetActionId}
        />
      ) : showSuggestedFlow || !todayCompletedAction ? (
        <SuggestedActions user={user} profile={profile} isLoading={isLoading} />
      ) : (
        <CompletedAction
          action={todayCompletedAction}
          streakDays={profile?.currentStreakDays ?? 0}
          onDoAnother={() => setShowSuggestedFlow(true)}
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
