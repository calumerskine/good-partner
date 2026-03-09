import { useAuth } from "@/hooks/use-auth";
import { trackEvent } from "@/lib/analytics";
import { useGetAllUserActions, UserAction } from "@/lib/api";
import { ActionTypes } from "@/lib/state/actions.model";
import tw from "@/lib/tw";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProgressScreen() {
  const { user } = useAuth();
  const { data: userActions = [], isLoading } = useGetAllUserActions(user?.id);

  useFocusEffect(
    useCallback(() => {
      trackEvent("screen_viewed", { screen_name: "Progress" });
    }, []),
  );

  // Calculate completed actions (those with at least one completion)
  const completedActions = userActions.filter(
    (action) => action.completionCount > 0,
  );
  const totalCompletions = userActions.reduce(
    (sum, action) => sum + action.completionCount,
    0,
  );

  return (
    <SafeAreaView edges={["top"]} style={tw`flex-1 bg-background`}>
      <View style={tw`flex-1 w-full px-6 pb-8`}>
        <View style={tw`py-6 mb-4`}>
          <Text style={tw`text-4xl text-black font-gabarito font-black mb-2`}>
            Progress
          </Text>
          <Text style={tw`text-lg text-charcoal font-gabarito`}>
            Track your goals
          </Text>
        </View>
        <FlatList
          style={tw`flex-1 w-full`}
          ListHeaderComponent={
            <>
              {isLoading ? (
                <View style={tw`py-12 items-center`}>
                  <Text style={tw`text-white/70 font-gabarito text-lg`}>
                    Loading...
                  </Text>
                </View>
              ) : (
                <>
                  {/* <View style={tw`flex-row gap-4 mb-8`}>
                    <View
                      style={tw`flex-1 bg-grape rounded-2xl p-6 items-center`}
                    >
                      <Text
                        style={tw`text-5xl font-gabarito font-black text-white mb-2`}
                      >
                        {totalCompletions}
                      </Text>
                      <Text
                        style={tw`text-sm font-gabarito text-white/70 text-center`}
                      >
                        Total Completions
                      </Text>
                    </View>

                    <View style={tw`flex-1 bg-peach rounded-2xl p-6`}>
                      <Text
                        style={tw`text-5xl font-gabarito font-black text-charcoal mb-2`}
                      >
                        {completedActions.length}
                      </Text>
                      <Text style={tw`text-sm font-gabarito text-charcoal/70`}>
                        Actions{"\n"}Completed
                      </Text>
                    </View>
                  </View> */}

                  {/* {totalCompletions > 0 && (
                    <View
                      style={tw`bg-grape/10 border border-grape/30 rounded-2xl p-6 mb-8`}
                    >
                      <Text
                        style={tw`text-lg font-gabarito font-bold text-white mb-2`}
                      >
                        {totalCompletions >= 10
                          ? "You're on fire! 🔥"
                          : totalCompletions >= 5
                            ? "Great momentum! ⭐"
                            : "Keep it up! 💪"}
                      </Text>
                      <Text style={tw`text-base font-gabarito text-white/70`}>
                        Every action builds a stronger connection.
                      </Text>
                    </View>
                  )} */}

                  {completedActions.length > 0 && (
                    <Text
                      style={tw`text-xl text-black font-gabarito font-bold mb-4`}
                    >
                      Completed Actions
                    </Text>
                  )}
                </>
              )}
            </>
          }
          data={completedActions}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={tw`h-3`} />}
          ListEmptyComponent={
            !isLoading ? (
              <View style={tw`py-12 items-center px-6`}>
                <Text style={tw`text-6xl mb-6`}>🌱</Text>
                <Text
                  style={tw`text-2xl text-charcoal font-gabarito font-bold mb-3 text-center`}
                >
                  Start Your Journey
                </Text>
                <Text
                  style={tw`text-base text-charcoal/70 font-gabarito text-center`}
                >
                  Complete your first action to start tracking your progress.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }: { item: UserAction }) => {
            const categoryInfo =
              ActionTypes[item.action.category as keyof typeof ActionTypes];

            return (
              <Link href={`/(action)/${item.id}`} asChild>
                <Pressable
                  style={tw`w-full bg-mediumGrey rounded-2xl p-5 border-[3px] border-${categoryInfo.darkColor}`}
                >
                  <View
                    style={tw`absolute flex items-center justify-center rounded-tr-lg rounded-bl-lg right-0 w-8 h-8 bg-${categoryInfo.darkColor}`}
                  >
                    <FontAwesome
                      name={categoryInfo.iconName}
                      size={20}
                      color={"white"}
                    />
                  </View>
                  <View style={tw`flex-row items-start justify-between mb-3`}>
                    <Text
                      style={tw`text-lg font-gabarito font-bold text-charcoal flex-1 pr-4`}
                    >
                      {item.action.title}
                    </Text>
                  </View>

                  <View style={tw`flex-row gap-1 items-center self-end`}>
                    <Text
                      style={tw`text-charcoal/50 font-gabarito font-bold text-base`}
                    >
                      {item.completionCount}x
                    </Text>
                    <Text style={tw`text-charcoal/50 font-gabarito text-base`}>
                      completed
                    </Text>
                  </View>
                </Pressable>
              </Link>
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}
