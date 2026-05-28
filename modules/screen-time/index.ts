import { requireOptionalNativeModule } from "expo-modules-core";

const ScreenTimeModule = requireOptionalNativeModule("ScreenTimeModule");

const unavailable = { ok: false, error: "ScreenTimeModule not available" };

export async function requestAuthorization(): Promise<{ ok: boolean; status?: string; error?: string }> {
  if (!ScreenTimeModule) return unavailable;
  return ScreenTimeModule.requestAuthorization();
}

export async function getAuthorizationStatus(): Promise<{ ok: boolean; status: string }> {
  if (!ScreenTimeModule) return { ok: false, status: "unknown" };
  return ScreenTimeModule.getAuthorizationStatus();
}

export async function presentAppPicker(): Promise<{ ok: boolean; cancelled?: boolean; error?: string }> {
  if (!ScreenTimeModule) return unavailable;
  return ScreenTimeModule.presentAppPicker();
}

export async function applyShield(): Promise<{ ok: boolean }> {
  if (!ScreenTimeModule) return unavailable;
  return ScreenTimeModule.applyShield();
}

export async function clearShield(): Promise<{ ok: boolean }> {
  if (!ScreenTimeModule) return unavailable;
  return ScreenTimeModule.clearShield();
}

export async function unlockForMinutes(minutes: number): Promise<{ ok: boolean; expiresAt?: number }> {
  if (!ScreenTimeModule) return unavailable;
  return ScreenTimeModule.unlockForMinutes(minutes);
}

export async function syncSettings(
  cardsRequired: number,
  unlockMinutes: number,
  focusMode: string
): Promise<{ ok: boolean }> {
  if (!ScreenTimeModule) return unavailable;
  return ScreenTimeModule.syncSettings(cardsRequired, unlockMinutes, focusMode);
}

export async function checkAndClearPendingSession(): Promise<{ ok: boolean; pending: boolean }> {
  if (!ScreenTimeModule) return { ok: false, pending: false };
  return ScreenTimeModule.checkAndClearPendingSession();
}
