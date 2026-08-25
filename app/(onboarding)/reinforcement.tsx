import { router } from "expo-router";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import OnboardingContainer from "../../components/onboarding/OnboardingContainer";
import { useOnboarding } from "../../context/OnboardingContext";
import { setOnboardingComplete } from "../../services/storage";
import { getIOSAuthorizationStatus } from "../../services/nativeBridge";

export default function ReinforcementScreen() {
  const { state } = useOnboarding();

  async function finish() {
    await setOnboardingComplete(true);

    /* =========================
       🔥 ROUTING LOGIC
    ========================= */

    if (state.intent === "child") {
      // 🔥 FORCE JOIN FLOW
      router.replace("/(onboarding)/join");
      return;
    }

    // On iOS, gate all users through Screen Time setup before entering the app.
    if (Platform.OS === "ios") {
      try {
        const authStatus = await getIOSAuthorizationStatus();
        if (authStatus?.status !== "approved") {
          router.replace("/screens/IOSScreenTimeSetupScreen");
          return;
        }
      } catch {
        // Fall through to tabs if check fails
      }
    }

    if (state.intent === "parent") {
      router.replace("/(tabs)");
      return;
    }

    router.replace("/(tabs)");
  }

  return (
    <OnboardingContainer
      step={9}
      totalSteps={9}
      title={`You just earned ${state.rules.unlockMinutes} minutes.`}
      subtitle="Most people would have just scrolled. You’re different now."
    >
      <View style={styles.bottom}>
        <Pressable style={styles.button} onPress={finish}>
          <Text style={styles.buttonText}>Enter App</Text>
        </Pressable>
      </View>
    </OnboardingContainer>
  );
}

const styles = StyleSheet.create({
  bottom: {
    flex: 1,
    justifyContent: "flex-end",
  },
  button: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  buttonText: {
    color: "#0B0B0F",
    fontSize: 16,
    fontWeight: "800",
  },
});