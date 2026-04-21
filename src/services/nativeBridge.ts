import { NativeModules, Platform } from "react-native";

const {
  ScreenTimeAuthorizationModule,
  FamilyActivityPickerModule,
  ShieldControlModule,
  DeviceActivityMonitorModule,
  UsageAccessModule,
  OverlayPermissionModule,
  AccessibilityBridgeModule,
  BlockingOverlayModule,
} = NativeModules;

export async function requestAuthorization() {
  if (Platform.OS !== "ios") return { ok: false, reason: "Not iOS" };
  return ScreenTimeAuthorizationModule.requestAuthorization();
}

export async function getAuthorizationStatus() {
  if (Platform.OS !== "ios") return { ok: false, reason: "Not iOS" };
  return ScreenTimeAuthorizationModule.getAuthorizationStatus();
}

export async function presentAppPicker() {
  if (Platform.OS !== "ios") return { ok: false, reason: "Not iOS" };
  return FamilyActivityPickerModule.presentAppPicker();
}

export async function saveSelectedApps(tokens: string[]) {
  if (Platform.OS !== "ios") return { ok: false, reason: "Not iOS" };
  return FamilyActivityPickerModule.saveSelectedApps(tokens);
}

export async function getSelectedApps() {
  if (Platform.OS !== "ios") return { ok: false, reason: "Not iOS" };
  return FamilyActivityPickerModule.getSelectedApps();
}

export async function applyShield(appTokens: string[]) {
  if (Platform.OS !== "ios") return { ok: false, reason: "Not iOS" };
  return ShieldControlModule.applyShield(appTokens);
}

export async function clearShield() {
  if (Platform.OS !== "ios") return { ok: false, reason: "Not iOS" };
  return ShieldControlModule.clearShield();
}

export async function scheduleUnlockWindow(expiresAt: string) {
  if (Platform.OS !== "ios") return { ok: false, reason: "Not iOS" };
  return ShieldControlModule.scheduleUnlockWindow(expiresAt);
}

export async function startMonitoringBlockedApps() {
  if (Platform.OS !== "ios") return { ok: false, reason: "Not iOS" };
  return DeviceActivityMonitorModule.startMonitoringBlockedApps();
}

export async function handleBlockedAppOpenEvent() {
  if (Platform.OS !== "ios") return { ok: false, reason: "Not iOS" };
  return DeviceActivityMonitorModule.handleBlockedAppOpenEvent();
}

export async function hasUsageAccess() {
  if (Platform.OS !== "android") return { ok: false, reason: "Not Android" };
  return UsageAccessModule.hasUsageAccess();
}

export async function openUsageAccessSettings() {
  if (Platform.OS !== "android") return { ok: false, reason: "Not Android" };
  return UsageAccessModule.openUsageAccessSettings();
}

export async function getForegroundApp() {
  if (Platform.OS !== "android") return { ok: false, reason: "Not Android" };
  return UsageAccessModule.getForegroundApp();
}

export async function hasOverlayPermission() {
  if (Platform.OS !== "android") return { ok: false, reason: "Not Android" };
  return OverlayPermissionModule.hasOverlayPermission();
}

export async function openOverlaySettings() {
  if (Platform.OS !== "android") return { ok: false, reason: "Not Android" };
  return OverlayPermissionModule.openOverlaySettings();
}

export async function showBlockingOverlay() {
  if (Platform.OS !== "android") return { ok: false, reason: "Not Android" };
  return BlockingOverlayModule.showBlockingOverlay();
}

export async function hideBlockingOverlay() {
  if (Platform.OS !== "android") return { ok: false, reason: "Not Android" };
  return BlockingOverlayModule.hideBlockingOverlay();
}

export async function isAccessibilityEnabled() {
  if (Platform.OS !== "android") return { ok: false, reason: "Not Android" };
  return AccessibilityBridgeModule.isAccessibilityEnabled();
}

export async function openAccessibilitySettings() {
  if (Platform.OS !== "android") return { ok: false, reason: "Not Android" };
  return AccessibilityBridgeModule.openAccessibilitySettings();
}