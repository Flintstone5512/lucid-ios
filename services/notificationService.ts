import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { registerPushToken } from "./api";

export async function registerForPushNotifications() {
  if (!Device.isDevice) return;

  const { status } = await Notifications.requestPermissionsAsync();

  if (status !== "granted") return;

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  // Register with backend so the server can push-notify this device
  if (token) {
    await registerPushToken(token);
  }

  return token;
}

export async function registerCramNotificationCategory() {
  await Notifications.setNotificationCategoryAsync("CRAM_CARD", [
    {
      identifier: "pause_cram",
      buttonTitle: "⏸ Pause Session",
      options: {
        // iOS: don't open the app when this action is tapped
        opensAppToForeground: false,
        isDestructive: false,
        isAuthenticationRequired: false,
      },
    },
    {
      identifier: "got_it_cram",
      buttonTitle: "✓ Got It",
      options: { opensAppToForeground: false, isDestructive: false, isAuthenticationRequired: false },
    },
    {
      identifier: "hard_cram",
      buttonTitle: "✗ Hard",
      options: { opensAppToForeground: false, isDestructive: false, isAuthenticationRequired: false },
    },
  ]);
}

export async function sendWastedTimeNotification(minutes: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `You just lost ${minutes} minutes`,
      body: "Convert it into progress. Open the app.",
    },
    trigger: null,
  });
}