import { DeviceEventEmitter } from "react-native";
import api from "./api";
import {
    hideBlockingOverlay,
    showBlockingOverlay,
} from "./nativeBridge";

let unlockCache = null;
let lastHandledPackage = null;
let lastHandledAt = 0;

/* =========================
   🔥 UNLOCK CACHE
========================= */

export function setUnlockState(unlock) {
  unlockCache = unlock;
}

export function clearUnlockState() {
  unlockCache = null;
}

/* =========================
   🔥 DETECTION LISTENER
========================= */

export function startDetectionListener() {
  const sub = DeviceEventEmitter.addListener(
    "SCROLLTAX_APP_DETECTED",
    async (event) => {
      const packageName = event?.packageName;

      if (!packageName) return;

      try {
        /* -----------------------------
           🔥 DEDUPE SPAMMY ACCESSIBILITY EVENTS
        ----------------------------- */
        const now = Date.now();

        if (
          lastHandledPackage === packageName &&
          now - lastHandledAt < 1500
        ) {
          return;
        }

        lastHandledPackage = packageName;
        lastHandledAt = now;

        /* -----------------------------
           🔥 UNLOCK BYPASS
        ----------------------------- */
        if (unlockCache?.expiresAt) {
          const stillActive =
            new Date(unlockCache.expiresAt).getTime() > Date.now();

          if (stillActive) {
            console.log("Unlock active → skipping block");
            await hideBlockingOverlay();
            return;
          }
        }

        /* -----------------------------
           🔥 BACKEND DECISION
        ----------------------------- */
        const res = await api.get("/enforcement/check");

        if (res?.data?.hardLock) {
          await showBlockingOverlay(packageName);
        } else {
          await hideBlockingOverlay();
        }
      } catch (err) {
        console.log("Detection error:", err);
      }
    }
  );

  return sub;
}