import { NativeModules, Platform } from "react-native";

const isDev = false;

const {
  ScreenTimeAuthorizationModule,
  FamilyActivityPickerModule,
  ShieldControlModule,
  DeviceActivityMonitorModule,
  UsageAccessModule,
  OverlayPermissionModule,
  AccessibilityBridgeModule,
  BlockingOverlayModule, // ✅ ONLY native module we rely on now
} = NativeModules;

/* =========================
   🔵 iOS FUNCTIONS
========================= */

export async function requestIOSAuthorization() {
  if (isDev) return { ok: true };

  if (Platform.OS !== "ios") return { ok: false };

  return ScreenTimeAuthorizationModule?.requestAuthorization?.() || {
    ok: false,
  };
}

export async function getIOSAuthorizationStatus() {
  if (isDev) return { ok: true, status: "approved" };

  if (Platform.OS !== "ios") return { ok: false };

  return ScreenTimeAuthorizationModule?.getAuthorizationStatus?.() || {
    ok: false,
  };
}

export async function presentAppPicker() {
  if (isDev) return { ok: true, tokens: [] };

  if (Platform.OS !== "ios") return { ok: false };

  return FamilyActivityPickerModule?.presentAppPicker?.() || {
    ok: false,
  };
}

export async function saveSelectedApps(tokens = []) {
  if (isDev) return { ok: true };

  if (Platform.OS !== "ios") return { ok: false };

  return FamilyActivityPickerModule?.saveSelectedApps?.(tokens) || {
    ok: false,
  };
}

export async function getSelectedApps() {
  if (isDev) return { ok: true, apps: [] };

  if (Platform.OS !== "ios") return { ok: false };

  return FamilyActivityPickerModule?.getSelectedApps?.() || {
    ok: false,
  };
}

export async function applyShield(appTokens = []) {
  if (isDev) return { ok: true };

  if (Platform.OS !== "ios") return { ok: true };

  return ShieldControlModule?.applyShield?.(appTokens) || { ok: false };
}

export async function clearShield() {
  if (isDev) return { ok: true };

  if (Platform.OS !== "ios") return { ok: true };

  return ShieldControlModule?.clearShield?.() || { ok: false };
}

export async function scheduleUnlockWindow(expiresAt) {
  if (isDev) return { ok: true };

  if (Platform.OS !== "ios") return { ok: false };

  return ShieldControlModule?.scheduleUnlockWindow?.(expiresAt) || {
    ok: false,
  };
}

export async function startMonitoringBlockedApps() {
  if (isDev) return { ok: true };

  if (Platform.OS !== "ios") return { ok: false };

  return DeviceActivityMonitorModule?.startMonitoringBlockedApps?.() || {
    ok: false,
  };
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
  if (isDev) return { ok: true };

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
  if (isDev) return { ok: true };

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
