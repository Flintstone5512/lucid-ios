import * as ExpoLinking from "expo-linking";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import {
  AppState,
  Platform,
  Pressable,
  Linking as RNLinking,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { OnboardingProvider } from "../context/OnboardingContext";
import {
  bootstrapAuthToken,
  getContext,
  requestUnlock,
} from "../services/api";
import { loadMode } from "../services/settingsStorage";
import { useRefocusStore } from "../store/useRefocusStore";
import { ensurePermissions } from "../utils/ensurePermissions";

import {
  applyShield,
  getIOSAuthorizationStatus,
  grantAndroidUnlock,
  hasOverlayPermission,
  hasUsageAccess,
  hideBlockingOverlay,
  isAccessibilityEnabled,
  requestAndroidAccessibilityAccess,
  requestAndroidOverlayAccess,
  requestAndroidUsageAccess,
  startMonitoringBlockedApps,
} from "../services/nativeBridge";
import { checkAndClearPendingSession } from "../modules/screen-time";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [permissionsReady, setPermissionsReady] = useState(false);
  const [iosScreenTimeChecked, setIosScreenTimeChecked] = useState(false);

  const lastDeepLinkAt = useRef(0); // 🔥 debounce — prevents double firing within 1s

  const setEnforcementMode = useRefocusStore(
    (s) => s.setEnforcementMode
  );

  /* =========================
     🔥 PERMISSION HELPERS
  ========================= */

  async function refreshPermissions() {
    try {
      const ok = await ensurePermissions();
      setPermissionsReady(Boolean(ok));
      return Boolean(ok);
    } catch (err) {
      console.log("Permission refresh failed:", err);
      setPermissionsReady(false);
      return false;
    }
  }

  async function openMissingPermissionSettings() {
    try {
      const accessibility = await isAccessibilityEnabled();
      if (!accessibility?.enabled) {
        await requestAndroidAccessibilityAccess();
        return;
      }

      const overlay = await hasOverlayPermission();
      if (!overlay?.granted) {
        await requestAndroidOverlayAccess();
        return;
      }

      const usage = await hasUsageAccess();
      if (!usage?.granted) {
        await requestAndroidUsageAccess();
        return;
      }

      await RNLinking.openSettings();
    } catch (err) {
      console.log("Open permission settings failed:", err);
      await RNLinking.openSettings();
    }
  }

  /* =========================
     🔥 DEEP LINK (CRITICAL FIX)
  ========================= */
async function handleDeepLink(url: string) {
  if (!url.includes("scroll-tax://session")) return false;

  const now = Date.now();
  if (now - lastDeepLinkAt.current < 1000) return true;
  lastDeepLinkAt.current = now;

  const { unlockedUntil } = useRefocusStore.getState();
  if (unlockedUntil > Date.now()) {
    console.log("[LAYOUT] Deep link ignored — active unlock until", new Date(unlockedUntil).toISOString());
    return true;
  }

  try {
    console.log("🔥 Deep link triggered:", url);

    const res = await requestUnlock();
    const expiresAt = res?.unlock?.expiresAt;

    if (expiresAt) {
      await grantAndroidUnlock(expiresAt);
      await hideBlockingOverlay();
    }

    // 🔥 CRITICAL FIX: delay navigation until router is ready
    setTimeout(() => {
      console.log("🚀 Navigating to session...");
      router.replace("/session");
    }, 120);

    return true;

  } catch (err) {
    console.log("Deep link unlock failed:", err);

    setTimeout(() => {
      router.replace("/session");
    }, 120);

    return true;
  }
}

  /* =========================
     🔥 INIT (NOW SAFE)
  ========================= */

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        if (!__DEV__) {
          const mobileAds = require("react-native-google-mobile-ads").default;
          await mobileAds().initialize();
        }

        // 🔥 STEP 0: check deep link FIRST (before anything else)
        const initialUrl = await ExpoLinking.getInitialURL();

        if (initialUrl) {
          const handled = await handleDeepLink(initialUrl);

          if (handled) {
            setReady(true);
            await SplashScreen.hideAsync();
            return; // 🚀 EXIT EARLY (skip normal flow)
          }
        }

        // 🔥 STEP 1: permissions
        const ok = await refreshPermissions();
        if (!mounted) return;

        if (ok) {
          // 🔐 AUTH
          const token = await bootstrapAuthToken();
          console.log("[LAYOUT] auth token loaded:", token ? "✅ present" : "❌ missing");

          if (token) {
            try {
              await getContext();
            } catch (err) {
              console.log("⚠️ Context failed:", err);
            }
          }

          // ⚙️ SETTINGS
          const mode = await loadMode();
          if (mode) {
            setEnforcementMode(mode as any);
          }
        }
      } catch (err) {
        console.log("Init error:", err);
      }

      // 🔥 controlled splash timing (only for normal open)
      await new Promise((r) => setTimeout(r, 1000));

      if (!mounted) return;

      setReady(true);

      try {
        await SplashScreen.hideAsync();
      } catch (err) {
        console.log("Splash hide failed:", err);
      }
    }

    init();

    // 🔥 runtime deep links
    const sub = ExpoLinking.addEventListener("url", ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, [setEnforcementMode]);

  /* =========================
     🔥 iOS SCREEN TIME CHECK
  ========================= */

  useEffect(() => {
    if (!ready || iosScreenTimeChecked || Platform.OS !== "ios") return;
    setIosScreenTimeChecked(true);

    async function checkIOSScreenTime() {
      try {
        const authStatus = await getIOSAuthorizationStatus();
        if (authStatus?.status === "approved") {
          startMonitoringBlockedApps().catch(() => {});
          applyShield().catch(() => {});
        } else {
          router.replace("/screens/IOSScreenTimeSetupScreen");
        }
      } catch (err) {
        console.log("iOS Screen Time check failed:", err);
      }
    }

    checkIOSScreenTime();
  }, [ready, iosScreenTimeChecked]);

  /* =========================
     🔁 RECHECK PERMISSIONS
  ========================= */

  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "active") {
        console.log("🔁 App resumed — rechecking permissions");
        await refreshPermissions();

        // Check if a ShieldAction triggered a study session
        if (Platform.OS === "ios") {
          try {
            const result = await checkAndClearPendingSession();
            if (result?.pending) {
              console.log("🛡️ pendingSession detected — navigating to session");
              setTimeout(() => router.replace("/session"), 120);
            }
          } catch (err) {
            // ScreenTimeModule unavailable on simulator
          }
        }
      }
    });

    return () => sub.remove();
  }, []);

  /* =========================
     ⏳ LOADING
  ========================= */

 if (!ready) {
  return (
    <View style={{ flex: 1, backgroundColor: "#0e1424" }} />
  );
}

  /* =========================
     🔐 PERMISSION LOCK
  ========================= */

  if (!permissionsReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0B0F1A",
          padding: 24,
        }}
      >
        <Text
          style={{
            color: "white",
            fontSize: 22,
            fontWeight: "800",
            textAlign: "center",
          }}
        >
          Enable permissions to continue
        </Text>

        <Text
          style={{
            color: "#A9BDDB",
            fontSize: 14,
            textAlign: "center",
            marginTop: 10,
            lineHeight: 20,
          }}
        >
          Lucid needs Accessibility, Usage Access, and Overlay permission to
          block distracting apps and show your flashcard session.
        </Text>

        <Pressable
          onPress={openMissingPermissionSettings}
          style={{
            marginTop: 24,
            backgroundColor: "#D86732",
            paddingVertical: 14,
            paddingHorizontal: 22,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: "white", fontWeight: "800" }}>
            Open Required Permission
          </Text>
        </Pressable>

        <Pressable
          onPress={refreshPermissions}
          style={{
            marginTop: 14,
            paddingVertical: 12,
            paddingHorizontal: 18,
          }}
        >
          <Text style={{ color: "#A9BDDB", fontWeight: "700" }}>
            I enabled it — check again
          </Text>
        </Pressable>
      </View>
    );
  }

  /* =========================
     🚀 MAIN APP
  ========================= */

  return (
    <SafeAreaProvider>
      <OnboardingProvider>
        <Stack
          screenOptions={{ headerShown: false }}
          initialRouteName="index"
        />
      </OnboardingProvider>
    </SafeAreaProvider>
  );
}