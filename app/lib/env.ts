import { z } from "zod";

export const env = z
  .object({
    environment: z.enum(["development", "staging", "production"]),
    flags: z.object({
      useAnalytics: z.boolean(),
      useReminders: z.boolean(),
    }),
    onesignal: z.object({
      appId: z.string(),
    }),
    amplitude: z.object({
      apiKey: z.string(),
    }),
    supabase: z.object({
      url: z.string(),
      anonKey: z.string(),
    }),
  })
  .parse({
    environment: process.env.EXPO_PUBLIC_ENV ?? "development",
    flags: {
      useAnalytics: process.env.EXPO_PUBLIC_ANALYTICS === "true",
      useReminders: process.env.EXPO_PUBLIC_REMINDERS === "true",
    },
    onesignal: {
      appId: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID,
    },
    amplitude: {
      apiKey: process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY,
    },
    supabase: {
      url: process.env.EXPO_PUBLIC_SUPABASE_URL,
      anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
  });
