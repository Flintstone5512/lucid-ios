import { useEffect } from "react";
import { Platform } from "react-native";
import { router } from "expo-router";

import { bootstrapAuthToken } from "../services/api";
import { useRefocusStore } from "../store/useRefocusStore";
import {
  getForegroundApp,
  getAndroidUnlockStatus,
  showBlockingOverlay,
  hideBlockingOverlay,
  enableAndroidEnforcement,
} from "../services/nativeBridge";

const BLOCKED_APPS = [
  "com.instagram.android",
  "com.zhiliaoapp.musically",
  "com.twitter.android",
  "com.google.android.youtube",
  "com.facebook.katana",
  "com.facebook.lite",
  "com.facebook.orca",
];

export function useEnforcement() {
  const { enforcementMode, unlockedUntil } = useRefocusStore();

  useEffect(() => {
    if (Platform.OS !== "android") return;

    let interval: ReturnType<typeof setInterval> | null = null;
    let mounted = true;

    async function start() {
      const token = await bootstrapAuthToken();

      if (!token) {
        console.log("❌ No auth → enforcement disabled");
        return;
      }

      await enableAndroidEnforcement(BLOCKED_APPS);

      console.log("✅ Enforcement active");

      interval = setInterval(async () => {
        try {
          if (!mounted) return;

          if (enforcementMode === "off") {
            await hideBlockingOverlay();
            return;
          }

          const nativeUnlock = await getAndroidUnlockStatus();
          const jsUnlocked = Date.now() < unlockedUntil;
          const nativeUnlocked =
            Boolean(nativeUnlock?.unlocked) &&
            (!nativeUnlock?.expiresAt ||
              Date.now() < new Date(nativeUnlock.expiresAt).getTime());

          if (jsUnlocked || nativeUnlocked) {
            await hideBlockingOverlay();
            return;
          }

          const app: any = await getForegroundApp();

          if (!app?.packageName) return;
          if (!BLOCKED_APPS.includes(app.packageName)) {
            await hideBlockingOverlay();
            return;
          }

          if (enforcementMode === "strict") {
            await showBlockingOverlay();
            router.replace("/session");
            return;
          }

          if (enforcementMode === "soft") {
            const chance = Math.random();
            if (chance < 0.5) {
              await showBlockingOverlay();
              router.replace("/session");
            }
          }
        } catch (err) {
          console.log("Enforcement error:", err);
        }
      }, 3000);
    }

    start();

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [enforcementMode, unlockedUntil]);
}