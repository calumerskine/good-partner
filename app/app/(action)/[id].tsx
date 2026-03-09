import Button from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { trackEvent } from "@/lib/analytics";
import {
  CatalogAction,
  useActivateAction,
  useCompleteAction,
  useDeactivateAction,
  useGetActionDetail,
  useGetUserAction,
} from "@/lib/api";
import { getHexColor } from "@/lib/colors";
import { ActionTypes } from "@/lib/state/actions.model";
import tw from "@/lib/tw";
import Entypo from "@expo/vector-icons/Entypo";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link, router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BackButton = () => (
  <Link href=".." asChild>
    <Pressable style={tw`p-3 pl-0`}>
      <Entypo name="chevron-left" size={30} color="charcoal" />
    </Pressable>
  </Link>
);

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
      <SafeAreaView style={tw`flex-1 bg-background`}>
        <View
          style={tw`w-full px-6 py-4 flex-row items-center justify-between`}
        >
          <BackButton />
        </View>
        <View style={tw`items-center`}>
          <Text style={tw`text-charcoal text-xl font-gabarito`}>
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
      router.replace("/(tabs)/(home)");
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
      router.replace(`/(action)/${id}/success?completionId=${completion.id}` as any);
    } catch (error) {
      console.error("Error completing action:", error);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-background`}>
      <View style={tw`w-full px-6 py-4 flex-row items-center justify-between`}>
        <BackButton />

        <View
          style={tw`flex-row gap-2 pl-4 pr-2 py-2 rounded-lg bg-${categoryInfo.color || "white"}`}
        >
          <Text
            style={tw`text-${categoryInfo.darkerColor} font-gabarito font-bold text-sm uppercase tracking-wide`}
          >
            {categoryInfo.title || actionData.category}
          </Text>

          <FontAwesome
            name={categoryInfo.iconName}
            size={20}
            color={getHexColor(categoryInfo.darkerColor)}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={tw`flex-1 items-center justify-center bg-background`}>
          <ActivityIndicator size="large" color="#2E3130" />
        </View>
      ) : (
        <>
          <ScrollView
            style={tw`flex-1 w-full`}
            contentContainerStyle={tw`px-8 pb-8`}
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={tw`text-black font-gabarito font-black text-3xl leading-tight mb-6`}
            >
              {actionData.title}
            </Text>

            <Text style={tw`text-charcoal font-gabarito text-xl  mb-8`}>
              {actionData.description}
            </Text>

            {!isCatalogView && completionCount > 0 && (
              <View style={tw`rounded-2xl px-6 py-3 bg-grape/20 mb-6 self-end`}>
                <Text
                  style={tw`text-charcoal/70 font-gabarito text-base font-bold self-end`}
                >
                  {completionCount} {completionCount === 1 ? "time" : "times"}{" "}
                  completed
                </Text>
              </View>
            )}

            <View
              style={tw`rounded-2xl p-7 bg-${categoryInfo.color}/20 mb-6 border-[3px] border-${categoryInfo.color}`}
            >
              <View style={tw`absolute right-4 top-4`}>
                <FontAwesome
                  name="lightbulb-o"
                  size={30}
                  color={getHexColor(categoryInfo.darkColor)}
                />
              </View>

              <Text
                style={tw`text-charcoal font-gabarito text-2xl font-bold mb-3 mr-6`}
              >
                Why it matters
              </Text>
              <Text
                style={tw`text-charcoal font-gabarito text-lg leading-relaxed`}
              >
                {actionData.reasoning}
              </Text>
            </View>
          </ScrollView>

          <View style={tw`w-full px-6 pb-6 pt-4 bg-background`}>
            {isCatalogView ? (
              <Button
                onPress={handleActivate}
                disabled={activateAction.isPending}
              >
                <Text>
                  {activateAction.isPending
                    ? "Activating..."
                    : completionCount > 0
                      ? "Activate Again"
                      : "Activate This Action"}
                </Text>
              </Button>
            ) : isActive ? (
              <View style={tw`gap-3`}>
                <Button
                  onPress={handleComplete}
                  disabled={completeAction.isPending}
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
                  <Text style={tw`text-charcoal`}>
                    {deactivateAction.isPending
                      ? "Pausing..."
                      : "Pause for now"}
                  </Text>
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
