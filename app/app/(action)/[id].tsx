import BackButton from "@/components/ui/back-button";
import Button from "@/components/ui/button";
import PressableCard from "@/components/ui/pressable-card";
import { useAuth } from "@/hooks/use-auth";
import { useReminderPrompt } from "@/hooks/use-reminder-prompt";
import { trackEvent } from "@/lib/analytics";
import {
  CatalogAction,
  useActivateAction,
  useCompleteAction,
  useDeactivateAction,
  useGetActionDetail,
  useGetActiveActions,
  useGetUserAction,
} from "@/lib/api";
import { ActionTypes } from "@/lib/state/actions.model";
import tw from "@/lib/tw";
import { router, useLocalSearchParams } from "expo-router";
import { Lightbulb } from "lucide-react-native";
import { useEffect } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ActionDetailScreen() {
  const { id, catalog } = useLocalSearchParams<{
    id: string;
    catalog?: string;
  }>();
  const { user } = useAuth();
  const isCatalogView = catalog === "true";

  // Fetch either user action or catalog action based on context
  const {
    data: userAction,
    isLoading: userActionLoading,
    error: userActionError,
  } = useGetUserAction(!isCatalogView ? id : undefined);
  const { data: catalogAction, isLoading: catalogActionLoading } =
    useGetActionDetail(isCatalogView ? id : undefined);

  const activateAction = useActivateAction();
  const deactivateAction = useDeactivateAction();
  const completeAction = useCompleteAction();

  const { shouldPrompt, markShown } = useReminderPrompt(user?.id);
  const { data: activeActions } = useGetActiveActions(user?.id);

  // If browsing a catalog action that the user already has active, redirect to
  // the user action page so active-state CTAs render correctly.
  const activeMatchForCatalog = isCatalogView
    ? activeActions?.find((a) => a.actionId === id)
    : undefined;

  useEffect(() => {
    if (activeMatchForCatalog) {
      router.replace(`/(action)/${activeMatchForCatalog.id}` as any);
    }
  }, [activeMatchForCatalog]);

  // For catalog view, compare by action_id. For user action view, any active
  // action counts as "other" since we only reach that branch when !isActive.
  const hasOtherActiveAction = isCatalogView
    ? (activeActions?.some((a) => a.actionId !== id) ?? false)
    : (activeActions?.length ?? 0) > 0;

  useEffect(() => {
    trackEvent("screen_viewed", { screen_name: "Action Detail" });
    trackEvent("action_viewed", { action_id: id, is_catalog: isCatalogView });
  }, [id, isCatalogView]);

  const isLoading = userActionLoading || catalogActionLoading;

  // Determine which action data to use
  let actionData: CatalogAction | null = null;

  if (isCatalogView && catalogAction) {
    actionData = catalogAction;
  } else if (!isCatalogView && userAction?.action) {
    actionData = userAction.action;
  }

  const categoryInfo =
    ActionTypes[actionData?.category as keyof typeof ActionTypes];
  const isActive = !isCatalogView && userAction?.isActive;
  const completionCount = !isCatalogView ? userAction?.completionCount || 0 : 0;

  if (!actionData) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white`}>
        <View
          style={tw`w-full px-6 py-4 flex-row items-center justify-between`}
        >
          <BackButton />
        </View>
        <View style={tw`items-center`}>
          <Text style={tw`text-ink text-xl font-gabarito`}>
            Action not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleActivate = async () => {
    if (!user || !actionData.id) return;

    try {
      await activateAction.mutateAsync({
        userId: user.id,
        actionId: isCatalogView ? id : actionData.id,
      });
      trackEvent("action_activated", { action_id: actionData.id });

      if (shouldPrompt) {
        markShown();
        router.replace(`/(action)/${id}/reminders` as any);
      } else {
        router.replace("/(tabs)/(home)");
      }
    } catch (error) {
      console.error("Error activating action:", error);
    }
  };

  const handleDeactivate = async () => {
    if (!id || isCatalogView) return;

    try {
      await deactivateAction.mutateAsync(id);
      trackEvent("action_deactivated", { action_id: id });
      router.back();
    } catch (error) {
      console.error("Error deactivating action:", error);
    }
  };

  const handleComplete = async () => {
    if (!id || isCatalogView) return;

    try {
      const completion = await completeAction.mutateAsync(id);
      trackEvent("action_completed", { action_id: id });
      router.replace(
        `/(action)/${id}/success?completionId=${completion.id}&categoryId=${actionData.category}&previousXp=${completion.previousXp}&newXp=${completion.newXp}` as any,
      );
    } catch (error) {
      console.error("Error completing action:", error);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <View style={tw`w-full px-6 py-4 flex-row items-center justify-between`}>
        <BackButton />

        <View style={tw`flex-row items-center gap-2`}>
          <Text
            style={tw`text-4xl text-${categoryInfo.color}-500 font-gabarito font-black`}
          >
            {categoryInfo.title}
          </Text>
          {categoryInfo.icon({
            size: 30,
            style: tw`text-${categoryInfo.color}-500`,
          })}
        </View>
      </View>

      {isLoading ? (
        <View style={tw`flex-1 items-center justify-center bg-white`}>
          <ActivityIndicator size="large" color="#2E3130" />
        </View>
      ) : (
        <>
          <ScrollView
            style={tw`flex-1 w-full`}
            contentContainerStyle={tw`px-8 pb-8`}
            showsVerticalScrollIndicator={false}
          >
            {isActive ? (
              <View
                style={tw`flex w-24 flex-row items-center justify-between pb-6 gap-2`}
              >
                <Text style={tw`font-bold`}>In Progress</Text>
                <View
                  style={tw`bg-green-400 border-green-500 border w-4 h-4 rounded-full animate-ping`}
                ></View>
              </View>
            ) : null}
            <Text
              style={tw`text-black font-gabarito font-black text-3xl leading-tight mb-6`}
            >
              {actionData.title}
            </Text>

            <Text style={tw`text-ink font-gabarito text-xl  mb-8`}>
              {actionData.description}
            </Text>

            {!isCatalogView && completionCount > 0 && (
              <View style={tw`rounded-2xl px-6 py-3 bg-grape/20 mb-6 self-end`}>
                <Text
                  style={tw`text-ink/70 font-gabarito text-base font-bold self-end`}
                >
                  {completionCount} {completionCount === 1 ? "time" : "times"}{" "}
                  completed
                </Text>
              </View>
            )}

            <PressableCard
              style={tw`mb-6`}
              color={categoryInfo.color}
              shade={200}
            >
              <View style={tw`p-6`}>
                <View style={tw`absolute right-4 top-4`}>
                  <Lightbulb />
                </View>

                <Text
                  style={tw`text-ink font-gabarito text-2xl font-bold mb-3 mr-6`}
                >
                  Why it matters
                </Text>
                <Text
                  style={tw`text-ink font-gabarito text-lg leading-relaxed`}
                >
                  {actionData.reasoning}
                </Text>
              </View>
            </PressableCard>
          </ScrollView>
          <View style={tw`w-full px-6 pb-0 pt-4`}>
            {isCatalogView ? (
              hasOtherActiveAction ? (
                <View style={tw`gap-3`}>
                  <Button color="gray" disabled size="sm">
                    Finish todays action first
                  </Button>
                  <Button
                    color="ghost"
                    size="sm"
                    onPress={() => router.replace("/(tabs)/(home)")}
                  >
                    View active action →
                  </Button>
                </View>
              ) : (
                <Button
                  onPress={handleActivate}
                  disabled={activateAction.isPending}
                  color={categoryInfo.color}
                >
                  {activateAction.isPending
                    ? "Activating..."
                    : completionCount > 0
                      ? "Activate Again"
                      : "Activate This Action"}
                </Button>
              )
            ) : isActive ? (
              <View style={tw`gap-3`}>
                <Button
                  onPress={handleComplete}
                  disabled={completeAction.isPending}
                  color="green"
                >
                  {completeAction.isPending
                    ? "Completing..."
                    : "✓ I've done it!"}
                </Button>
                <Button
                  color="ghost"
                  size="sm"
                  onPress={handleDeactivate}
                  disabled={deactivateAction.isPending}
                >
                  <Text style={tw`text-ink`}>
                    {deactivateAction.isPending
                      ? "Pausing..."
                      : "Pause for now"}
                  </Text>
                </Button>
              </View>
            ) : hasOtherActiveAction ? (
              <View style={tw`gap-3`}>
                <Button disabled>Finish todays action first</Button>
                <Button
                  color="ghost"
                  size="sm"
                  onPress={() => router.replace("/(tabs)/(home)")}
                >
                  <Text style={tw`text-ink`}>View active action</Text>
                </Button>
              </View>
            ) : (
              <Button
                onPress={handleActivate}
                disabled={activateAction.isPending}
              >
                <Text>
                  {activateAction.isPending
                    ? "Activating..."
                    : "Activate Again"}
                </Text>
              </Button>
            )}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
