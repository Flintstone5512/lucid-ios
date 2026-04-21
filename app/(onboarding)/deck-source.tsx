import { router } from "expo-router";
import { View, Pressable, Text, StyleSheet } from "react-native";
import OnboardingContainer from "../../components/onboarding/OnboardingContainer";
import { useOnboarding } from "../../context/OnboardingContext";

export default function DeckSourceScreen() {
  const { setDeckSource } = useOnboarding();

  function select(source: "anki" | "ai" | "starter") {
    setDeckSource(source);
    router.push("/(onboarding)/rules");
  }

  return (
    <OnboardingContainer
      step={4}
      totalSteps={8}
      title="Choose your setup"
      subtitle="Fastest way to unlock"
    >
      <Pressable style={styles.card} onPress={() => select("anki")}>
        <Text style={styles.text}>Import Anki</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => select("ai")}>
        <Text style={styles.text}>Generate with AI</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => select("starter")}>
        <Text style={styles.text}>Starter Deck</Text>
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