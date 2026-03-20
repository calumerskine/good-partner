import { UserAction, useCompleteAction } from "@/lib/api";
import { getHexColor } from "@/lib/colors";
import { ActionTypes } from "@/lib/state/actions.model";
import tw from "@/lib/tw";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link, router } from "expo-router";
import { MotiView } from "moti";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Button from "../ui/button";

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
    <Pressable onPress={onToggle} style={tw``}>
      <View
        style={tw`bg-darkBackground border-4 border-${categoryInfo.darkColor} rounded-2xl p-5 overflow-hidden`}
      >
        {/* Top accent bar */}
        {/* <LinearGradient
          colors={[accentLight, accentDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: 4,
          }}
        /> */}

        {/* Header row */}
        <View style={tw`flex-row items-center justify-between`}>
          <Text
            style={tw`text-lg font-gabarito font-bold text-ink flex-1 mr-3`}
          >
            {item.action.title}
          </Text>
          <View
            style={[
              tw`w-8 h-8 rounded-full items-center justify-center`,
              // { backgroundColor: iconBg },
            ]}
          >
            <FontAwesome
              name={categoryInfo.iconName}
              size={22}
              color={getHexColor(categoryInfo.darkColor)}
            />
            {/* <Text style={{ fontSize: 16 }}>{categoryInfo.icon}</Text> */}
          </View>
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
              style={tw`text-base text-ink/80 font-gabarito leading-relaxed mb-4`}
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
    </Pressable>
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
        <Text style={tw`text-2xl text-black font-gabarito font-black mb-2`}>
          Your active actions
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
              isExpanded={expandedId === item.id}
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
