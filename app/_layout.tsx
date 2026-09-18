import { StripeProvider } from "@stripe/stripe-react-native";
import * as ExpoLinking from "expo-linking";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { AppState, Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { OnboardingProvider } from "../context/OnboardingContext";
import {
  bootstrapAuthToken,
  registerPushToken,
  reportBlockingDisabled,
  requestUnlock,
} from "../services/api";
import { refreshUserContext } from "../services/contextService";
import { cancelMotivationalNotification } from "../services/motivationalNotificationService";
import { loadMode } from "../services/settingsStorage";
import { getOnboardingComplete } from "../services/storage";
import { useRefocusStore } from "../store/useRefocusStore";
import { ensurePermissions } from "../utils/ensurePermissions";

import * as Notifications from "expo-notifications";

// Required by expo-notifications — without this, scheduled notifications
// are silently suppressed even when permissions are granted.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

import {
  applyShield,
  getIOSAuthorizationStatus,
  getIOSShieldStatus,
  grantAndroidUnlock,
  hideBlockingOverlay,
} from "../services/nativeBridge";
import { checkAndClearPendingSession } from "../modules/screen-time";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [iosScreenTimeChecked, setIosScreenTimeChecked] = useState(false);
  const [androidPermChecked, setAndroidPermChecked] = useState(false);

  const lastDeepLinkAt = useRef(0); // 🔥 debounce — prevents double firing within 1s
  const lastSessionNavAt = useRef(0); // debounce — prevents AppState/notification loop re-navigating to /session

  const setEnforcementMode = useRefocusStore(
    (s) => s.setEnforcementMode
  );

  /* =========================
     🔥 PERMISSION HELPERS
  ========================= */

  async function refreshPermissions() {
    try {
      const ok = await ensurePermissions();
      return Boolean(ok);
    } catch (err) {
      console.log("Permission refresh failed:", err);
      return false;
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
        const mobileAds = require("react-native-google-mobile-ads").default;
        await mobileAds().initialize();

        // 🔐 Always bootstrap auth token first so API calls work in all paths
        await bootstrapAuthToken().catch(() => {});

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

        // 🔔 Request notification permission on iOS as early as possible so
        // the DeviceActivityMonitor extension can deliver threshold alerts.
        if (Platform.OS === "ios") {
          Notifications.requestPermissionsAsync().catch(() => {});
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
              await refreshUserContext();
            } catch (err) {
              console.log("⚠️ Context failed:", err);
            }

            // If a child's enforcement permissions are gone, notify the parent
            if (Platform.OS === "android" && !ok) {
              const ctx = useRefocusStore.getState().context as any;
              if (ctx?.role === "child") {
                reportBlockingDisabled().catch(() => {});
              }
            }

            // Register push token with backend (iOS only — Android handled natively)
            if (Platform.OS === "ios") {
              try {
                const { data: pushToken } = await Notifications.getExpoPushTokenAsync({
                  projectId: "ffef0193-896d-42c0-a995-5cec0cc5e73b",
                });
                await registerPushToken(pushToken);
              } catch (err) {
                console.log("Push token registration failed:", err);
              }
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
        const token = await bootstrapAuthToken();
        const onboarded = await getOnboardingComplete();
        if (!token || !onboarded) return; // let splash.tsx handle routing

        const authStatus = await getIOSAuthorizationStatus();
        if (authStatus?.status === "approved") {
          Notifications.requestPermissionsAsync().catch(() => {});
          // Do NOT call startMonitoringBlockedApps() here. DeviceActivity
          // schedules persist across launches — calling stop+start on every
          // cold open resets the usage counter, desynchronizing the
          // pre-scheduled JS notification from the actual threshold event.
          // Monitoring is only started from settings save and after sessions.
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
     🔥 ANDROID PERMISSION CHECK
  ========================= */

  useEffect(() => {
    if (!ready || androidPermChecked || Platform.OS !== "android") return;
    setAndroidPermChecked(true);

    async function checkAndroid() {
      const token = await bootstrapAuthToken();
      const onboarded = await getOnboardingComplete();
      if (!token || !onboarded) return; // let splash.tsx handle routing

      const ok = await refreshPermissions();
      if (!ok) {
        router.replace("/screens/AndroidPermissionsSetupScreen");
      }
    }

    checkAndroid();
  }, [ready, androidPermChecked]);

  /* =========================
     🔁 RECHECK PERMISSIONS
  ========================= */

  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "active") {
        console.log("🔁 App resumed — rechecking permissions");
        // User is back in the app - cancel any pending motivational notification
        cancelMotivationalNotification().catch(() => {});
        await refreshPermissions();

        if (Platform.OS === "ios") {
          // Reapply shield on every foreground in case ManagedSettingsStore was
          // cleared by a device restart or system event while the app was backgrounded.
          applyShield().catch(() => {});

          try {
            // Primary: check flag set by DeviceActivityMonitor extension
            const sessionResult = await checkAndClearPendingSession();
            if (sessionResult?.pending) {
              const now = Date.now();
              if (now - lastSessionNavAt.current < 5000) return;
              lastSessionNavAt.current = now;
              setTimeout(() => router.replace("/session"), 120);
              return;
            }

            // Fallback: if apps are shielded and we have no active unlock window,
            // the user needs a session regardless of whether the extension fired.
            // Guard: skip if we already navigated to /session in the last 5 seconds
            // to prevent repeated AppState firings (e.g. screen lock/unlock) from
            // re-replacing the session screen mid-flashcard, which freezes the UI.
            const now = Date.now();
            if (now - lastSessionNavAt.current < 5000) return;
            const { unlockedUntil } = useRefocusStore.getState();
            const isUnlocked = unlockedUntil > Date.now();
            if (!isUnlocked) {
              const shieldResult = await getIOSShieldStatus();
              if (shieldResult?.isShielded) {
                lastSessionNavAt.current = now;
                setTimeout(() => router.replace("/session"), 120);
              }
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
     🔔 NOTIFICATION FOREGROUND (threshold fires while app is open)
  ========================= */

  useEffect(() => {
    if (Platform.OS !== "ios") return;

    // When the threshold fires while Lucid is already foregrounded, AppState
    // stays "active" so the AppState listener never re-fires. This listener
    // catches the notification delivery itself and navigates to /session.
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      if (notification.request.identifier === "lucid-session-threshold") {
        checkAndClearPendingSession()
          .then((result) => {
            if (result?.pending) {
              const now = Date.now();
              if (now - lastSessionNavAt.current < 5000) return;
              lastSessionNavAt.current = now;
              setTimeout(() => router.replace("/session"), 120);
            }
          })
          .catch(() => {});
      }
    });

    return () => sub.remove();
  }, []);

  /* =========================
     🔔 NOTIFICATION TAP
  ========================= */

  useEffect(() => {
    if (Platform.OS !== "ios") return;

    // Handles the case where the user taps the "Time's up" notification banner
    // to open Lucid — addNotificationReceivedListener above handles the case
    // where the app is already foregrounded when the threshold fires.
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      checkAndClearPendingSession()
        .then((result) => {
          if (result?.pending) {
            const now = Date.now();
            if (now - lastSessionNavAt.current < 5000) return;
            lastSessionNavAt.current = now;
            setTimeout(() => router.replace("/session"), 120);
          }
        })
        .catch(() => {});
    });

    return () => sub.remove();
  }, []);

  /* =========================
     🔔 IMMERSIVE CARD TAP + ACTIONS
     Works on both iOS + Android
  ========================= */

  useEffect(() => {
    // Register action buttons for Immersive Cram Session notifications
    Notifications.setNotificationCategoryAsync("CRAM_CARD", [
      {
        identifier: "HARD",
        buttonTitle: "🔴 Hard",
        options: { opensAppToForeground: false },
      },
      {
        identifier: "GOT_IT",
        buttonTitle: "✅ Got it",
        options: { opensAppToForeground: false },
      },
      {
        identifier: "SKIP",
        buttonTitle: "⏭ Skip",
        options: { opensAppToForeground: false },
      },
    ]).catch(() => {});

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      if (data?.type !== "immersive_card") return;

      const actionId = response.actionIdentifier;
      const cardId   = data?.cardId as string | undefined;

      // Handle action button taps (fire-and-forget, no UI needed)
      if (cardId && actionId && actionId !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
        const actionMap: Record<string, "hard" | "got_it" | "skip"> = {
          HARD:   "hard",
          GOT_IT: "got_it",
          SKIP:   "skip",
        };
        const action = actionMap[actionId];
        if (action) {
          import("../services/immersiveNotificationService")
            .then(({ recordCardAction }) => recordCardAction(cardId, action))
            .catch(() => {});
          return; // Don't navigate when an action button was tapped
        }
      }

      // Default tap → navigate to decks
      setTimeout(() => router.push("/(tabs)/decks"), 120);
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
     🚀 MAIN APP
  ========================= */

  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <OnboardingProvider>
            <Stack
              screenOptions={{ headerShown: false }}
              initialRouteName="index"
            />
          </OnboardingProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </StripeProvider>
  );
}