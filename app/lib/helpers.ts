import { EventArg, ParamListBase, RouteProp } from "@react-navigation/native";

export const resetRootTabListener = ({
  navigation,
  route,
}: {
  navigation: any;
  route: RouteProp<ParamListBase, string>;
}) => ({
  tabPress: (e: EventArg<"tabPress", true, undefined>) => {
    e.preventDefault();
    navigation.reset({
      index: 0,
      routes: [{ name: route.name }],
    });
  },
});
