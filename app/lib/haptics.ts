import * as Haptics from "expo-haptics";

export type HapticPreset =
  | "selection"
  | "impactLight"
  | "impactMedium"
  | "success"
  | "warning"
  | "error";

export function triggerPreset(preset: HapticPreset): void {
  switch (preset) {
    case "selection":
      Haptics.selectionAsync().catch(() => {});
      break;
    case "impactLight":
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      break;
    case "impactMedium":
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      break;
    case "success":
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );
      break;
    case "warning":
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
        () => {},
      );
      break;
    case "error":
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
        () => {},
      );
      break;
  }
}
