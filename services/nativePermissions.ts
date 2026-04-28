import { NativeModules, Platform } from "react-native";

const {
  UsageAccessModule,
  OverlayPermissionModule,
  AccessibilityBridgeModule,
} = NativeModules;

/* =========================
   🔥 ACCESSIBILITY
========================= */

export async function isAccessibilityEnabled() {
  if (Platform.OS !== "android") return { enabled: false };

  return (
    (await AccessibilityBridgeModule?.isAccessibilityEnabled?.()) || {
      enabled: false,
    }
  );
}

export async function requestAndroidAccessibilityAccess() {
  if (Platform.OS !== "android") return;

  await AccessibilityBridgeModule?.openAccessibilitySettings?.();
}

/* =========================
   🔥 OVERLAY
========================= */

export async function hasOverlayPermission() {
  if (Platform.OS !== "android") return { granted: false };

  return (
    (await OverlayPermissionModule?.hasOverlayPermission?.()) || {
      granted: false,
    }
  );
}

export async function requestAndroidOverlayAccess() {
  if (Platform.OS !== "android") return;

  await OverlayPermissionModule?.openOverlaySettings?.();
}

/* =========================
   🔥 USAGE ACCESS
========================= */

export async function hasUsageAccess() {
  if (Platform.OS !== "android") return { granted: false };

  return (
    (await UsageAccessModule?.hasUsageAccess?.()) || {
      granted: false,
    }
  );
}

export async function requestAndroidUsageAccess() {
  if (Platform.OS !== "android") return;

  await UsageAccessModule?.openUsageAccessSettings?.();
}