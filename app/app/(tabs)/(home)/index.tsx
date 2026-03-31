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
import { useCallback, useState } from "react";
import { ActivityIndicator, Animated, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const { user } = useAuth();
  const { data: userActions = [], isLoading } = useGetActiveActions(user?.id);
  const { isLoading: isProfileLoading, data: profile } = useGetUserProfile(
    user?.id,
  );
  const [reminderSheetActionId, setReminderSheetActionId] = useState<string | null>(null);
  const reminderSheetAction = userActions.find((a) => a.id === reminderSheetActionId) ?? null;
  const { data: todayCompletedAction = null, isLoading: isTodayLoading } =
    useGetTodayCompletedAction(user?.id);
  const [showSuggestedFlow, setShowSuggestedFlow] = useState(false);

  const dayNumber = profile ? (profile.totalDaysActive ?? 1) : undefined;
  const { data: dailyContent } = useGetDailyContent(dayNumber);

  const headerAnim = useMountAnimation({ fromOpacity: 0, fromTranslateY: 8, duration: 250, delay: 0 });
  const headlineAnim = useMountAnimation({ fromOpacity: 0, fromTranslateY: 8, duration: 250, delay: 80 });

  useFocusEffect(
    useCallback(() => {
      trackEvent("screen_viewed", { screen_name: "Home" });
    }, []),
  );

  if (isLoading || isProfileLoading || (isTodayLoading && userActions.length === 0)) {
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
        >
          {dailyContent?.headlineMessage ?? "Everyone starts here"}
        </Text>
      </Animated.View>
      {showSuggestedFlow ? (
        <SuggestedActions
          user={user}
          profile={profile}
          isLoading={isLoading}
        />
      ) : userActions.length > 0 ? (
        <ActiveActions
          isLoading={isLoading}
          userActions={userActions}
          onRemind={setReminderSheetActionId}
        />
      ) : todayCompletedAction ? (
        <CompletedAction
          action={todayCompletedAction}
          streakDays={profile?.currentStreakDays ?? 0}
          onDoAnother={() => setShowSuggestedFlow(true)}
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
