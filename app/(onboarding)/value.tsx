import { router } from "expo-router";
import { View, Text, Pressable, StyleSheet } from "react-native";
import OnboardingContainer from "../../components/onboarding/OnboardingContainer";

export default function ValueScreen() {
  return (
    <OnboardingContainer
      step={3}
      totalSteps={8}
      title="Turn scrolling into learning"
      subtitle="Learn → Unlock → Repeat"
    >
      <View style={styles.bottom}>
        <Pressable
          style={styles.button}
          onPress={() => router.push("/(onboarding)/deck-source")}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </Pressable>
      </View>
    </OnboardingContainer>
  );
}

const styles = StyleSheet.create({
  bottom: { flex: 1, justifyContent: "flex-end" },
  button: {
    backgroundColor: "#ff8a3d",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  buttonText: { fontWeight: "800" },
});