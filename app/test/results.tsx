import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  loadTestResults,
  clearTestResults,
  buildTestReportHTML,
  exportTestPDF,
  type TestResult,
} from "../../services/testModeService";
import { useRefocusStore } from "../../store/useRefocusStore";
import { LucidTheme } from "../../constants/lucidTheme";

function gradeLabel(pct: number): { letter: string; color: string } {
  if (pct >= 90) return { letter: "A", color: "#4ade80" };
  if (pct >= 80) return { letter: "B", color: "#86efac" };
  if (pct >= 70) return { letter: "C", color: "#facc15" };
  if (pct >= 60) return { letter: "D", color: "#fb923c" };
  return { letter: "F", color: "#f87171" };
}

export default function TestResultsScreen() {
  const { deckName, childName, score, total, durationSeconds } = useLocalSearchParams<{
    deckName: string;
    childName: string;
    score: string;
    total: string;
    durationSeconds: string;
  }>();

  const { context } = useRefocusStore();
  const role = context?.role;

  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const correctCount = Number(score) || 0;
  const totalCount = Number(total) || 0;
  const duration = Number(durationSeconds) || 0;
  const pct = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const { letter, color: gradeColor } = gradeLabel(pct);
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;

  useEffect(() => {
    loadTestResults()
      .then(setResults)
      .finally(() => setLoading(false));
  }, []);

  async function handleExportPDF() {
    setExporting(true);
    try {
      const completedAt = new Date().toLocaleString();
      const html = buildTestReportHTML({
        deckName: deckName || "Test",
        childName: childName || undefined,
        results,
        durationSeconds: duration,
        completedAt,
      });
      await exportTestPDF(html, `${deckName || "test"}-report.pdf`);
    } catch (err) {
      Alert.alert("Export failed", "Could not generate the PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  function handleDone() {
    clearTestResults();
    router.replace("/(tabs)");
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#D86732" size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      {/* Score hero */}
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Test Complete</Text>
        {childName ? (
          <Text style={styles.heroSubLabel}>{childName}</Text>
        ) : null}
        <Text style={[styles.heroScore, { color: gradeColor }]}>{pct}%</Text>
        <Text style={[styles.heroGrade, { color: gradeColor }]}>{letter}</Text>
        <Text style={styles.heroDetail}>
          {correctCount} of {totalCount} correct · {mins}m {secs}s
        </Text>
        <Text style={styles.heroDeck}>{deckName}</Text>
      </View>

      {/* Summary stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: "#4ade80" }]}>{correctCount}</Text>
          <Text style={styles.statLabel}>Correct</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: "#f87171" }]}>
            {totalCount - correctCount}
          </Text>
          <Text style={styles.statLabel}>Missed</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{mins}m {secs}s</Text>
          <Text style={styles.statLabel}>Time</Text>
        </View>
      </View>

      {/* Card-by-card breakdown */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Card Breakdown</Text>

        {results.map((r, i) => (
          <View key={r.cardId + i} style={styles.resultRow}>
            <View style={styles.resultIndicator}>
              <Text style={[styles.resultIcon, r.correct ? styles.correct : styles.wrong]}>
                {r.correct ? "✓" : "✗"}
              </Text>
            </View>
            <View style={styles.resultContent}>
              <Text style={styles.resultFront} numberOfLines={2}>{r.front}</Text>
              <Text style={styles.resultAnswer} numberOfLines={2}>
                {r.correct ? r.correctAnswer : `Your pick: ${r.userAnswer !== r.correctAnswer ? r.userAnswer : "—"}`}
              </Text>
              {!r.correct && (
                <Text style={styles.resultCorrectHint}>
                  Correct: {r.correctAnswer}
                </Text>
              )}
              <Text style={styles.resultType}>
                {r.questionType === "multiple_choice" ? "Multiple Choice" : "Free Recall"}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* PDF export — visible to parent and solo */}
      {(role === "parent" || role === "solo") && (
        <Pressable
          style={[styles.pdfBtn, exporting && styles.pdfBtnDisabled]}
          onPress={handleExportPDF}
          disabled={exporting}
        >
          <Text style={styles.pdfBtnText}>
            {exporting ? "Generating PDF..." : "⬇ Download PDF Report"}
          </Text>
        </Pressable>
      )}

      {/* Done */}
      <Pressable style={styles.doneBtn} onPress={handleDone}>
        <Text style={styles.doneBtnText}>Done</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LucidTheme.bg,
    padding: 24,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: LucidTheme.bg,
  },
  hero: {
    backgroundColor: "#1b2540",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    marginBottom: 20,
  },
  heroLabel: {
    color: "#A9BDDB",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroSubLabel: {
    color: "#D86732",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  heroScore: {
    fontSize: 72,
    fontWeight: "800",
    lineHeight: 80,
  },
  heroGrade: {
    fontSize: 36,
    fontWeight: "800",
    marginBottom: 8,
  },
  heroDetail: {
    color: "#A9BDDB",
    fontSize: 14,
    marginBottom: 4,
  },
  heroDeck: {
    color: "#6b7a9b",
    fontSize: 13,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#1b2540",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  statValue: {
    color: "white",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
  },
  statLabel: {
    color: "#6b7a9b",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: "#1b2540",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#D86732",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 14,
  },
  resultRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#0e1424",
  },
  resultIndicator: {
    width: 28,
    alignItems: "center",
    paddingTop: 2,
  },
  resultIcon: {
    fontSize: 18,
    fontWeight: "800",
  },
  correct: {
    color: "#4ade80",
  },
  wrong: {
    color: "#f87171",
  },
  resultContent: {
    flex: 1,
    gap: 3,
  },
  resultFront: {
    color: "white",
    fontWeight: "700",
    fontSize: 14,
    lineHeight: 20,
  },
  resultAnswer: {
    color: "#A9BDDB",
    fontSize: 13,
    lineHeight: 18,
  },
  resultCorrectHint: {
    color: "#4ade80",
    fontSize: 12,
  },
  resultType: {
    color: "#4a5568",
    fontSize: 11,
    marginTop: 2,
  },
  pdfBtn: {
    backgroundColor: "#1b2540",
    borderWidth: 2,
    borderColor: "#D86732",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    marginBottom: 12,
  },
  pdfBtnDisabled: {
    opacity: 0.4,
  },
  pdfBtnText: {
    color: "#D86732",
    fontWeight: "800",
    fontSize: 16,
  },
  doneBtn: {
    backgroundColor: "#D86732",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
  },
  doneBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
});
