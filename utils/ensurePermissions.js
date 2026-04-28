import {
    hasOverlayPermission,
    hasUsageAccess,
    isAccessibilityEnabled,
    requestAndroidAccessibilityAccess,
    requestAndroidOverlayAccess,
    requestAndroidUsageAccess,
} from "../services/nativePermissions";

export async function ensurePermissions() {
  const access = await isAccessibilityEnabled();
  const overlay = await hasOverlayPermission();
  const usage = await hasUsageAccess();

  console.log("PERMISSION STATUS:", {
    accessibility: access?.enabled,
    overlay: overlay?.granted,
    usage: usage?.granted,
  });

  // 🔥 PRIORITY ORDER

  if (!access?.enabled) {
    await requestAndroidAccessibilityAccess();
    return false;
  }

  if (!overlay?.granted) {
    await requestAndroidOverlayAccess();
    return false;
  }

  if (!usage?.granted) {
    await requestAndroidUsageAccess();
    return false;
  }

  return true;
}