import { NativeModules, Platform } from "react-native";

const { LucidScreenTimeModule } = NativeModules;

function assertIOS() {
  if (Platform.OS !== "ios") {
    throw new Error("Lucid Screen Time module is only available on iOS.");
  }

  if (!LucidScreenTimeModule) {
    throw new Error(
      "LucidScreenTimeModule is not linked. Run expo prebuild and rebuild the iOS app."
    );
  }
}

export async function requestIOSScreenTimeAuthorization() {
  assertIOS();
  return LucidScreenTimeModule.requestAuthorization();
}

export async function getIOSScreenTimeAuthorizationStatus() {
  assertIOS();
  return LucidScreenTimeModule.getAuthorizationStatus();
}

export async function presentIOSAppPicker() {
  assertIOS();
  return LucidScreenTimeModule.presentAppPicker();
}

export async function applyIOSShield() {
  assertIOS();
  return LucidScreenTimeModule.applyShield();
}

export async function clearIOSShield() {
  assertIOS();
  return LucidScreenTimeModule.clearShield();
}

export async function unlockIOSForMinutes(minutes: number) {
  assertIOS();

  if (!Number.isFinite(minutes) || minutes <= 0) {
    throw new Error("Unlock minutes must be greater than 0.");
  }

  return LucidScreenTimeModule.unlockForMinutes(Math.round(minutes));
}