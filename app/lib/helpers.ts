import { EventArg, ParamListBase, RouteProp } from "@react-navigation/native";

export const resetRootTabListener = ({
  navigation,
  route,
}: {
  navigation: any;
  route: RouteProp<ParamListBase, string>;
}) => ({
  tabPress: (e: EventArg<"tabPress", true, undefined>) => {
    const tabRoute = navigation
      .getState()
      .routes.find((r: any) => r.name === route.name);
    const isNested = tabRoute?.state && tabRoute.state.index > 0;

    if (isNested) {
      e.preventDefault();
      navigation.reset({
        index: 0,
        routes: [{ name: route.name }],
      });
    }
  },
});
