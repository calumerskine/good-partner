import notifee, { EventType, Event } from "@notifee/react-native";
import { router } from "expo-router";

class NotifeeService {
  private currentNotificationId: string | null = null;

  async requestPermission(): Promise<boolean> {
    const settings = await notifee.requestPermission();
    return settings.authorizationStatus >= 1;
  }

  async displayActionNotification(userActionId: string, actionTitle: string) {
    await this.cancelActionNotification();

    this.currentNotificationId = await notifee.displayNotification({
      title: "Action in Progress",
      body: actionTitle,
      data: { userActionId },
      ios: {
        foregroundPresentationOptions: {
          badge: false,
          sound: false,
          banner: true,
        },
      },
    });
  }

  async cancelActionNotification() {
    if (this.currentNotificationId) {
      await notifee.cancelNotification(this.currentNotificationId);
      this.currentNotificationId = null;
    }
  }

  onForegroundEvent(callback: (event: Event) => void) {
    return notifee.onForegroundEvent(callback);
  }
}

export const notifeeService = new NotifeeService();

// Must be registered at module level (outside React) for background events
notifee.onBackgroundEvent(async (event) => {
  if (event.type === EventType.PRESS && event.detail.notification?.data?.userActionId) {
    const userActionId = event.detail.notification.data.userActionId as string;
    router.push(`/(action)/${userActionId}` as any);
  }
});
