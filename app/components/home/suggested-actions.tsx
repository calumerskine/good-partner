import { useReminderPrompt } from "@/hooks/use-reminder-prompt";
import {
  CatalogAction,
  useActivateAction,
  useGetSuggestedActions,
  UserProfile,
} from "@/lib/api";
import { ActionTypes } from "@/lib/state/actions.model";
import tw from "@/lib/tw";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { User } from "@supabase/supabase-js";
import { Link, router } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import {
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Button from "../ui/button";

const getColorName = (category: string) => {
  switch (category) {
    case "Attention":
      return "blue";
    case "Affection":
      return "raspberry";
    case "Initiative":
      return "yellow";
    case "Repair":
      return "mint";
  }
};

export default function SuggestedActions({
  user,
  profile,
  isLoading,
}: {
  user: User | null;
  profile?: UserProfile | null;
  isLoading: boolean;
}) {
  const { width } = useWindowDimensions();

  const { data: suggestedActions = [] } = useGetSuggestedActions(
    user?.id,
    profile?.categories,
  );

  const activateAction = useActivateAction();
  const { shouldPrompt, markShown } = useReminderPrompt(user?.id);

  const handleActivate = async (actionId: string) => {
    if (!user) return;
    try {
      await activateAction.mutateAsync({ userId: user.id, actionId });
      if (shouldPrompt) {
        markShown();
        router.replace(`/(action)/${actionId}/reminders` as any);
      }
    } catch (error) {
      console.error("Error activating action:", error);
    }
  };

  if (!suggestedActions.length) {
    return null;
  }
  const cardWidth = width * 0.75;
  const cardMargin = 16;
  const leftPeek = 20;

  const snapOffsets = suggestedActions.map((_, i) =>
    i === 0 ? 0 : i * (cardWidth + cardMargin) - leftPeek,
  );

  return (
    <View>
      <View style={tw`py-6`}>
        <Text style={tw`text-3xl text-black font-gabarito font-bold`}>
          Pick your action
        </Text>
      </View>

      {isLoading ? (
        <View style={tw`py-12 items-center`}>
          <Text style={tw`text-charcoal font-gabarito text-lg`}>
            Loading...
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={tw`h-[520px]`}
          contentContainerStyle={tw`mb-8 p-2 flex-row`}
          snapToOffsets={snapOffsets}
          decelerationRate="fast"
        >
          {suggestedActions.map((item: CatalogAction) => {
            const { id, title, description, category } = item;
            const categoryInfo =
              ActionTypes[category as keyof typeof ActionTypes];
            return (
              <Link href={`/(action)/${id}?catalog=true`} key={id} asChild>
                <Pressable
                  style={tw.style(`rounded-2xl mr-4`, {
                    width: cardWidth,
                    // boxShadow: `0px 0px 10px ${getHexColor(categoryInfo.darkerColor)}90`,
                  })}
                >
                  {/* <LinearGradient
                    colors={[
                      getHexColor(`${categoryInfo.lightColor}`),
                      getHexColor(`${categoryInfo.lightColor}`),
                    ]}
                    start={{ x: 0.8, y: 0.4 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      tw.style(
                        `flex-1 rounded-2xl p-7 pt-10 border-2 border-${categoryInfo.color}/90`,
                      ),
                    ]}
                  > */}
                  <View
                    style={tw`flex-1 rounded-2xl p-7 pt-10 border-2 bg-${categoryInfo.color}-200 shadow-black/50`}
                  >
                    <View
                      style={tw`absolute flex items-center justify-center rounded-tr-lg rounded-bl-lg right-0 w-12 h-12 `}
                    >
                      <FontAwesome
                        name={categoryInfo.iconName}
                        size={26}
                        style={tw`text-${categoryInfo.color}-500`}
                      />
                    </View>
                    <View style={tw`justify-between flex-1 gap-2 items-center`}>
                      <Text
                        style={tw`text-2xl font-gabarito font-bold text-black mb-4 leading-1.3 text-center`}
                      >
                        {title}
                      </Text>

                      {description ? (
                        <Text
                          style={tw`text-lg text-black font-gabarito leading-1.6 text-center`}
                          // numberOfLines={3}
                        >
                          {description.substring(
                            0,
                            description.indexOf(".") + 1,
                          )}
                        </Text>
                      ) : null}

                      <View style={tw`flex-row gap-3 mt-6`}>
                        <Button
                          size="sm"
                          color={getColorName(categoryInfo.title)}
                          onPress={() => handleActivate(id)}
                          disabled={activateAction.isPending}
                        >
                          {/* {activateAction.isPending
                            ? "Activating..."
                            : "I'll do it today!"} */}
                          I'll do it today!
                        </Button>
                      </View>
                      {/* // Restore these when we build those actions. */}
                      {/* <View
                        style={tw`flex-row items-center justify-between gap-6 mt-4 px-2`}
                      >
                        <FontAwesome
                          name="trash"
                          size={24}
                          color={getHexColor(categoryInfo.darkerColor)}
                        />
                        <FontAwesome
                          name="heart"
                          size={24}
                          color={getHexColor(categoryInfo.darkerColor)}
                        />
                      </View> */}
                    </View>
                  </View>
                  {/* </LinearGradient> */}
                </Pressable>
              </Link>
            );
          })}
          <Link href="/(tabs)/(actions)" asChild>
            <Pressable
              style={tw.style(
                `bg-grape rounded-2xl items-center justify-center gap-8`,
                { width: cardWidth },
              )}
            >
              <Text
                style={tw`text-3xl font-gabarito font-bold text-white leading-1.1 text-center px-8`}
              >
                Or browse some more actions
              </Text>
              <ArrowRight size={40} color="white" />
              {/* <FontAwesome name="chevron-right" size={40} color="white" /> */}
            </Pressable>
          </Link>
        </ScrollView>
      )}
    </View>
  );
}
