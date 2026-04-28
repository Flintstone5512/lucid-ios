// src/services/nativeBridge.js

import { NativeModules, Platform } from "react-native";

const isDev = __DEV__;

const {
  ScreenTimeAuthorizationModule,
  FamilyActivityPickerModule,
  ShieldControlModule,
  DeviceActivityMonitorModule,
  UsageAccessModule,
  OverlayPermissionModule,
  AccessibilityBridgeModule,
  BlockingOverlayModule,
  EnforcementModule,
} = NativeModules;

/* =========================
   🔵 iOS FUNCTIONS
========================= */

export async function requestIOSAuthorization() {
  if (isDev) {
    console.log("[DEV] requestIOSAuthorization");
    return { ok: true };
  }

  if (Platform.OS !== "ios") return { ok: false, reason: "Not iOS" };

  if (!ScreenTimeAuthorizationModule?.requestAuthorization) {
    return { ok: false, reason: "Missing ScreenTimeAuthorizationModule" };
  }

  return ScreenTimeAuthorizationModule.requestAuthorization();
}

export async function getIOSAuthorizationStatus() {
  if (isDev) {
    console.log("[DEV] getIOSAuthorizationStatus");
    return { ok: true, status: "approved" };
  }

  if (Platform.OS !== "ios") return { ok: false, reason: "Not iOS" };

  return ScreenTimeAuthorizationModule?.getAuthorizationStatus?.() || {
    ok: false,
    reason: "Missing module",
  };
}

export async function presentAppPicker() {
  if (isDev) {
    console.log("[DEV] presentAppPicker");
    return { ok: true, tokens: [] };
  }

  if (Platform.OS !== "ios") return { ok: false, reason: "Not iOS" };

  return FamilyActivityPickerModule?.presentAppPicker?.() || {
    ok: false,
    reason: "Missing module",
  };
}

export async function saveSelectedApps(tokens = []) {
  if (isDev) {
    console.log("[DEV] saveSelectedApps:", tokens);
    return { ok: true };
  }

  if (Platform.OS !== "ios") return { ok: false, reason: "Not iOS" };

  return FamilyActivityPickerModule?.saveSelectedApps?.(tokens) || {
    ok: false,
    reason: "Missing module",
  };
}

export async function getSelectedApps() {
  if (isDev) {
    console.log("[DEV] getSelectedApps");
    return { ok: true, apps: [] };
  }

  if (Platform.OS !== "ios") return { ok: false, reason: "Not iOS" };

  return FamilyActivityPickerModule?.getSelectedApps?.() || {
    ok: false,
    reason: "Missing module",
  };
}

export async function applyShield(appTokens = []) {
  if (isDev) {
    console.log("[DEV] applyShield:", appTokens);
    return { ok: true };
  }

  if (Platform.OS !== "ios") return { ok: true };

  return ShieldControlModule?.applyShield?.(appTokens) || {
    ok: false,
    reason: "Missing module",
  };
}

export async function clearShield() {
  if (isDev) {
    console.log("[DEV] clearShield");
    return { ok: true };
  }

  if (Platform.OS !== "ios") return { ok: true };

  return ShieldControlModule?.clearShield?.() || {
    ok: false,
    reason: "Missing module",
  };
}

export async function scheduleUnlockWindow(expiresAt) {
  if (isDev) {
    console.log("[DEV] scheduleUnlockWindow:", expiresAt);
    return { ok: true };
  }

  if (Platform.OS !== "ios") return { ok: false, reason: "Not iOS" };

  return ShieldControlModule?.scheduleUnlockWindow?.(expiresAt) || {
    ok: false,
    reason: "Missing module",
  };
}

export async function startMonitoringBlockedApps() {
  if (isDev) {
    console.log("[DEV] startMonitoringBlockedApps");
    return { ok: true };
  }

  if (Platform.OS !== "ios") return { ok: false, reason: "Not iOS" };

  return DeviceActivityMonitorModule?.startMonitoringBlockedApps?.() || {
    ok: false,
    reason: "Missing module",
  };
}

/* =========================
   🟢 ANDROID PERMISSIONS
========================= */

export async function requestAndroidUsageAccess() {
  if (isDev) {
    console.log("[DEV] requestAndroidUsageAccess");
    return { ok: true, granted: true };
  }

  if (Platform.OS !== "android") return { ok: false, reason: "Not Android" };

  if (!UsageAccessModule) {
    return { ok: false, reason: "UsageAccessModule missing" };
  }

  const status = await UsageAccessModule.hasUsageAccess?.();

  if (status?.granted) {
    return { ok: true, granted: true, alreadyGranted: true };
  }

  await UsageAccessModule.openUsageAccessSettings?.();
  return { ok: true, redirected: true };
}

export async function requestAndroidOverlayAccess() {
  if (isDev) {
    console.log("[DEV] requestAndroidOverlayAccess");
    return { ok: true, granted: true };
  }

  if (Platform.OS !== "android") return { ok: false, reason: "Not Android" };

  const status = await OverlayPermissionModule?.hasOverlayPermission?.();

  if (status?.granted) {
    return { ok: true, granted: true, alreadyGranted: true };
  }

  await OverlayPermissionModule?.openOverlaySettings?.();
  return { ok: true, redirected: true };
}

export async function requestAndroidAccessibilityAccess() {
  if (isDev) {
    console.log("[DEV] requestAndroidAccessibilityAccess");
    return { ok: true, enabled: true };
  }

  if (Platform.OS !== "android") return { ok: false, reason: "Not Android" };

  const status = await AccessibilityBridgeModule?.isAccessibilityEnabled?.();

  if (status?.enabled) {
    return { ok: true, enabled: true, alreadyGranted: true };
  }

  await AccessibilityBridgeModule?.openAccessibilitySettings?.();
  return { ok: true, redirected: true };
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
   🔥 FOREGROUND DETECTION
========================= */

export async function getForegroundApp() {
  if (isDev) {
    console.log("[DEV] getForegroundApp");
    return "com.dev.mockapp";
  }

  if (Platform.OS !== "android") return null;

  try {
    return await UsageAccessModule?.getForegroundApp?.();
  } catch (err) {
    console.log("Foreground error:", err);
    return null;
  }
}

/* =========================
   🔥 BLOCKING OVERLAY
========================= */

export async function showBlockingOverlay() {
  if (isDev) {
    console.log("[DEV] showBlockingOverlay");
    return { ok: true };
  }

  if (Platform.OS !== "android") return { ok: false, reason: "Not Android" };

  try {
    await BlockingOverlayModule?.showBlockingOverlay?.();
    return { ok: true };
  } catch (err) {
    console.log("showBlockingOverlay error:", err);
    return { ok: false, reason: "Overlay failed" };
  }
}

export async function hideBlockingOverlay() {
  if (isDev) {
    console.log("[DEV] hideBlockingOverlay");
    return { ok: true };
  }

  if (Platform.OS !== "android") return { ok: false, reason: "Not Android" };

  try {
    await BlockingOverlayModule?.hideBlockingOverlay?.();
    return { ok: true };
  } catch (err) {
    console.log("hideBlockingOverlay error:", err);
    return { ok: false, reason: "Overlay hide failed" };
  }
}

/* =========================
   🔥 ENFORCEMENT ENGINE
========================= */

export async function setBlockedApps(packages = []) {
  if (isDev) {
    console.log("[DEV] setBlockedApps:", packages);
    return { ok: true };
  }

  if (Platform.OS !== "android") return { ok: false, reason: "Not Android" };

  try {
    await EnforcementModule?.saveMonitoredPackages?.(packages);
    return { ok: true };
  } catch (err) {
    console.log("setBlockedApps error:", err);
    return { ok: false, reason: "Failed to save packages" };
  }
}

export async function enableAndroidEnforcement(packages = []) {
  if (isDev) {
    console.log("[DEV] enableAndroidEnforcement:", packages);
    return { ok: true };
  }

  if (Platform.OS !== "android") return { ok: false, reason: "Not Android" };

  try {
    await EnforcementModule?.saveMonitoredPackages?.(packages);
    await EnforcementModule?.startForegroundEnforcement?.();
    return { ok: true };
  } catch (err) {
    console.log("Enforcement start error:", err);
    return { ok: false, reason: "Failed to start enforcement" };
  }
}

export async function disableAndroidEnforcement() {
  if (isDev) {
    console.log("[DEV] disableAndroidEnforcement");
    return { ok: true };
  }

  if (Platform.OS !== "android") return { ok: false, reason: "Not Android" };

  try {
    await EnforcementModule?.stopForegroundEnforcement?.();
    return { ok: true };
  } catch (err) {
    console.log("Enforcement stop error:", err);
    return { ok: false, reason: "Failed to stop enforcement" };
  }
}

/* =========================
   🔥 UNLOCK SYSTEM
========================= */

export async function grantAndroidUnlock(expiresAt) {
  if (isDev) {
    console.log("[DEV] grantAndroidUnlock:", expiresAt);
    return { ok: true, expiresAt };
  }

  if (Platform.OS !== "android") return { ok: false, reason: "Not Android" };

  try {
    const epoch = new Date(expiresAt).getTime();
    await EnforcementModule?.grantUnlockWindow?.(epoch);
    return { ok: true, expiresAt };
  } catch (err) {
    console.log("Unlock error:", err);
    return { ok: false, reason: "Failed to grant unlock" };
  }
}

export async function getAndroidUnlockStatus() {
  if (isDev) {
    console.log("[DEV] getAndroidUnlockStatus");
    return { unlocked: true, expiresAt: Date.now() + 600000 };
  }

  if (Platform.OS !== "android") {
    return { unlocked: false, expiresAt: null };
  }

  try {
    const result = await EnforcementModule?.getUnlockStatus?.();

    return (
      result || {
        unlocked: false,
        expiresAt: null,
      }
    );
  } catch (err) {
    console.log("getAndroidUnlockStatus error:", err);
    return { unlocked: false, expiresAt: null };
  }
}