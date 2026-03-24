import { UserAction, useCompleteAction } from "@/lib/api";
import { getHexColor } from "@/lib/colors";
import { ActionTypes } from "@/lib/state/actions.model";
import tw from "@/lib/tw";
import { Link, router } from "expo-router";
import { MotiView } from "moti";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import Button from "../ui/button";
import PressableCard from "../ui/pressable-card";

function ActionCard({
  item,
  isExpanded,
  onToggle,
}: {
  item: UserAction;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const completeAction = useCompleteAction();
  const categoryInfo =
    ActionTypes[item.action.category as keyof typeof ActionTypes];

  const handleComplete = useCallback(async () => {
    try {
      const completion = await completeAction.mutateAsync(item.id);
      router.replace(
        `/(action)/${item.id}/success?completionId=${completion.id}&categoryId=${item.action.category}&previousXp=${completion.previousXp}&newXp=${completion.newXp}` as any,
      );
    } catch (error) {
      console.error("Error completing action:", error);
    }
  }, [completeAction, item.id, item.action.category]);

  const handleViewMore = useCallback(() => {
    router.push(`/(action)/${item.id}`);
  }, [item.id]);

  const accentLight = getHexColor(categoryInfo.lightColor);
  const accentDark = getHexColor(categoryInfo.darkColor);
  const iconBg = accentLight + "4D"; // 30% opacity

  return (
    <PressableCard color={categoryInfo.color} showShadow>
      <View style={tw`p-6 items-start`}>
        {/* Header row */}
        <View
          style={tw`bg-${categoryInfo.color}-300 rounded-lg flex flex-row items-center px-3 py-1`}
        >
          <Text style={tw`uppercase font-gabarito font-medium mr-2 text-sm`}>
            {categoryInfo.title}
          </Text>
          {categoryInfo.icon()}
        </View>

        {/* Footer row */}
        <View style={tw`flex-row items-center justify-end mt-3`}>
          {/* <MotiView
            from={{ rotateZ: "0deg" }}
            animate={{ rotateZ: isExpanded ? "180deg" : "0deg" }}
            transition={{ type: "timing", duration: 200 }}
          >
            <FontAwesome
              name="chevron-down"
              size={14}
              color={getHexColor("ink")}
              style={tw`opacity-60`}
            />
          </MotiView> */}
        </View>

        {/* Expanded content */}
        {isExpanded && (
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 180 }}
          >
            <Text
              style={tw`text-2xl font-gabarito font-bold text-black leading-1.3 mt-2`}
            >
              {item.action.title}
            </Text>
            <Text
              style={tw`text-base text-ink/80 font-gabarito leading-relaxed mb-4 mt-2`}
              numberOfLines={4}
            >
              {item.action.description || "No description available"}
            </Text>

            <View style={tw`gap-2`}>
              <Button
                onPress={handleComplete}
                disabled={completeAction.isPending}
                color={categoryInfo.buttonColor}
                size="sm"
              >
                {completeAction.isPending ? "Loading..." : "✓ I've done it!"}
              </Button>
              <Button
                color="ghost"
                size="sm"
                onPress={handleViewMore}
                style={tw`self-center`}
              >
                View more →
              </Button>
            </View>
          </MotiView>
        )}
      </View>
    </PressableCard>
  );
}

export default function ActiveActions({
  isLoading,
  userActions,
}: {
  isLoading: boolean;
  userActions: UserAction[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleToggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);
  return (
    <View style={tw`mb-2`}>
      <View style={tw`py-4`}>
        <Text style={tw`text-2xl text-black font-gabarito font-bold mb-6`}>
          Your move for today:
        </Text>
      </View>

      {isLoading ? (
        <View style={tw`py-12 items-center`}>
          <Text style={tw`text-ink font-gabarito text-lg`}>Loading...</Text>
        </View>
      ) : userActions.length > 0 ? (
        <View style={tw`gap-4 mb-4`}>
          {userActions.map((item: UserAction) => (
            <ActionCard
              key={item.id}
              item={item}
              isExpanded
              onToggle={() => handleToggle(item.id)}
            />
          ))}
        </View>
      ) : (
        <View style={tw`rounded-2xl p-8 bg-mediumGrey`}>
          <Text style={tw`text-base text-ink font-gabarito mb-6`}>
            Choose an action to focus on today and start building meaningful
            habits
          </Text>
          <Link href="/(tabs)/(actions)" asChild>
            <Button>
              <Text style={tw`text-black font-gabarito`}>Browse Actions</Text>
            </Button>
          </Link>
        </View>
      )}
    </View>
  );
}
