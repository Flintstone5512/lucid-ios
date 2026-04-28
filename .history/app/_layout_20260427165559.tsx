import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import * as Linking from "expo-linking";
import { router } from "expo-router";

import { OnboardingProvider } from "../context/OnboardingContext";
import { bootstrapAuthToken, getContext, requestUnlock } from "../services/api";
import { loadMode } from "../services/settingsStorage";
import { useRefocusStore } from "../store/useRefocusStore";

import { ensurePermissions } from "../utils/ensurePermissions";

import * as SplashScreen from "expo-splash-screen";
import {
  grantAndroidUnlock,
  hideBlockingOverlay,
} from "../services/nativeBridge";

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

      // 1. request unlock from backend
      const res = await requestUnlock();

      const expiresAt = res?.unlock?.expiresAt;
      if (!expiresAt) {
        console.log("No unlock returned");
        return;
      }

      // 2. grant native unlock
      await grantAndroidUnlock(expiresAt);

      // 3. hide overlay
      await hideBlockingOverlay();

      // 4. navigate to session screen
      router.push("/session");

    } catch (err) {
      console.log("Deep link unlock failed:", err);
    }
  }

  /* =========================
     🔥 APP INIT + DEEP LINK LISTENERS
  ========================= */

  useEffect(() => {
    async function init() {
      try {
        // 🔥 STEP 1: permissions gate
        const ok = await ensurePermissions();
        setPermissionsReady(ok);

        if (!ok) return;

        // 🔥 STEP 2: auth bootstrap
        const token = await bootstrapAuthToken();

        if (token) {
          try {
            await getContext();
          } catch (err) {
            console.log("⚠️ Context failed:", err);
          }
        }

        // 🔥 STEP 3: load enforcement mode
        const mode = await loadMode();
        if (mode) {
          setEnforcementMode(mode as any);
        }

        // 🔥 STEP 4: HANDLE INITIAL DEEP LINK (app cold start)
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          await handleDeepLink(initialUrl);
        }

      } catch (err) {
        console.log("Init error:", err);
      }

      setReady(true);
    }

    init();

    // 🔥 STEP 5: LISTEN FOR RUNTIME DEEP LINKS
    const sub = Linking.addEventListener("url", ({ url }) => {
      handleDeepLink(url);
    });

    return () => sub.remove();

  }, [setEnforcementMode]);

  /* =========================
     🔥 LOADING STATE
  ========================= */

  if (!ready) return null;

  /* =========================
     🔥 PERMISSION LOCK SCREEN
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
          onPress={ensurePermissions}
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