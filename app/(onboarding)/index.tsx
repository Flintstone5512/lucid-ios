import { router } from "expo-router";
import { View, Text, Pressable, StyleSheet } from "react-native";
import OnboardingContainer from "../../components/onboarding/OnboardingContainer";

export default function IdentityScreen() {
  return (
    <OnboardingContainer
      step={1}
      totalSteps={8}
      title="You don’t have a focus problem."
      subtitle="You have a scroll loop problem."
    >
      <View style={styles.bottom}>
        <Pressable
          style={styles.button}
          onPress={() => router.push("/(onboarding)/user-type")}
        >
          <Text style={styles.buttonText}>Fix This</Text>
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
  buttonText: { fontWeight: "800", color: "#000" },
});