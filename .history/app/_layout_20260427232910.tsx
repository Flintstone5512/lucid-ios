import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { AppState, Linking, Pressable, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import * as ExpoLinking from "expo-linking";
import { router } from "expo-router";

import { OnboardingProvider } from "../context/OnboardingContext";
import {
  bootstrapAuthToken,
  getContext,
  requestUnlock,
} from "../services/api";
import { loadMode } from "../services/settingsStorage";
import { useRefocusStore } from "../store/useRefocusStore";

import { ensurePermissions } from "../utils/ensurePermissions";

import * as SplashScreen from "expo-splash-screen";
import {
  grantAndroidUnlock,
  hideBlockingOverlay,
} from "../services/nativeBridge";

// 🔥 KEEP THIS OUTSIDE COMPONENT
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [permissionsReady, setPermissionsReady] = useState(false);

  const setEnforcementMode = useRefocusStore(
    (s) => s.setEnforcementMode
  );

  /* =========================
     🔥 DEEP LINK HANDLER
  ========================= */
  async function handleDeepLink(url: string) {
    if (!url.includes("scrolltax://session")) return;

    try {
      console.log("🔥 Deep link triggered:", url);

      const res = await requestUnlock();

      const expiresAt = res?.unlock?.expiresAt;
      if (!expiresAt) {
        console.log("No unlock returned");
        return;
      }

      await grantAndroidUnlock(expiresAt);
      await hideBlockingOverlay();

      router.push("/session");
    } catch (err) {
      console.log("Deep link unlock failed:", err);
    }
  }

  /* =========================
     🔥 APP INIT
  ========================= */
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        // 🔥 STEP 1: permissions
        const ok = await ensurePermissions();
        if (!mounted) return;

        setPermissionsReady(ok);

        // 🔥 DO NOT EARLY RETURN — allow splash + listeners to continue

        if (ok) {
          // 🔐 AUTH
          const token = await bootstrapAuthToken();

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

          // 🔗 INITIAL DEEP LINK
          const initialUrl = await ExpoLinking.getInitialURL();
          if (initialUrl) {
            await handleDeepLink(initialUrl);
          }
        }
      } catch (err) {
        console.log("Init error:", err);
      }

      // 🔥 CONTROLLED SPLASH TIME (prevents instant flash)
      await new Promise((r) => setTimeout(r, 1000));

      if (!mounted) return;

      setReady(true);

      // 🔥 HIDE SPLASH LAST
      await SplashScreen.hideAsync();
    }

    init();

    // 🔗 RUNTIME DEEP LINKS
    const sub = ExpoLinking.addEventListener("url", ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, [setEnforcementMode]);

  /* =========================
     🔥 RECHECK PERMISSIONS ON RETURN (CRITICAL FIX)
  ========================= */
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "active") {
        console.log("🔁 App resumed — rechecking permissions");

        const ok = await ensurePermissions();
        setPermissionsReady(ok);
      }
    });

    return () => sub.remove();
  }, []);

  /* =========================
     🔥 LOADING (SPLASH HOLDS)
  ========================= */
  if (!ready) return null;

  /* =========================
     🔥 PERMISSION LOCK
  ========================= */
  if (!permissionsReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#0B0F1A",
        }}
      >
        <Text style={{ color: "white", fontSize: 18 }}>
          Enable permissions to continue
        </Text>

        <Pressable
          onPress={async () => {
            try {
              // 🔥 TRY ACCESSIBILITY FIRST (BEST UX)
              await Linking.openURL(
                "android.settings.ACCESSIBILITY_SETTINGS"
              );
            } catch {
              // 🔁 FALLBACK
              Linking.openSettings();
            }
          }}
          style={{
            marginTop: 20,
            backgroundColor: "#D86732",
            padding: 14,
            borderRadius: 10,
          }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>
            Open Settings
          </Text>
        </Pressable>
      </View>
    );
  }

  /* =========================
     🔥 MAIN APP
  ========================= */
  return (
    <SafeAreaProvider>
      <OnboardingProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </OnboardingProvider>
    </SafeAreaProvider>
  );
}