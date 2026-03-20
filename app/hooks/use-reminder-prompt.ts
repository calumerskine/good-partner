import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { useGetNotificationsEnabled } from "@/lib/api";
import { env } from "@/lib/env";

const STORAGE_KEY = "@good-partner/reminder-prompt-shown";

export function useReminderPrompt(userId?: string) {
  const [hasBeenShown, setHasBeenShown] = useState(true); // default true = don't show until we know
  const [storageLoaded, setStorageLoaded] = useState(false);
  const markingRef = useRef(false);

  const { data: notificationsEnabled } = useGetNotificationsEnabled(userId);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      setHasBeenShown(value === "true");
      setStorageLoaded(true);
    });
  }, []);

  const shouldPrompt =
    storageLoaded &&
    env.flags.useReminders &&
    notificationsEnabled === false &&
    !hasBeenShown;

  const markShown = () => {
    if (markingRef.current) return; // once-per-mount guard
    markingRef.current = true;
    setHasBeenShown(true); // optimistic — callers don't need to await
    AsyncStorage.setItem(STORAGE_KEY, "true").catch(() => {
      // best-effort — do not block navigation
    });
  };

  return { shouldPrompt, markShown };
}
