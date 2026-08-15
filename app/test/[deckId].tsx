import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Animated,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  getMasteredCards,
  generateTestQuestions,
  saveTestResults,
  submitTestResults,
  type TestQuestion,
  type TestResult,
} from "../../services/testModeService";
import { useRefocusStore } from "../../store/useRefocusStore";
import { LucidTheme } from "../../constants/lucidTheme";

export default function TestSessionScreen() {
  const { deckId, deckName, childId, childName } = useLocalSearchParams<{
    deckId: string;
    deckName: string;
    childId?: string;
    childName?: string;
  }>();
  const { context } = useRefocusStore();
  const role = context?.role;

  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [startTime] = useState(Date.now());

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function loadQuestions() {
      const cards = await getMasteredCards(deckId, childId || undefined);
      if (cards.length === 0) {
        Alert.alert(
          "No mastered cards",
          "Complete more study sessions and rate cards as Good or Easy before taking a test.",
          [{ text: "OK", onPress: () => router.back() }]
        );
        return;
      }
      setQuestions(generateTestQuestions(cards));
      setLoading(false);
    }
    loadQuestions();
  }, [deckId]);

  useEffect(() => {
    if (questions.length === 0) return;
    Animated.timing(progressAnim, {
      toValue: (index / questions.length) * 100,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [index, questions.length]);

  const current = questions[index];

  function handleSelectOption(option: string) {
    if (answered) return;
    setSelectedOption(option);
    setAnswered(true);
    recordResult(option, option === current.correctAnswer);
  }

  function handleFreeRecallGrade(correct: boolean) {
    if (answered) return;
    setAnswered(true);
    recordResult(current.correctAnswer, correct);
  }

  function recordResult(userAnswer: string, correct: boolean) {
    const result: TestResult = {
      cardId: current.cardId,
      front: current.front,
      correctAnswer: current.correctAnswer,
      userAnswer,
      correct,
      questionType: current.type,
    };
    setResults((prev) => [...prev, result]);
  }

  async function handleNext() {
    if (!answered) return;
    const isLast = index === questions.length - 1;
    if (isLast) {
      await finishTest();
    } else {
      setIndex((i) => i + 1);
      setRevealed(false);
      setSelectedOption(null);
      setAnswered(false);
    }
  }

  async function finishTest() {
    const durationSeconds = Math.round((Date.now() - startTime) / 1000);
    const allResults = results; // state update may not have flushed yet for last card

    await saveTestResults(allResults);
    await submitTestResults({
      deckId,
      childId: childId || undefined,
      results: allResults.map((r) => ({
        cardId: r.cardId,
        correct: r.correct,
        questionType: r.questionType,
      })),
      durationSeconds,
    });

    router.replace({
      pathname: "/test/results",
      params: {
        deckName: deckName || "Test",
        childName: childName || "",
        score: String(allResults.filter((r) => r.correct).length),
        total: String(allResults.length),
        durationSeconds: String(durationSeconds),
      },
    });
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#D86732" size="large" />
        <Text style={styles.loadingText}>Loading mastered cards...</Text>
      </View>
    );
  }

  if (!current) return null;

  const progressPct = questions.length > 0 ? (index / questions.length) * 100 : 0;
  const liveScore = results.filter((r) => r.correct).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.topBar}>
        <Pressable onPress={() => {
          Alert.alert("Quit Test?", "Your progress will be lost.", [
            { text: "Cancel", style: "cancel" },
            { text: "Quit", style: "destructive", onPress: () => router.back() },
          ]);
        }}>
          <Text style={styles.quitText}>✕</Text>
        </Pressable>
        <Text style={styles.counter}>
          {index + 1} / {questions.length}
        </Text>
        <Text style={styles.scoreText}>{liveScore} correct</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Question type badge */}
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>
            {current.type === "multiple_choice" ? "Multiple Choice" : "Free Recall"}
          </Text>
        </View>

        {/* Front of card */}
        <View style={styles.questionCard}>
          <Text style={styles.questionLabel}>Question</Text>
          <Text style={styles.questionText}>{current.front}</Text>
        </View>

        {/* Multiple choice */}
        {current.type === "multiple_choice" && (
          <View style={styles.optionsContainer}>
            {current.options.map((option, i) => {
              const isSelected = selectedOption === option;
              const isCorrect = option === current.correctAnswer;
              let style = styles.optionBtn;
              if (answered) {
                if (isCorrect) style = { ...styles.optionBtn, ...styles.optionCorrect };
                else if (isSelected && !isCorrect) style = { ...styles.optionBtn, ...styles.optionWrong };
              } else if (isSelected) {
                style = { ...styles.optionBtn, ...styles.optionSelected };
              }
              return (
                <Pressable key={i} onPress={() => handleSelectOption(option)} style={style}>
                  <Text style={[styles.optionText, answered && isCorrect && styles.optionTextCorrect]}>
                    {String.fromCharCode(65 + i)}. {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Free recall */}
        {current.type === "free_recall" && (
          <View style={styles.recallContainer}>
            {!revealed ? (
              <Pressable style={styles.revealBtn} onPress={() => setRevealed(true)}>
                <Text style={styles.revealBtnText}>Reveal Answer</Text>
              </Pressable>
            ) : (
              <>
                <View style={styles.answerCard}>
                  <Text style={styles.answerLabel}>Answer</Text>
                  <Text style={styles.answerText}>{current.correctAnswer}</Text>
                </View>

                {!answered && (
                  <View style={styles.gradeRow}>
                    <Pressable
                      style={[styles.gradeBtn, styles.gradeMissed]}
                      onPress={() => handleFreeRecallGrade(false)}
                    >
                      <Text style={styles.gradeBtnText}>✗ Missed It</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.gradeBtn, styles.gradeGot]}
                      onPress={() => handleFreeRecallGrade(true)}
                    >
                      <Text style={styles.gradeBtnText}>✓ Got It</Text>
                    </Pressable>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* Result feedback */}
        {answered && (
          <View style={[styles.feedbackBanner, results[results.length - 1]?.correct ? styles.feedbackCorrect : styles.feedbackWrong]}>
            <Text style={styles.feedbackText}>
              {results[results.length - 1]?.correct ? "Correct!" : `Incorrect — ${current.correctAnswer}`}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Next / Finish button */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.nextBtn, !answered && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!answered}
        >
          <Text style={styles.nextBtnText}>
            {index === questions.length - 1 ? "Finish Test" : "Next →"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LucidTheme.bg,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: LucidTheme.bg,
    gap: 12,
  },
  loadingText: {
    color: "#A9BDDB",
    fontSize: 14,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 12,
  },
  quitText: {
    color: "#6b7a9b",
    fontSize: 20,
    fontWeight: "700",
  },
  counter: {
    color: "#A9BDDB",
    fontWeight: "700",
    fontSize: 14,
  },
  scoreText: {
    color: "#D86732",
    fontWeight: "800",
    fontSize: 14,
  },
  progressTrack: {
    height: 4,
    backgroundColor: "#1b2540",
    marginHorizontal: 24,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#D86732",
    borderRadius: 2,
  },
  body: {
    padding: 24,
    paddingBottom: 40,
  },
  typeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#1b2540",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 16,
  },
  typeBadgeText: {
    color: "#A9BDDB",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  questionCard: {
    backgroundColor: "#1b2540",
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
  },
  questionLabel: {
    color: "#A9BDDB",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  questionText: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 28,
  },
  optionsContainer: {
    gap: 10,
  },
  optionBtn: {
    backgroundColor: "#1b2540",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  optionSelected: {
    borderColor: "#D86732",
  },
  optionCorrect: {
    backgroundColor: "#0f291a",
    borderColor: "#16a34a",
  },
  optionWrong: {
    backgroundColor: "#290f0f",
    borderColor: "#dc2626",
  },
  optionText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
  },
  optionTextCorrect: {
    color: "#4ade80",
  },
  recallContainer: {
    gap: 16,
  },
  revealBtn: {
    backgroundColor: "#1b2540",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#D86732",
    borderStyle: "dashed",
  },
  revealBtnText: {
    color: "#D86732",
    fontWeight: "800",
    fontSize: 16,
  },
  answerCard: {
    backgroundColor: "#0f291a",
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: "#16a34a",
  },
  answerLabel: {
    color: "#4ade80",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  answerText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 26,
  },
  gradeRow: {
    flexDirection: "row",
    gap: 12,
  },
  gradeBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  gradeMissed: {
    backgroundColor: "#290f0f",
    borderWidth: 1,
    borderColor: "#dc2626",
  },
  gradeGot: {
    backgroundColor: "#0f291a",
    borderWidth: 1,
    borderColor: "#16a34a",
  },
  gradeBtnText: {
    color: "white",
    fontWeight: "800",
    fontSize: 15,
  },
  feedbackBanner: {
    marginTop: 16,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  feedbackCorrect: {
    backgroundColor: "#0f291a",
    borderWidth: 1,
    borderColor: "#16a34a",
  },
  feedbackWrong: {
    backgroundColor: "#290f0f",
    borderWidth: 1,
    borderColor: "#dc2626",
  },
  feedbackText: {
    color: "white",
    fontWeight: "700",
    fontSize: 14,
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
    backgroundColor: LucidTheme.bg,
    borderTopWidth: 1,
    borderTopColor: "#1b2540",
  },
  nextBtn: {
    backgroundColor: "#D86732",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  nextBtnDisabled: {
    opacity: 0.3,
  },
  nextBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
});
