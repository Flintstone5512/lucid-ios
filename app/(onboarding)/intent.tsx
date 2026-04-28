import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import OnboardingContainer from "../../components/onboarding/OnboardingContainer";
import { useOnboarding } from "../../context/OnboardingContext";

export default function IntentScreen() {
  const { setIntent } = useOnboarding();

  function select(intent: "solo" | "parent" | "child") {
    setIntent(intent);

    // 🔥 move to next onboarding step
    router.push("/(onboarding)/reinforcement");
  }

  return (
    <OnboardingContainer
      step={8}
      totalSteps={9}
      title="How are you using Lucid?"
      subtitle="This determines how the system works for you."
    >
      {/* SOLO */}
      <Pressable style={styles.card} onPress={() => select("solo")}>
        <Text style={styles.title}>For Myself</Text>
        <Text style={styles.desc}>
          Build focus, eliminate scrolling, and stay in control.
        </Text>
      </Pressable>

      {/* PARENT */}
      <Pressable style={styles.card} onPress={() => select("parent")}>
        <Text style={styles.title}>For My Child</Text>
        <Text style={styles.desc}>
          Monitor and control your child's screen time and habits.
        </Text>
      </Pressable>

      {/* CHILD */}
      <Pressable style={styles.card} onPress={() => select("child")}>
        <Text style={styles.title}>I’m Joining a Parent</Text>
        <Text style={styles.desc}>
          Enter a code to connect to your parent’s controls.
        </Text>
      </Pressable>
    </OnboardingContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1b2540",
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,

    borderWidth: 1,
    borderColor: "rgba(169,189,219,0.15)",
  },

  title: {
    color: "white",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },

  desc: {
    color: "#A9BDDB",
    fontSize: 14,
    lineHeight: 20,
  },
});