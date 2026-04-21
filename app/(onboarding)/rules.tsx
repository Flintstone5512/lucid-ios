import { router } from "expo-router";
import { View, Text, Pressable, StyleSheet } from "react-native";
import OnboardingContainer from "../../components/onboarding/OnboardingContainer";
import { useOnboarding } from "../../context/OnboardingContext";

export default function RulesScreen() {
  const { state, setRules } = useOnboarding();

  function select(cards: number, minutes: number) {
    setRules({
      cardsRequired: cards,

      // 🔥 FIX: include BOTH
      unlockMinutes: minutes,
      minutesUnlocked: minutes,

      dailyMaxMinutes: 60,
      allowParentOverrides: state.userType === "parent",
    });

    router.push("/(onboarding)/permissions");
  }

  return (
    <OnboardingContainer
      step={5}
      totalSteps={8}
      title="Set your rule"
      subtitle="Earn your scroll"
    >
      <Pressable style={styles.card} onPress={() => select(5, 10)}>
        <Text style={styles.text}>5 → 10</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => select(10, 30)}>
        <Text style={styles.text}>10 → 30</Text>
      </Pressable>
    </OnboardingContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#111f38",
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
  },
  text: { color: "#fff", fontWeight: "700" },
});