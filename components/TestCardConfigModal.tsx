import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { LucidTheme } from "../constants/lucidTheme";

type Field = "front" | "back";

type Props = {
  visible: boolean;
  sampleCard: { front: string; back: string } | null;
  loadingSample: boolean;
  questionField: Field;
  answerField: Field;
  onQuestionFieldChange: (f: Field) => void;
  onAnswerFieldChange: (f: Field) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function TestCardConfigModal({
  visible,
  sampleCard,
  loadingSample,
  questionField,
  answerField,
  onQuestionFieldChange,
  onAnswerFieldChange,
  onConfirm,
  onCancel,
}: Props) {
  const questionPreview = sampleCard ? sampleCard[questionField] : null;
  const answerPreview = sampleCard ? sampleCard[answerField] : null;

  function selectQuestion(f: Field) {
    onQuestionFieldChange(f);
    if (answerField === f) onAnswerFieldChange(f === "front" ? "back" : "front");
  }

  function selectAnswer(f: Field) {
    onAnswerFieldChange(f);
    if (questionField === f) onQuestionFieldChange(f === "front" ? "back" : "front");
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Configure Test Cards</Text>
          <Text style={styles.subtitle}>
            Choose which field acts as the question and which as the answer on each card.
          </Text>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Question field */}
          <Text style={styles.sectionLabel}>Question (shown as the prompt)</Text>
          <View style={styles.optionGroup}>
            {(["front", "back"] as const).map((field) => {
              const selected = questionField === field;
              return (
                <Pressable
                  key={field}
                  style={[styles.optionRow, selected && styles.optionRowSelectedOrange]}
                  onPress={() => selectQuestion(field)}
                >
                  <View style={[styles.radio, selected && styles.radioOrange]}>
                    {selected && <View style={styles.dotOrange} />}
                  </View>
                  <Text style={[styles.optionText, selected && styles.optionTextOrange]}>
                    {field === "front" ? "Front field" : "Back field"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Answer field */}
          <Text style={styles.sectionLabel}>Answer (correct answer &amp; options)</Text>
          <View style={styles.optionGroup}>
            {(["front", "back"] as const).map((field) => {
              const selected = answerField === field;
              return (
                <Pressable
                  key={field}
                  style={[styles.optionRow, selected && styles.optionRowSelectedBlue]}
                  onPress={() => selectAnswer(field)}
                >
                  <View style={[styles.radio, selected && styles.radioBlue]}>
                    {selected && <View style={styles.dotBlue} />}
                  </View>
                  <Text style={[styles.optionText, selected && styles.optionTextBlue]}>
                    {field === "front" ? "Front field" : "Back field"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Live preview */}
          <Text style={styles.sectionLabel}>Preview</Text>
          {loadingSample ? (
            <View style={styles.previewLoading}>
              <ActivityIndicator color="#D86732" />
              <Text style={styles.previewLoadingText}>Loading sample card…</Text>
            </View>
          ) : (
            <View style={styles.previewContainer}>
              <View style={styles.previewQuestion}>
                <Text style={styles.previewQuestionLabel}>QUESTION</Text>
                <Text style={styles.previewText} numberOfLines={4}>
                  {questionPreview || "No mastered cards in this deck yet."}
                </Text>
              </View>
              <View style={styles.previewAnswer}>
                <Text style={styles.previewAnswerLabel}>ANSWER</Text>
                <Text style={styles.previewText} numberOfLines={3}>
                  {answerPreview || "—"}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.confirmBtn} onPress={onConfirm}>
            <Text style={styles.confirmText}>Start Test</Text>
          </Pressable>
          <Pressable onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LucidTheme.bg,
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1b2540",
  },
  title: {
    color: "white",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 6,
  },
  subtitle: {
    color: "#A9BDDB",
    fontSize: 13,
    lineHeight: 18,
  },
  body: {
    flex: 1,
    padding: 20,
  },
  sectionLabel: {
    color: "#D86732",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 24,
    marginBottom: 10,
  },
  optionGroup: {
    gap: 8,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1b2540",
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  optionRowSelectedOrange: {
    borderColor: "#D86732",
  },
  optionRowSelectedBlue: {
    borderColor: "#6EADEB",
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#6b7a9b",
    justifyContent: "center",
    alignItems: "center",
  },
  radioOrange: { borderColor: "#D86732" },
  radioBlue: { borderColor: "#6EADEB" },
  dotOrange: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#D86732" },
  dotBlue: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#6EADEB" },
  optionText: {
    color: "#A9BDDB",
    fontSize: 15,
    fontWeight: "600",
  },
  optionTextOrange: { color: "#D86732" },
  optionTextBlue: { color: "#6EADEB" },
  previewContainer: {
    gap: 10,
  },
  previewLoading: {
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1b2540",
    borderRadius: 16,
    gap: 10,
  },
  previewLoadingText: {
    color: "#6b7a9b",
    fontSize: 13,
  },
  previewQuestion: {
    backgroundColor: "#1b2540",
    borderRadius: 14,
    padding: 16,
  },
  previewAnswer: {
    backgroundColor: "#0f291a",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#16a34a",
  },
  previewQuestionLabel: {
    color: "#A9BDDB",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  previewAnswerLabel: {
    color: "#4ade80",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  previewText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
  },
  footer: {
    padding: 20,
    paddingBottom: 44,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#1b2540",
  },
  confirmBtn: {
    backgroundColor: "#D86732",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  confirmText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  cancelText: {
    color: "#A9BDDB",
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
  },
});
