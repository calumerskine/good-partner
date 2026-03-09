import Button from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import tw from "@/lib/tw";
import { Link } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OnboardIndexScreen() {
  useEffect(() => {
    trackEvent("screen_viewed", { screen_name: "Onboarding" });
    trackEvent("onboarding_started");
  }, []);

  return (
    <SafeAreaView
      style={tw`flex-1 items-center justify-between bg-background px-6 py-20`}
    >
      <View style={tw`flex-1`} />

      <View style={tw`items-center gap-8 px-4`}>
        <View
          style={tw`w-32 h-32 rounded-full bg-grape/20 items-center justify-center mb-4`}
        >
          <Text style={tw`text-6xl`}>✨</Text>
        </View>

        <View style={tw`items-center gap-4`}>
          <Text
            style={tw`text-5xl text-charcoal font-gabarito font-black text-center leading-tight`}
          >
            Welcome to{"\n"}Wingman
          </Text>
          <Text
            style={tw`text-xl text-charcoal/80 font-gabarito text-center leading-relaxed px-6`}
          >
            Your partner in building stronger relationships through thoughtful
            actions
          </Text>
        </View>
      </View>

      <View style={tw`flex-1`} />

      <View style={tw`w-full gap-4`}>
        <Link href="/areas" asChild>
          <Button>Get Started</Button>
        </Link>
      </View>
    </SafeAreaView>
  );
}
