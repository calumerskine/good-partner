import { env } from "@/lib/env";
import { oneSignalService } from "@/lib/onesignal";
import { useEffect } from "react";
import { useAuth } from "./use-auth";

export function useReminders() {
  const { user } = useAuth();

  useEffect(() => {
    if (user && env.flags.useReminders) {
      oneSignalService.initialise(user.id);
    }
  }, [user]);

  return oneSignalService.hasInitialised;
}
