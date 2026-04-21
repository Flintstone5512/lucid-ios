import { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import OnboardingContainer from "../../components/onboarding/OnboardingContainer";
import { useOnboarding } from "../../context/OnboardingContext";

const starterCards = [
  {
    front: "What is Lucid?",
    back: "A system that turns scrolling into learning.",
  },
  {
    front: "How do you unlock time?",
    back: "By completing flashcards.",
  },
  {
    front: "What happens if you don’t?",
    back: "You stay blocked.",
  },
  {
    front: "What is the loop?",
    back: "Learn → Unlock → Repeat.",
  },
  {
    front: "What are you training?",
    back: "Your potential.",
  },
];

export default function FirstSessionScreen() {
  const { state, setFirstSessionCompleted } = useOnboarding();
  const target = Math.min(state.rules.cardsRequired, 5);
  const cards = useMemo(() => starterCards.slice(0, target), [target]);

  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [completed, setCompleted] = useState(0);

  const currentCard = cards[index];

  function handleRateCard() {
    const nextCompleted = completed + 1;
    setCompleted(nextCompleted);
    setShowAnswer(false);

    if (nextCompleted >= target) {
      setFirstSessionCompleted(true);
      router.replace("/(onboarding)/intent");
      return;
    }

    setIndex((prev) => prev + 1);
  }

  return (
    <OnboardingContainer
      step={7}
      totalSteps={9}
      title="Earn your first unlock"
      subtitle={`Complete ${target} cards right now. Don’t skip this part.`}
    >
      <View style={styles.progressWrap}>
        <Text style={styles.progressText}>
          {completed}/{target} completed
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Flashcard</Text>
        <Text style={styles.front}>{currentCard?.front}</Text>
        {showAnswer ? <Text style={styles.back}>{currentCard?.back}</Text> : null}
      </View>

      {!showAnswer ? (
        <Pressable style={styles.primaryButton} onPress={() => setShowAnswer(true)}>
          <Text style={styles.primaryButtonText}>Show Answer</Text>
        </Pressable>
      ) : (
        <View style={styles.ratingRow}>
          <Pressable style={styles.secondaryButton} onPress={handleRateCard}>
            <Text style={styles.secondaryButtonText}>Again</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={handleRateCard}>
            <Text style={styles.secondaryButtonText}>Good</Text>
          </Pressable>
        </View>
      )}
    </OnboardingContainer>
  );
}

const styles = StyleSheet.create({
  progressWrap: {
    marginBottom: 16,
  },
  progressText: {
    color: "#B9BDC7",
    fontSize: 15,
  },
  card: {
    backgroundColor: "#151820",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#2A2E36",
    marginBottom: 20,
  },
  cardLabel: {
    color: "#8F95A3",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 14,
  },
  front: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 38,
    marginBottom: 18,
  },
  back: {
    color: "#F8C373",
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 30,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#2A2E36",
  },
  primaryButton: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#0B0B0F",
    fontSize: 16,
    fontWeight: "800",
  },
  ratingRow: {
    flexDirection: "row",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginRight: 6,
  },
  secondaryButtonText: {
    color: "#0B0B0F",
    fontSize: 16,
    fontWeight: "800",
  },
});