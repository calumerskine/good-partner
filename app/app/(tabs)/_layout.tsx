import { useAuth } from "@/hooks/use-auth";
import { trackEvent } from "@/lib/analytics";
import { resetRootTabListener } from "@/lib/helpers";
import tw from "@/lib/tw";
import { Redirect, Tabs } from "expo-router";
import {
  FolderSearch,
  GraduationCap,
  Home,
  Settings,
} from "lucide-react-native";
import React from "react";
import { Platform, View } from "react-native";

const themeColor = tw`bg-indigo-500`["backgroundColor"] as string;
const dark = tw`bg-indigo-900`["backgroundColor"] as string;
const activeText = tw`bg-indigo-50`["backgroundColor"] as string;

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
        tabBarActiveTintColor: dark,
        tabBarInactiveTintColor: dark,
        headerShown: false,
        // tabBarButton: HapticTab,
        tabBarStyle:
          Platform.OS === "web"
            ? { display: "none" }
            : {
                backgroundColor: "#fff",
                height: 112,
                paddingTop: 12,
                shadowOffset: {
                  width: 0,
                  height: 12,
                },
                shadowOpacity: 0.58,
                shadowRadius: 10.0,
                elevation: 24,
              },
        tabBarLabelStyle: { fontSize: 14, paddingTop: 12 },
      }}
    >
      <Tabs.Screen
        name="(home)"
        listeners={resetRootTabListener}
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabButton focused={focused}>
              <Home color={focused ? activeText : dark} />
            </TabButton>
          ),
        }}
      />
      <Tabs.Screen
        name="(actions)"
        listeners={resetRootTabListener}
        options={{
          title: "Explore",
          tabBarIcon: ({ focused }) => (
            <TabButton focused={focused}>
              <FolderSearch color={focused ? activeText : dark} />
            </TabButton>
          ),
        }}
      />
      <Tabs.Screen
        name="(progress)"
        listeners={resetRootTabListener}
        options={{
          title: "Progress",
          tabBarIcon: ({ focused }) => (
            <TabButton focused={focused}>
              <GraduationCap color={focused ? activeText : dark} />
            </TabButton>
          ),
        }}
      />
      <Tabs.Screen
        name="(settings)"
        listeners={resetRootTabListener}
        options={{
          title: "Settings",
          tabBarIcon: ({ focused }) => (
            <TabButton focused={focused}>
              <Settings color={focused ? activeText : dark} />
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
      style={[
        tw`rounded-2xl w-12 h-12 items-center justify-center`,
        {
          backgroundColor: focused ? themeColor : "transparent",
        },
      ]}
    >
      {children}
    </View>
  );
};
