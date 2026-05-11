import * as ExpoLinking from "expo-linking";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import {
  AppState,
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
  grantAndroidUnlock,
  hasOverlayPermission,
  hasUsageAccess,
  hideBlockingOverlay,
  isAccessibilityEnabled,
  requestAndroidAccessibilityAccess,
  requestAndroidOverlayAccess,
  requestAndroidUsageAccess,
} from "../services/nativeBridge";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [permissionsReady, setPermissionsReady] = useState(false);

  const setEnforcementMode = useRefocusStore(
    (s) => s.setEnforcementMode
  );

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

      try {
        await RNLinking.openSettings();
      } catch (fallbackErr) {
        console.log("Fallback settings failed:", fallbackErr);
      }
    }
  }

  async function handleDeepLink(url: string) {
    if (!url.includes("scrolltax://session")) return;

    try {
      console.log("🔥 Deep link triggered:", url);

      const res = await requestUnlock();

      const expiresAt = res?.unlock?.expiresAt;
      if (!expiresAt) {
        console.log("No unlock returned");
        router.push("/session");
        return;
      }

      await grantAndroidUnlock(expiresAt);
      await hideBlockingOverlay();

      router.push("/session");
    } catch (err) {
      console.log("Deep link unlock failed:", err);
      router.push("/session");
    }
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const ok = await refreshPermissions();
        if (!mounted) return;

        if (ok) {
          const token = await bootstrapAuthToken();

          if (token) {
            try {
              await getContext();
            } catch (err) {
              console.log("⚠️ Context failed:", err);
            }
          }

          const mode = await loadMode();
          if (mode) {
            setEnforcementMode(mode as any);
          }

          const initialUrl = await ExpoLinking.getInitialURL();
          if (initialUrl) {
            await handleDeepLink(initialUrl);
          }
        }
      } catch (err) {
        console.log("Init error:", err);
      }

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

    const sub = ExpoLinking.addEventListener("url", ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, [setEnforcementMode]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "active") {
        console.log("🔁 App resumed — rechecking permissions");
        await refreshPermissions();
      }
    });

    return () => sub.remove();
  }, []);

  if (!ready) return null;

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

  return (
    <SafeAreaProvider>
      <OnboardingProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </OnboardingProvider>
    </SafeAreaProvider>
  );
}