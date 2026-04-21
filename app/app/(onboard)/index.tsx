import { useAuth } from "@/hooks/use-auth";
import { trackEvent } from "@/lib/analytics";
import { useCreateUserProfile, useGetCategories } from "@/lib/api";
import tw from "@/lib/tw";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { WelcomeStep } from "./steps/welcome";
import { TransitionStep } from "./steps/transition";
import { RelationshipStep } from "./steps/relationship";
import { FocusStep } from "./steps/focus";
import { GenderStep } from "./steps/gender";
import { AuthStep } from "./steps/auth";

export type OnboardingData = {
  relationshipStatus: string | null;
  focusAreas: string[];
  gender: string | null;
};

export default function OnboardWizard() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const createProfileMutation = useCreateUserProfile();
  const { data: categories = [] } = useGetCategories();

  const [displayStep, setDisplayStep] = useState<number | null>(null);
  const [data, setData] = useState<OnboardingData>({
    relationshipStatus: null,
    focusAreas: [],
    gender: null,
  });

  const translateX = useRef(new Animated.Value(0)).current;

  // Resolve initial step once auth state is known
  useEffect(() => {
    if (!authLoading && displayStep === null) {
      trackEvent("screen_viewed", { screen_name: "Onboarding" });
      if (user) {
        trackEvent("onboarding_started");
      }
      if (!user) trackEvent("onboarding_step_viewed", { step: "welcome" });
      setDisplayStep(user ? 2 : 0);
    }
  }, [authLoading, user, displayStep]);

  const animateToStep = (nextStep: number, direction: "forward" | "back") => {
    const outValue = direction === "forward" ? -width : width;
    const inValue = direction === "forward" ? width : -width;

    Animated.timing(translateX, {
      toValue: outValue,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setDisplayStep(nextStep);
      translateX.setValue(inValue);
      Animated.timing(translateX, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    });
  };

  const goForward = (nextStep: number) => animateToStep(nextStep, "forward");
  const goBack = () => {
    trackEvent("onboarding_back_tapped", { from_step: displayStep });
    animateToStep((displayStep ?? 2) - 1, "back");
  };

  const getCategoryIds = (keys: string[]): string[] => {
    const nameToId = categories.reduce(
      (acc, cat) => {
        acc[cat.name] = cat.id;
        return acc;
      },
      {} as Record<string, string>,
    );
    return keys
      .map((k) => {
        if (!nameToId[k]) {
          console.warn(`[onboarding] category key "${k}" not found in DB`);
        }
        return nameToId[k];
      })
      .filter((id): id is string => Boolean(id));
  };

  const submitProfile = async (userId: string) => {
    await createProfileMutation.mutateAsync({
      userId,
      categoryIds: getCategoryIds(data.focusAreas),
      hasCompletedOnboarding: true,
      relationshipStatus: data.relationshipStatus,
      gender: data.gender,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    trackEvent("onboarding_completed");
    router.replace("/(tabs)/(home)");
  };

  // Already-authenticated users finish at step 4 — skip to profile creation
  const handleStep4Next = async () => {
    if (user) {
      await submitProfile(user.id);
    } else {
      goForward(5);
    }
  };

  const handleComplete = async (userId: string) => {
    await submitProfile(userId);
  };

  const handleExistingUser = async (_userId: string) => {
    trackEvent("onboarding_completed");
    router.replace("/(tabs)/(home)");
  };

  if (authLoading || displayStep === null) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-white`}>
        <ActivityIndicator size="large" color="#2E3130" />
      </View>
    );
  }

  const showBack = displayStep >= 1 && displayStep <= 4;
  const showProgress = displayStep >= 2 && displayStep <= 4;
  const progressStep = displayStep - 1; // step 2 → 1, step 3 → 2, step 4 → 3

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      {/* Header row: back + progress */}
      <View style={tw`px-4 pt-2 pb-4 min-h-14 justify-center`}>
        {showBack && (
          <TouchableOpacity onPress={goBack} style={tw`absolute left-4 p-2`}>
            <ChevronLeft size={24} color={tw.color("ink")} />
          </TouchableOpacity>
        )}
        {showProgress && (
          <View style={tw`items-center`}>
            <Text style={tw`text-ink font-gabarito text-sm mb-2`}>
              Step {progressStep} of 3
            </Text>
            <View style={tw`w-32 h-2 bg-gray-200 rounded-full`}>
              <View
                style={[
                  tw`h-2 bg-indigo-400 rounded-full`,
                  { width: `${(progressStep / 3) * 100}%` },
                ]}
              />
            </View>
          </View>
        )}
      </View>

      {/* Animated step content */}
      <Animated.View style={[tw`flex-1`, { transform: [{ translateX }] }]}>
        {displayStep === 0 && (
          <WelcomeStep
            onNext={() => {
              trackEvent("onboarding_started");
              goForward(1);
            }}
          />
        )}
        {displayStep === 1 && <TransitionStep onNext={() => goForward(2)} />}
        {displayStep === 2 && (
          <RelationshipStep
            selected={data.relationshipStatus}
            onSelect={(v) => {
              trackEvent("onboarding_relationship_selected", { value: v });
              setData((d) => ({ ...d, relationshipStatus: v }));
            }}
            onNext={() => goForward(3)}
          />
        )}
        {displayStep === 3 && (
          <FocusStep
            selected={data.focusAreas}
            onToggle={(key) => {
              const isRemoving = data.focusAreas.includes(key);
              trackEvent("onboarding_focus_toggled", {
                category: key,
                selected: !isRemoving,
              });
              setData((d) => ({
                ...d,
                focusAreas: d.focusAreas.includes(key)
                  ? d.focusAreas.filter((k) => k !== key)
                  : [...d.focusAreas, key],
              }));
            }}
            onNext={() => goForward(4)}
          />
        )}
        {displayStep === 4 && (
          <GenderStep
            selected={data.gender}
            onSelect={(v) => {
              trackEvent("onboarding_gender_selected", { value: v });
              setData((d) => ({ ...d, gender: v }));
            }}
            onNext={handleStep4Next}
            isSubmitting={createProfileMutation.isPending}
          />
        )}
        {displayStep === 5 && <AuthStep onComplete={handleComplete} onExistingUser={handleExistingUser} />}
      </Animated.View>
    </SafeAreaView>
  );
}
