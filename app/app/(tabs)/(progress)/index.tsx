import { useAuth } from "@/hooks/use-auth";
import { trackEvent } from "@/lib/analytics";
import { useGetAllUserActions, useGetUserProfile } from "@/lib/api";
import tw from "@/lib/tw";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FocusRow } from "@/components/progress/FocusRow";
import { StatusGrid } from "@/components/progress/StatusGrid";
import XPHeroCard from "@/components/progress/XPHeroCard";

type CategoryCompletion = {
  categoryKey: string;
  totalCompletions: number;
  hasActivityToday: boolean;
};

export default function ProgressScreen() {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useGetUserProfile(
    user?.id,
  );
  const { data: userActions = [], isLoading: actionsLoading } =
    useGetAllUserActions(user?.id);

  const isLoading = profileLoading || actionsLoading;

  useFocusEffect(
    useCallback(() => {
      trackEvent("screen_viewed", { screen_name: "Progress" });
    }, []),
  );

  const focusCategoryNames = useMemo(() => {
    return profile?.categories?.map((cat) => cat.name) || [];
  }, [profile]);

  const categoryProgress = useMemo((): CategoryCompletion[] => {
    const categoryMap: Record<string, { total: number; hasToday: boolean }> = {
      ATTENTION: { total: 0, hasToday: false },
      AFFECTION: { total: 0, hasToday: false },
      INITIATIVE: { total: 0, hasToday: false },
      REPAIR: { total: 0, hasToday: false },
    };

    userActions.forEach((ua) => {
      const category = ua.action.category;
      if (category && categoryMap[category]) {
        categoryMap[category].total += ua.completionCount;
      }
    });

    const result: CategoryCompletion[] = Object.entries(categoryMap).map(
      ([key, value]) => ({
        categoryKey: key,
        totalCompletions: value.total,
        hasActivityToday: value.hasToday,
      }),
    );

    return result;
  }, [userActions]);

  const focusAreas = useMemo(() => {
    return categoryProgress.filter((cat) =>
      focusCategoryNames.includes(cat.categoryKey),
    );
  }, [categoryProgress, focusCategoryNames]);

  const nonFocusAreas = useMemo(() => {
    return categoryProgress.filter(
      (cat) => !focusCategoryNames.includes(cat.categoryKey),
    );
  }, [categoryProgress, focusCategoryNames]);

  const hasAnyActions = userActions.some((ua) => ua.completionCount > 0);

  if (isLoading) {
    return (
      <SafeAreaView edges={["top"]} style={tw`flex-1 bg-background`}>
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color="#2E3130" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={tw`flex-1 bg-background`}>
      {/* <BauhausBackground
        seed={"progress"}
        color={getHexColor("darkBackground")}
        opacity={1}
      /> */}
      <ScrollView
        style={tw`flex-1 w-full`}
        contentContainerStyle={tw`px-6 pb-8`}
        showsVerticalScrollIndicator={false}
      >
        <View style={tw`py-6 mb-3`}>
          <Text
            style={tw`text-4xl text-charcoal font-gabarito font-black mb-1`}
          >
            Progress
          </Text>
          <Text style={tw`text-lg text-charcoal/70 font-gabarito`}>
            Review your progress
          </Text>
        </View>

        <XPHeroCard totalXp={profile?.totalXp ?? 0} />

        {focusCategoryNames.length === 0 ? (
          <View style={tw`flex-1 items-center justify-center px-6`}>
            <Text
              style={tw`text-2xl text-charcoal font-gabarito font-bold mb-3 text-center`}
            >
              Select Focus Areas
            </Text>
            <Text
              style={tw`text-base text-charcoal/70 font-gabarito text-center mb-6`}
            >
              Go to Settings to choose your priority areas.
            </Text>
          </View>
        ) : hasAnyActions ? (
          <>
            <FocusRow categories={focusAreas} />
            <StatusGrid categories={nonFocusAreas} />
          </>
        ) : (
          <View style={tw`flex-1 items-center justify-center px-6`}>
            <Text
              style={tw`text-2xl text-charcoal font-gabarito font-bold mb-3 text-center`}
            >
              Start Your Command Center
            </Text>
            <Text
              style={tw`text-base text-charcoal/70 font-gabarito text-center`}
            >
              Complete actions to see your progress here.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
