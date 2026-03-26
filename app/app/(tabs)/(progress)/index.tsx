import { FocusRow } from "@/components/progress/FocusRow";
import Button from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { trackEvent } from "@/lib/analytics";
import { useGetAllUserActions } from "@/lib/api";
import tw from "@/lib/tw";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useMemo } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type CategoryCompletion = {
  categoryKey: string;
  totalCompletions: number;
  hasActivityToday: boolean;
};

export default function ProgressScreen() {
  const { user } = useAuth();
  const { data: userActions = [], isLoading } = useGetAllUserActions(user?.id);

  useFocusEffect(
    useCallback(() => {
      trackEvent("screen_viewed", { screen_name: "Progress" });
    }, []),
  );

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

  const hasAnyActions = userActions.some((ua) => ua.completionCount > 0);

  if (isLoading) {
    return (
      <SafeAreaView edges={["top"]} style={tw`flex-1 bg-white`}>
        <View style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator size="large" color="#2E3130" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={tw`flex-1 bg-white`}>
      <ScrollView
        style={tw`flex-1 w-full`}
        contentContainerStyle={tw`px-6 pb-8`}
        showsVerticalScrollIndicator={false}
      >
        <View style={tw`py-6`}>
          <Text style={tw`text-4xl text-ink font-gabarito font-black mb-1`}>
            Progress
          </Text>
        </View>

        {/* <XPHeroCard totalXp={profile?.totalXp ?? 0} /> */}

        {hasAnyActions ? (
          <>
            <Text style={tw`pb-4 font-gabarito text-lg text-ink-90`}>
              Actions Completed
            </Text>
            <FocusRow categories={categoryProgress} vertical />
          </>
        ) : (
          <View style={tw`flex-1 items-center justify-center px-6`}>
            <Text style={tw`text-base text-ink/70 font-gabarito text-center`}>
              Complete actions to see your progress here.
            </Text>
            <View style={tw`mt-12`}>
              <Link href={"/(home)"} asChild>
                <Button>See today's action</Button>
              </Link>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
