import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { OnboardingProvider } from "../context/OnboardingContext";
import { useEnforcement } from "../hooks/useEnforcement";
import { bootstrapAuthToken, getContext } from "../services/api";
import { startDetectionListener } from "../services/nativeDetection";
import { loadMode } from "../services/settingsStorage";
import { useRefocusStore } from "../store/useRefocusStore";

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  const setEnforcementMode = useRefocusStore(
    (s) => s.setEnforcementMode
  );

  useEnforcement();

  useEffect(() => {
    async function init() {
      try {
        const token = await bootstrapAuthToken();

        if (token) {
          try {
            await getContext();
          } catch (err) {
            console.log("⚠️ Context failed (likely 502):", err);
          }
        }

        const mode = await loadMode();
        if (mode) {
          setEnforcementMode(mode as any);
        }
      } catch (err) {
        console.log("Init error:", err);
      }

      setReady(true);
    }

    init();
  }, [setEnforcementMode]);

  /* =========================
     🔥 NATIVE DETECTION LISTENER
  ========================= */
  useEffect(() => {
    const sub = startDetectionListener();

    return () => {
      sub?.remove?.();
    };
  }, []);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <OnboardingProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </OnboardingProvider>
    </SafeAreaProvider>
  );
}