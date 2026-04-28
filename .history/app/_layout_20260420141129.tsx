import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { bootstrapAuthToken } from "../services/api";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { OnboardingProvider } from "../context/OnboardingContext";
import { useEnforcement } from "../hooks/useEnforcement";
import { loadMode } from "../services/settingsStorage";
import { useRefocusStore } from "../store/useRefocusStore";
import { getContext } from "../services/api";

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  // ✅ FIX: hook at top level
  const setEnforcementMode = useRefocusStore(
    (s) => s.setEnforcementMode
  );

  // ✅ ALWAYS run
  useEnforcement();

  useEffect(() => {
  async function init() {
    try {
      const token = await bootstrapAuthToken();

      if (token) {
        try {
          // 🔥 validate token + warm backend
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

    setReady(true); // ✅ ALWAYS last
  }

  init();
}, [setEnforcementMode]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <OnboardingProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </OnboardingProvider>
    </SafeAreaProvider>
  );
}