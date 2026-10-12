import { Platform } from "react-native";
import Superwall, {
  Entitlement,
  SubscriptionStatus,
} from "expo-superwall";

/** Call after refreshUserContext() resolves with a valid account. */
export function identifySuperwallUser(accountId: string) {
  if (Platform.OS !== "ios") return;
  try {
    Superwall.shared.identify({ userId: accountId });
  } catch (err) {
    console.warn("[Superwall] identify failed:", err);
  }
}

/** Call on logout / token clear. */
export function resetSuperwallUser() {
  if (Platform.OS !== "ios") return;
  try {
    Superwall.shared.reset();
  } catch (err) {
    console.warn("[Superwall] reset failed:", err);
  }
}

/**
 * Sync your backend's subscription state to Superwall.
 * Call this whenever you receive updated plan info from your server.
 *
 * @param plan  The plan string from your context (e.g. "pro", "free", null)
 * @param entitlementIds  Any specific entitlement IDs to grant (default: ["pro"])
 */
export function syncSuperwallSubscription(
  plan: string | null,
  entitlementIds: string[] = ["pro"]
) {
  if (Platform.OS !== "ios") return;
  try {
    const isActive = Boolean(plan && plan !== "free");
    if (isActive) {
      Superwall.shared.setSubscriptionStatus(
        SubscriptionStatus.Active(
          entitlementIds.map((id) => new Entitlement(id))
        )
      );
    } else {
      Superwall.shared.setSubscriptionStatus(SubscriptionStatus.Inactive());
    }
  } catch (err) {
    console.warn("[Superwall] setSubscriptionStatus failed:", err);
  }
}

/** Set user attributes for paywall personalization / audience targeting. */
export function setSuperwallAttributes(attrs: Record<string, unknown>) {
  if (Platform.OS !== "ios") return;
  try {
    Superwall.shared.setUserAttributes(attrs);
  } catch (err) {
    console.warn("[Superwall] setUserAttributes failed:", err);
  }
}
