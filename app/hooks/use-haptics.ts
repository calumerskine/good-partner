import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { type HapticPreset, triggerPreset } from "@/lib/haptics";

export type { HapticPreset };

const STORAGE_KEY = "@good-partner/haptics-enabled";

export function useHaptics() {
  // Default true matches the documented default (haptics on).
  // This also prevents trigger() from silently no-oping before the AsyncStorage
  // read completes on first render.
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        // null = key absent (first run) → keep default true
        if (value !== null) {
          setHapticsEnabled(value === "true");
        }
        setLoaded(true);
      })
      .catch(() => {
        setLoaded(true);
      });
  }, []);

  const toggleHaptics = useCallback(() => {
    if (!loaded) return; // guard against toggling before preference is known
    const next = !hapticsEnabled;
    setHapticsEnabled(next);
    AsyncStorage.setItem(STORAGE_KEY, String(next)).catch(() => {});
  }, [hapticsEnabled, loaded]);

  const trigger = useCallback(
    (preset: HapticPreset) => {
      if (!hapticsEnabled) return;
      triggerPreset(preset);
    },
    [hapticsEnabled],
  );

  return { hapticsEnabled, loaded, toggleHaptics, trigger };
}
