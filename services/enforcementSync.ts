import { NativeModules, Platform } from "react-native";
import { checkEnforcement } from "./enforcementService";
import { setNativeEnforcementDecision } from "./nativeBridge";

const { BlockingOverlayModule } = NativeModules;

export async function syncEnforcementSettings({
  role,
  enforcementMode,
  focusMode,
}: {
  role: string;
  enforcementMode?: string;
  focusMode?: string;
}) {
  if (Platform.OS !== "android") return;

  try {
    await BlockingOverlayModule?.setEnforcementSettings({
      role: role || "solo",
      enforcementMode: enforcementMode || "self",
      focusMode: focusMode || "soft",
    });
  } catch (err) {
    console.log("Failed to sync enforcement settings:", err);
  }
}

export async function syncEnforcementDecision() {
  try {
    const result = await checkEnforcement();

    console.log("SYNC ENFORCEMENT:", result);

    await setNativeEnforcementDecision({
      block: Boolean(result?.block),
      type: result?.type || "unknown",
    });

    return result;
  } catch (err) {
    console.log("syncEnforcementDecision error:", err);
    return null;
  }
}

