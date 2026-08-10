import { NativeModules, Platform } from "react-native";
import * as ScreenTime from "../modules/screen-time";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

const isDev = __DEV__;

const {
  UsageAccessModule,
  OverlayPermissionModule,
  AccessibilityBridgeModule,
  BlockingOverlayModule,
  DeviceActivityMonitorModule,
} = NativeModules;

/* =========================
   🔵 iOS FUNCTIONS
========================= */

export async function requestIOSAuthorization() {
  if (Platform.OS !== "ios") return { ok: false };
  return ScreenTime.requestAuthorization();
}

export async function getIOSAuthorizationStatus() {
  if (Platform.OS !== "ios") return { ok: false, status: "unknown" };
  return ScreenTime.getAuthorizationStatus();
}

export async function presentAppPicker() {
  if (Platform.OS !== "ios") return { ok: false };
  return ScreenTime.presentAppPicker();
}

export async function hasIOSAppSelection() {
  if (Platform.OS !== "ios") return { ok: false, hasSelection: false };
  return ScreenTime.hasSelection();
}

export async function getIOSShieldStatus() {
  if (Platform.OS !== "ios") return { ok: false, isShielded: false };
  return ScreenTime.getShieldStatus();
}

export async function saveSelectedApps(_tokens = []) {
  return { ok: true };
}

export async function getSelectedApps() {
  return { ok: true };
}

export async function applyShield(_appTokens = []) {
  if (Platform.OS !== "ios") return { ok: true };
  return ScreenTime.applyShield();
}

export async function clearShield() {
  if (Platform.OS !== "ios") return { ok: true };
  return ScreenTime.clearShield();
}

export async function scheduleUnlockWindow(expiresAt: number) {
  if (Platform.OS !== "ios") return { ok: false };
  const minutes = Math.max(1, Math.round((expiresAt - Date.now()) / 60000));
  return ScreenTime.unlockForMinutes(minutes);
}

export async function startMonitoringBlockedApps(overrideLimitMinutes = 0) {
  if (Platform.OS !== "ios") return { ok: true };
  return ScreenTime.startMonitoringBlockedApps(overrideLimitMinutes);
}

// Pre-schedule the "scroll limit reached" notification from the JS layer.
// The DeviceActivityMonitor extension also tries to send one when the threshold
// fires, but extension UNUserNotificationCenter calls can be silently dropped.
// This JS-side version is reliable and fires at roughly the right clock time.
// Cancel + reschedule whenever monitoring restarts so it stays in sync.
export async function scheduleBlockNotification(inMinutes: number) {
  if (Platform.OS !== "ios") return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;

    await Notifications.cancelScheduledNotificationAsync("lucid-block-upcoming").catch(() => {});

    const secondsUntil = Math.round(inMinutes * 60);
    if (secondsUntil <= 0) return;

    await Notifications.scheduleNotificationAsync({
      identifier: "lucid-block-upcoming",
      content: {
        title: "Scroll limit reached 🧠",
        body: "Open Lucid to complete a quick study session and unlock your apps.",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(Date.now() + secondsUntil * 1000),
      },
    });
  } catch (e) {
    console.error("[NOTIF] scheduleBlockNotification failed:", e);
  }
}

export async function setDailyLimit(minutes: number) {
  if (Platform.OS !== "ios") return { ok: true };
  await AsyncStorage.setItem("blockIntervalMinutes", String(minutes));
  return ScreenTime.setDailyLimit(minutes);
}

/* =========================
   🟢 ANDROID PERMISSIONS
========================= */

export async function requestAndroidUsageAccess() {
  if (isDev) return { ok: true, granted: true };

  if (Platform.OS !== "android") return { ok: false };

  const status = await UsageAccessModule?.hasUsageAccess?.();

  if (status?.granted) return { ok: true, granted: true };

  await UsageAccessModule?.openUsageAccessSettings?.();
  return { ok: true };
}

export async function requestAndroidOverlayAccess() {
  if (isDev) return { ok: true, granted: true };

  if (Platform.OS !== "android") return { ok: false };

  const status = await OverlayPermissionModule?.hasOverlayPermission?.();

  if (status?.granted) return { ok: true, granted: true };

  await OverlayPermissionModule?.openOverlaySettings?.();
  return { ok: true };
}

export async function requestAndroidAccessibilityAccess() {
  if (isDev) return { ok: true, enabled: true };

  if (Platform.OS !== "android") return { ok: false };

  const status = await AccessibilityBridgeModule?.isAccessibilityEnabled?.();

  if (status?.enabled) return { ok: true, enabled: true };

  await AccessibilityBridgeModule?.openAccessibilitySettings?.();
  return { ok: true };
}

export async function hasUsageAccess() {
  if (isDev) return { granted: true };

  if (Platform.OS !== "android") return { granted: false };

  return (await UsageAccessModule?.hasUsageAccess?.()) || { granted: false };
}

export async function hasOverlayPermission() {
  if (isDev) return { granted: true };

  if (Platform.OS !== "android") return { granted: false };

  return (
    (await OverlayPermissionModule?.hasOverlayPermission?.()) || {
      granted: false,
    }
  );
}

export async function isAccessibilityEnabled() {
  if (isDev) return { enabled: true };

  if (Platform.OS !== "android") return { enabled: false };

  return (
    (await AccessibilityBridgeModule?.isAccessibilityEnabled?.()) || {
      enabled: false,
    }
  );
}

/* =========================
   🔥 FOREGROUND DETECTION (DISABLED)
========================= */

export async function getForegroundApp() {
  return null;
}

/* =========================
   🔥 BLOCKING OVERLAY
========================= */
export async function syncEnforcementSettings(settings) {
  if (Platform.OS !== "android") return;

  return BlockingOverlayModule?.setEnforcementSettings(settings);
}

export async function setNativeEnforcementDecision(decision: {
  block: boolean;
  type?: string;
}) {
  if (Platform.OS !== "android") {
    return { ok: false, reason: "Not Android" };
  }

  try {
    const payload = {
      block: Boolean(decision?.block),
      type: decision?.type || "unknown",
      syncedAt: Date.now(),
    };

    await BlockingOverlayModule?.setEnforcementDecision?.(payload);

    return { ok: true };
  } catch (err) {
    console.log("setNativeEnforcementDecision error:", err);
    return { ok: false, reason: "Failed to sync decision" };
  }
}

export async function showBlockingOverlay(packageName = "a blocked app") {
  if (isDev) return { ok: true };

  if (Platform.OS !== "android") return { ok: false };

  try {
    await BlockingOverlayModule?.showBlockingOverlay?.(packageName);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function hideBlockingOverlay() {
  if (Platform.OS !== "android") return { ok: false };

  try {
    await BlockingOverlayModule?.hideBlockingOverlay?.();
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/* =========================
   🔥 UNLOCK SYSTEM (NEW CORE)
========================= */

export async function grantAndroidUnlock(expiresAt) {
  if (Platform.OS !== "android") return { ok: false };

  try {
    const epoch = new Date(expiresAt).getTime();

    await BlockingOverlayModule?.grantUnlockWindow?.(epoch); // ✅ FIXED

    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function grantNativeUnlock(expiresAtIso: string) {
  const epochMs = new Date(expiresAtIso).getTime();
  if (Platform.OS === "android") {
    return grantAndroidUnlock(expiresAtIso);
  } else if (Platform.OS === "ios") {
    const result = await scheduleUnlockWindow(epochMs);
    // Restart DeviceActivity with the ORIGINAL block interval (not the unlock
    // duration). Using unlockMinutes as the threshold (build 41) caused the
    // extension to not fire until the user had that many minutes of usage —
    // if unlock = 30 min, the JS notification fired at 30 min clock time but
    // the shield never re-engaged because usage hadn't reached 30 min yet.
    startMonitoringBlockedApps().catch(() => {});
    // Pre-schedule the re-block notification for the original block interval
    // so it fires roughly when DeviceActivity threshold will be hit.
    AsyncStorage.getItem("blockIntervalMinutes").then((stored) => {
      const limitMinutes = parseInt(stored || "30", 10);
      if (limitMinutes > 0) scheduleBlockNotification(limitMinutes).catch(() => {});
    }).catch(() => {});
    return result;
  }
  return { ok: false };
}

export async function getAndroidUnlockStatus() {
  if (isDev) {
    return {
      unlocked: true,
      expiresAt: new Date(Date.now() + 600000).toISOString(),
    };
  }

  if (Platform.OS !== "android") {
    return { unlocked: false, expiresAt: null };
  }

  try {
    return (
      (await BlockingOverlayModule?.getUnlockStatus?.()) || {
        unlocked: false,
        expiresAt: null,
      }
    );
  } catch {
    return { unlocked: false, expiresAt: null };
  }
}

export async function reopenBlockedApp() {
  if (Platform.OS !== "android") {
    return { ok: false, reason: "Not Android" };
  }

  try {
    await BlockingOverlayModule?.openLastBlockedApp?.();
    return { ok: true };
  } catch (err) {
    console.log("reopenBlockedApp error:", err);
    return { ok: false };
  }
}

/* =========================
   🔥 PARENT SELF-BLOCKING (ANDROID)
========================= */

export async function setAndroidParentSelfBlocking(enabled: boolean) {
  if (Platform.OS !== "android") return { ok: false };
  try {
    await BlockingOverlayModule?.setParentSelfBlocking?.(enabled);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function getAndroidParentSelfBlockingStatus() {
  if (Platform.OS !== "android") return { ok: false, enabled: false };
  try {
    return (
      (await BlockingOverlayModule?.getParentSelfBlocking?.()) || {
        ok: false,
        enabled: false,
      }
    );
  } catch {
    return { ok: false, enabled: false };
  }
}
