import { NativeEventEmitter } from "react-native";
import api from "./api";
import {
    hideBlockingOverlay,
    showBlockingOverlay,
} from "./nativeBridge";

const emitter = new NativeEventEmitter();

let unlockCache = null;

export function setUnlockState(unlock) {
  unlockCache = unlock;
}

export function startDetectionListener() {
  const sub = emitter.addListener(
    "SCROLLTAX_APP_DETECTED",
    async (event) => {
      const { packageName } = event;

      try {
        /* -----------------------------
           🔥 UNLOCK BYPASS (CRITICAL)
        ----------------------------- */
        if (unlockCache?.expiresAt) {
          const stillActive =
            new Date(unlockCache.expiresAt).getTime() > Date.now();

          if (stillActive) {
            console.log("Unlock active → skipping block");
            return;
          }
        }

        /* -----------------------------
           🔥 BACKEND DECISION
        ----------------------------- */
        const res = await api.get("/enforcement/check");

        if (res.data.hardLock) {
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