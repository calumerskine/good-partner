import * as amplitude from "@amplitude/analytics-react-native";
import { SessionReplayPlugin } from "@amplitude/plugin-session-replay-react-native";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { UserProfile } from "./api";
import { env } from "./env";

const globals = {
  app_version: Constants.expoConfig?.version ?? "unknown",
  platform: Platform.OS,
  environment: env.environment,
};

export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>,
) {
  amplitude.track(eventName, { ...globals, ...properties });
}

export async function initialiseAnalytics(
  userId: string,
  tier: UserProfile["userTier"],
) {
  if (!env.flags.useAnalytics) {
    return;
  }

  await amplitude.init(env.amplitude.apiKey, userId, {
    serverZone: "EU",
    disableCookies: true,
  }).promise;
  await amplitude.add(
    new SessionReplayPlugin({
      autoStart: true,
      sampleRate: 1,
      enableRemoteConfig: true,
    }),
  ).promise;
  setUserTier(tier);
}

function setUserTier(tier: UserProfile["userTier"]) {
  amplitude.setGroup("user_tier", tier);
}
