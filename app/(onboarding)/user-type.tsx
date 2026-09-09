import { router } from "expo-router";
import { View, Text, Pressable, StyleSheet } from "react-native";
import OnboardingContainer from "../../components/onboarding/OnboardingContainer";
import { useOnboarding } from "../../context/OnboardingContext";

export default function UserTypeScreen() {
  const { setUserType, setIntent } = useOnboarding();

  function select(type: "solo" | "parent") {
    setUserType(type);
    router.push("/(onboarding)/value");
  }

  function selectChild() {
    setUserType("solo");
    setIntent("child");
    router.push("/(onboarding)/join");
  }

  return (
    <OnboardingContainer
      step={2}
      totalSteps={8}
      title="Who is this for?"
      subtitle="This determines how Lucid behaves."
    >
      <Pressable style={styles.card} onPress={() => select("solo")}>
        <Text style={styles.title}>For Myself</Text>
        <Text style={styles.desc}>Build focus and control your own screen time.</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => select("parent")}>
        <Text style={styles.title}>For My Child</Text>
        <Text style={styles.desc}>Monitor and manage your child's screen time.</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={selectChild}>
        <Text style={styles.title}>I'm Joining a Parent</Text>
        <Text style={styles.desc}>Enter a code to connect to your parent's controls.</Text>
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
  title: { color: "#fff", fontSize: 18, fontWeight: "800", marginBottom: 4 },
  desc: { color: "#A9BDDB", fontSize: 14, lineHeight: 20 },
});