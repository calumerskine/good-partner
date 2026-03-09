import { Platform } from "react-native";
import { LogLevel, OneSignal } from "react-native-onesignal";
import { env } from "./env";

class OneSignalService {
  public hasInitialised = false;

  async initialise(userId: string, logLevel: LogLevel = LogLevel.Verbose) {
    if (Platform.OS === "web" || this.hasInitialised) return;

    OneSignal.Debug.setLogLevel(logLevel);
    OneSignal.initialize(env.onesignal.appId);
    OneSignal.login(userId);

    this.hasInitialised = true;
  }

  async getPermission() {
    let hasPermission = await OneSignal.Notifications.getPermissionAsync();

    if (!hasPermission) {
      hasPermission = await OneSignal.Notifications.requestPermission(true);
    }

    return hasPermission;
  }
}

export const oneSignalService = new OneSignalService();
