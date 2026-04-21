import { router } from "expo-router";
import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import OnboardingContainer from "../../components/onboarding/OnboardingContainer";
import OptionButton from "../../components/onboarding/OptionButton";
import { useOnboarding } from "../../context/OnboardingContext";

export default function GoalScreen() {
  const { state, setGoal } = useOnboarding();
  const [selected, setSelected] = useState(state.goal);

  function handleNext() {
    if (!selected) return;
    setGoal(selected);
    router.push("/(onboarding)/deck-source");
  }

  return (
    <OnboardingContainer
      step={3}
      totalSteps={8}
      title="What do you want to turn scrolling into?"
      subtitle="Pick your main goal. You can expand later."
    >
      <OptionButton
        label="Learn language"
        selected={selected === "language"}
        onPress={() => setSelected("language")}
      />
      <OptionButton
        label="Make money"
        selected={selected === "money"}
        onPress={() => setSelected("money")}
      />
      <OptionButton
        label="Improve memory"
        selected={selected === "memory"}
        onPress={() => setSelected("memory")}
      />
      <OptionButton
        label="Faith / mindset"
        selected={selected === "faith"}
        onPress={() => setSelected("faith")}
      />

      <View style={styles.bottom}>
        <Pressable
          style={[styles.button, !selected && styles.disabled]}
          onPress={handleNext}
          disabled={!selected}
        >
          <Text style={styles.buttonText}>Continue</Text>
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
  disabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: "#0B0B0F",
    fontSize: 16,
    fontWeight: "800",
  },
});