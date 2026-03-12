import { useAuth } from "@/hooks/use-auth";
import { trackEvent } from "@/lib/analytics";
import { getHexColor } from "@/lib/colors";
import { resetRootTabListener } from "@/lib/helpers";
import Feather from "@expo/vector-icons/Feather";
import { Redirect, Tabs } from "expo-router";
import { ChartBar, ListTodo } from "lucide-react-native";
import React from "react";
import { Platform, View } from "react-native";

export default function TabLayout() {
  const { user, isLoading } = useAuth();

  // Don't show anything while loading to prevent flash
  if (isLoading) {
    return null;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenListeners={{
        tabPress: (e) => {
          trackEvent("tab_switched", { tab: e.target?.split("-")[0] });
        },
      }}
      screenOptions={{
        tabBarActiveTintColor: getHexColor("charcoal"),
        tabBarInactiveTintColor: getHexColor("charcoal"),
        headerShown: false,
        // tabBarButton: HapticTab,
        tabBarStyle:
          Platform.OS === "web"
            ? { display: "none" }
            : {
                backgroundColor: getHexColor("background"),
                height: 90,
                paddingTop: 18,
                // paddingBottom: 10,
                // shadowOffset: {
                //   width: 0,
                //   height: 12,
                // },
                // shadowOpacity: 0.0,
                // shadowOpacity: 0.58,
                // shadowRadius: 10.0,
                // elevation: 24,
              },
        tabBarLabelStyle: { fontSize: 14, paddingTop: 10 },
      }}
    >
      <Tabs.Screen
        name="(home)"
        listeners={resetRootTabListener}
        options={{
          tabBarShowLabel: false,
          tabBarIcon: ({ focused }) => (
            <TabButton focused={focused}>
              <Feather
                name="home"
                size={24}
                color={focused ? "white" : getHexColor("charcoal")}
              />
            </TabButton>
          ),
        }}
      />
      <Tabs.Screen
        name="(actions)"
        listeners={resetRootTabListener}
        options={{
          tabBarShowLabel: false,
          tabBarIcon: ({ focused }) => (
            <TabButton focused={focused}>
              <ListTodo color={focused ? "white" : getHexColor("charcoal")} />
            </TabButton>
          ),
        }}
      />
      <Tabs.Screen
        name="(progress)"
        listeners={resetRootTabListener}
        options={{
          tabBarShowLabel: false,
          tabBarIcon: ({ focused }) => (
            <TabButton focused={focused}>
              <ChartBar color={focused ? "white" : getHexColor("charcoal")} />
            </TabButton>
          ),
        }}
      />
      <Tabs.Screen
        name="(settings)"
        listeners={resetRootTabListener}
        options={{
          tabBarShowLabel: false,
          tabBarIcon: ({ focused }) => (
            <TabButton focused={focused}>
              <Feather
                name="settings"
                size={24}
                color={focused ? "white" : getHexColor("charcoal")}
              />
            </TabButton>
          ),
        }}
      />
    </Tabs>
  );
}

const TabButton = ({
  focused,
  children,
}: {
  focused: boolean;
  children: React.ReactNode;
}) => {
  return (
    <View
      style={{
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        width: 40,
        height: 40,
        backgroundColor: focused ? getHexColor("charcoal") : "transparent",
      }}
    >
      {children}
    </View>
  );
};
