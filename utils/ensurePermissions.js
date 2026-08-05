import { Platform } from "react-native";
import {
  hasOverlayPermission,
  hasUsageAccess,
  isAccessibilityEnabled,
} from "../services/nativePermissions";

export async function ensurePermissions() {
  if (Platform.OS === "ios") return true;

  const [access, overlay, usage] = await Promise.all([
    isAccessibilityEnabled(),
    hasOverlayPermission(),
    hasUsageAccess(),
  ]);

  console.log("PERMISSION STATUS:", {
    accessibility: access?.enabled,
    overlay: overlay?.granted,
    usage: usage?.granted,
  });

  return Boolean(access?.enabled && overlay?.granted && usage?.granted);
}
