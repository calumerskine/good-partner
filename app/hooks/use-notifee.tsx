import { useAuth } from "@/hooks/use-auth";
import {
  useGetActiveActions,
  useGetActionNotificationsEnabled,
} from "@/lib/api";
import { env } from "@/lib/env";
import { notifeeService } from "@/lib/notifee";
import { EventType } from "@notifee/react-native";
import { router } from "expo-router";
import { useEffect, useRef } from "react";

export function useNotifee() {
  const { user } = useAuth();
  const userId = env.flags.useActionNotifications ? user?.id : undefined;
  const { data: activeActions } = useGetActiveActions(userId);
  const { data: actionNotificationsEnabled } =
    useGetActionNotificationsEnabled(userId);
  const prevActiveActionId = useRef<string | null>(null);

  // Navigate to action on notification press (foreground)
  useEffect(() => {
    if (!env.flags.useActionNotifications) return;

    return notifeeService.onForegroundEvent((event) => {
      if (
        event.type === EventType.PRESS &&
        event.detail.notification?.data?.userActionId
      ) {
        router.push(
          `/(action)/${event.detail.notification.data.userActionId as string}` as any,
        );
      }
    });
  }, []);

  // Show/cancel notification based on active action state
  useEffect(() => {
    if (!env.flags.useActionNotifications) return;

    if (!actionNotificationsEnabled) {
      if (prevActiveActionId.current) {
        notifeeService.cancelActionNotification();
        prevActiveActionId.current = null;
      }
      return;
    }

    const activeAction = activeActions?.[0];
    const activeActionId = activeAction?.id ?? null;

    if (activeActionId && activeActionId !== prevActiveActionId.current) {
      notifeeService.displayActionNotification(
        activeActionId,
        activeAction?.action?.title ?? "",
      );
      prevActiveActionId.current = activeActionId;
    } else if (!activeActionId && prevActiveActionId.current) {
      notifeeService.cancelActionNotification();
      prevActiveActionId.current = null;
    }
  }, [activeActions, actionNotificationsEnabled]);
}
