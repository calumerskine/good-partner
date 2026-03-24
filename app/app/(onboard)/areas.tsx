import { CategoryButton } from "@/components/category-button";
import Button from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { trackEvent } from "@/lib/analytics";
import { useCreateUserProfile, useGetCategories } from "@/lib/api";
import { ActionTypes } from "@/lib/state/actions.model";
import tw from "@/lib/tw";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PAIN_POINTS = {
  ATTENTION: {
    title: "Being more present & connected",
    description: "Focus on quality time and active listening",
    color: ActionTypes.ATTENTION.color,
  },
  AFFECTION: {
    title: "Showing more affection & appreciation",
    description: "Express love through words and actions",
    color: ActionTypes.AFFECTION.color,
  },
  INITIATIVE: {
    title: "Taking ownership & sharing mental load",
    description: "Plan dates and manage tasks together",
    color: ActionTypes.INITIATIVE.color,
  },
  REPAIR: {
    title: "Handling conflicts & emotions",
    description: "Build better communication and resolution skills",
    color: ActionTypes.REPAIR.color,
  },
};

export default function OnboardAreasScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedCategoryNames, setSelectedCategoryNames] = useState<string[]>(
    [],
  );

  const { data: categories = [], isLoading } = useGetCategories();

  useEffect(() => {
    trackEvent("screen_viewed", { screen_name: "Onboarding Areas" });
  }, []);
  const createProfileMutation = useCreateUserProfile();

  // Create a map of category names to IDs for easy lookup
  const categoryNameToId = categories.reduce(
    (acc, category) => {
      acc[category.name] = category.id;
      return acc;
    },
    {} as Record<string, string>,
  );

  const onSubmit = async () => {
    if (!user || selectedCategoryNames.length === 0) {
      return;
    }

    try {
      // Convert selected category names to their UUIDs
      const chosenCategoryIds = selectedCategoryNames
        .map((name) => categoryNameToId[name])
        .filter(Boolean);

      trackEvent("onboarding_focus_area_selected", {
        categories: selectedCategoryNames,
      });

      await createProfileMutation.mutateAsync({
        userId: user.id,
        categoryIds: chosenCategoryIds,
        hasCompletedOnboarding: true,
      });

      trackEvent("onboarding_completed", {
        categories: selectedCategoryNames,
      });
      router.push("/(tabs)/(home)");
    } catch (error) {
      console.error("Error creating profile:", error);
      // TODO: Show error message to user
    }
  };

  const onPressCategory = (categoryName: string) => {
    setSelectedCategoryNames((prev) => {
      if (prev.includes(categoryName)) {
        return prev.filter((name) => name !== categoryName);
      } else {
        return [...prev, categoryName];
      }
    });
  };

  if (isLoading) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white`}>
        <ActivityIndicator size="large" color="#2E3130" />
      </View>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-6 pt-8 pb-8`}
        showsVerticalScrollIndicator={false}
      >
        <View style={tw`mb-8`}>
          <Text
            style={tw`text-4xl text-charcoal font-gabarito font-black mb-3`}
          >
            Choose Your Focus
          </Text>
          <Text
            style={tw`text-lg text-charcoal/80 font-gabarito leading-relaxed`}
          >
            Select the areas you'd like to improve in your relationship. You can
            choose multiple.
          </Text>
        </View>

        <View style={tw`mb-6`}>
          {Object.entries(PAIN_POINTS).map(([key, value]) => {
            return (
              <CategoryButton
                key={key}
                text={value.title}
                description={value.description}
                color={value.color}
                category={key}
                onPress={onPressCategory}
                selected={selectedCategoryNames.includes(key)}
              />
            );
          })}
        </View>
      </ScrollView>

      <View style={tw`p-6 pb-2 bg-white`}>
        <Button
          onPress={onSubmit}
          disabled={
            selectedCategoryNames.length === 0 ||
            createProfileMutation.isPending ||
            !user
          }
        >
          {createProfileMutation.isPending ? "Getting Started..." : "Continue"}
        </Button>
        <View style={tw`h-5 mt-2`}>
          {selectedCategoryNames.length === 0 && (
            <Text style={tw`text-charcoal/80 font-gabarito text-center`}>
              Please select at least one area to continue
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
