import { router } from "expo-router";
import { View, Text, Pressable, StyleSheet } from "react-native";
import OnboardingContainer from "../../components/onboarding/OnboardingContainer";
import { useOnboarding } from "../../context/OnboardingContext";

export default function UserTypeScreen() {
  const { setUserType } = useOnboarding();

  // 🔥 FIXED TYPE
  function select(type: "solo" | "parent") {
    setUserType(type);
    router.push("/(onboarding)/value");
  }

  return (
    <OnboardingContainer
      step={2}
      totalSteps={8}
      title="Who is this for?"
      subtitle="This determines how Lucid behaves."
    >
      <Pressable style={styles.card} onPress={() => select("solo")}>
        <Text style={styles.title}>Solo</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => select("parent")}>
        <Text style={styles.title}>Parent</Text>
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
  title: { color: "#fff", fontSize: 18, fontWeight: "800" },
});