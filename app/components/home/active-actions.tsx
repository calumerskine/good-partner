import { UserAction } from "@/lib/api";
import { getHexColor } from "@/lib/colors";
import { ActionTypes } from "@/lib/state/actions.model";
import tw from "@/lib/tw";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import Button from "../ui/button";

export default function ActiveActions({
  isLoading,
  userActions,
}: {
  isLoading: boolean;
  userActions: UserAction[];
}) {
  return (
    <View style={tw`mb-2`}>
      <View style={tw`py-4`}>
        <Text style={tw`text-2xl text-black font-gabarito font-black mb-2`}>
          Your active actions
        </Text>
      </View>

      {isLoading ? (
        <View style={tw`py-12 items-center`}>
          <Text style={tw`text-charcoal font-gabarito text-lg`}>
            Loading...
          </Text>
        </View>
      ) : userActions.length > 0 ? (
        <View style={tw`gap-4 mb-4`}>
          {userActions.map((item: UserAction) => {
            const categoryInfo =
              ActionTypes[item.action.category as keyof typeof ActionTypes];
            return (
              <Link href={`/(action)/${item.id}`} key={item.id} asChild>
                <Pressable style={tw`shadow-md`}>
                  <LinearGradient
                    colors={[
                      getHexColor("grape"),
                      getHexColor(categoryInfo.color),
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={tw`rounded-2xl p-6`}
                  >
                    <View
                      style={tw`absolute flex items-center justify-center right-2 top-2 w-8 h-8`}
                    >
                      <FontAwesome
                        name={categoryInfo.iconName}
                        size={20}
                        color={getHexColor(categoryInfo.darkerColor)}
                      />
                    </View>

                    <Text
                      style={tw`text-xl font-gabarito font-bold text-black mb-3 leading-snug`}
                    >
                      {item.action.title}
                    </Text>

                    <View style={tw`flex-row items-center justify-between`}>
                      <Text style={tw`text-sm text-charcoal/80 font-gabarito`}>
                        Completed {item.completionCount}{" "}
                        {item.completionCount === 1 ? "time" : "times"}
                      </Text>
                    </View>
                  </LinearGradient>
                </Pressable>
              </Link>
            );
          })}
        </View>
      ) : (
        <View style={tw`rounded-2xl p-8 bg-mediumGrey`}>
          <Text style={tw`text-base text-charcoal font-gabarito mb-6`}>
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
