import { NativeModules, Platform } from "react-native";
import * as ScreenTime from "../modules/screen-time";

const isDev = __DEV__;

const {
  UsageAccessModule,
  OverlayPermissionModule,
  AccessibilityBridgeModule,
  BlockingOverlayModule,
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

export async function startMonitoringBlockedApps() {
  return { ok: true };
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
