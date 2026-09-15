import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import {
  extractHomework,
  evaluateAnswers,
  generateStudyCards,
  HomeworkQuestion,
  TemperatureFeedback,
  TemperatureLevel,
  StudyCard,
  EvaluationItem,
} from "../services/homeworkHubService";

type Phase = "upload" | "quiz" | "feedback" | "study" | "retest" | "retest_feedback";

const MARATHON_ROUNDS = 3;
const BG = "#0e1424";
const CARD_BG = "#161b22";
const BORDER = "#2a2e36";
const ACCENT = "#D86732";
const TEXT = "white";
const SUBTEXT = "#A9BDDB";

// ── Temperature config ───────────────────────────────────────────────────────

const TEMP_CONFIG: Record<
  TemperatureLevel,
  { emoji: string; label: string; color: string; barPercent: number; barColor: string }
> = {
  ice_cold: {
    emoji: "❄️",
    label: "Ice Cold",
    color: "#60a5fa",
    barPercent: 10,
    barColor: "#3b82f6",
  },
  cold: {
    emoji: "🥶",
    label: "Cold",
    color: "#67e8f9",
    barPercent: 30,
    barColor: "#06b6d4",
  },
  warm: {
    emoji: "🌤️",
    label: "Warm",
    color: "#fde047",
    barPercent: 55,
    barColor: "#eab308",
  },
  hot: {
    emoji: "🔥",
    label: "Hot",
    color: "#fb923c",
    barPercent: 78,
    barColor: "#f97316",
  },
  on_fire: {
    emoji: "🔥🔥",
    label: "On Fire!",
    color: "#f87171",
    barPercent: 100,
    barColor: "#ef4444",
  },
};

function TemperatureBar({ level }: { level: TemperatureLevel }) {
  const cfg = TEMP_CONFIG[level];
  return (
    <View style={{ marginTop: 10, marginBottom: 4 }}>
      {/* Track */}
      <View
        style={{
          height: 12,
          backgroundColor: "#1b2540",
          borderRadius: 6,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: BORDER,
        }}
      >
        {/* Gradient segments underneath */}
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            right: 0,
            flexDirection: "row",
          }}
        >
          {[
            { color: "#3b82f6", flex: 1 },
            { color: "#06b6d4", flex: 1 },
            { color: "#eab308", flex: 1 },
            { color: "#f97316", flex: 1 },
            { color: "#ef4444", flex: 1 },
          ].map((seg, i) => (
            <View key={i} style={{ flex: seg.flex, backgroundColor: seg.color, opacity: 0.18 }} />
          ))}
        </View>
        {/* Filled bar */}
        <View
          style={{
            height: "100%",
            width: `${cfg.barPercent}%`,
            backgroundColor: cfg.barColor,
            borderRadius: 6,
            opacity: 0.9,
          }}
        />
      </View>

      {/* Labels row */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 4,
          paddingHorizontal: 2,
        }}
      >
        {(["ice_cold", "cold", "warm", "hot", "on_fire"] as TemperatureLevel[]).map((lvl) => {
          const c = TEMP_CONFIG[lvl];
          const active = lvl === level;
          return (
            <Text
              key={lvl}
              style={{
                fontSize: 9,
                color: active ? c.color : "#374151",
                fontWeight: active ? "800" : "400",
              }}
            >
              {c.emoji}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function HomeworkHubScreen() {
  const [phase, setPhase] = useState<Phase>("upload");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");

  const [selectedFiles, setSelectedFiles] = useState<{
    uri: string; name: string; mimeType?: string;
  }[]>([]);

  const [questions, setQuestions] = useState<HomeworkQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [feedbackResults, setFeedbackResults] = useState<TemperatureFeedback[]>([]);

  const [studyCards, setStudyCards] = useState<StudyCard[]>([]);
  const [studyIndex, setStudyIndex] = useState(0);
  const [studyRound, setStudyRound] = useState(1);
  const [showStudyAnswer, setShowStudyAnswer] = useState(false);

  // Only questions that weren't "on_fire" go to retest
  const retestQuestions = questions.filter((q) => {
    const fb = feedbackResults.find((r) => r.questionId === q.id);
    return fb && fb.temperature !== "on_fire";
  });

  const [retestAnswers, setRetestAnswers] = useState<Record<string, string>>({});
  const [retestFeedback, setRetestFeedback] = useState<TemperatureFeedback[]>([]);

  // ── File picker ────────────────────────────────────────────────────────────

  async function handlePickFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/*"],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (result.canceled) return;
      const incoming = result.assets.map((a) => ({ uri: a.uri, name: a.name, mimeType: a.mimeType }));
      setSelectedFiles((prev) => {
        const existingNames = new Set(prev.map((f) => f.name));
        const deduped = incoming.filter((f) => !existingNames.has(f.name));
        return [...prev, ...deduped];
      });
    } catch {
      Alert.alert("Error", "Could not open file picker. Please try again.");
    }
  }

  function handleRemoveFile(name: string) {
    setSelectedFiles((prev) => prev.filter((f) => f.name !== name));
  }

  // ── Upload & extract ────────────────────────────────────────────────────────

  async function handleAnalyze() {
    if (selectedFiles.length === 0) {
      Alert.alert("No files", "Please add at least one PDF or photo of your homework first.");
      return;
    }
    setLoading(true);
    setLoadingMsg(selectedFiles.length > 1 ? `Reading ${selectedFiles.length} files...` : "Reading your homework...");
    try {
      const { questions: qs } = await extractHomework(selectedFiles);
      if (!qs || qs.length === 0) {
        Alert.alert(
          "No questions found",
          "The AI couldn't find any questions. Make sure the image is clear and well-lit, or try a different file."
        );
        return;
      }
      setQuestions(qs);
      const blank: Record<string, string> = {};
      qs.forEach((q) => (blank[q.id] = ""));
      setAnswers(blank);
      setPhase("quiz");
    } catch (err: any) {
      Alert.alert(
        "Could not read homework",
        err?.response?.data?.message || "Something went wrong. Please make sure the image is clear."
      );
    } finally {
      setLoading(false);
    }
  }

  // ── Submit first-round answers ─────────────────────────────────────────────

  async function handleSubmitAnswers() {
    const unanswered = questions.filter((q) => !answers[q.id]?.trim());
    if (unanswered.length > 0) {
      Alert.alert("Missing answers", `Please answer all ${questions.length} questions before submitting.`);
      return;
    }
    setLoading(true);
    setLoadingMsg("Checking your reasoning...");
    try {
      const { results } = await evaluateAnswers(questions, answers);
      setFeedbackResults(results);
      setPhase("feedback");
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Could not evaluate answers. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Start study session ────────────────────────────────────────────────────

  async function handleStartStudy() {
    const needsWork = feedbackResults.filter((r) => r.temperature !== "on_fire");
    if (needsWork.length === 0) {
      // All on fire — skip straight to done-style feedback
      const blank: Record<string, string> = {};
      retestQuestions.forEach((q) => (blank[q.id] = ""));
      setRetestAnswers(blank);
      setPhase("retest");
      return;
    }

    setLoading(true);
    setLoadingMsg("Building your study cards...");
    try {
      const items: EvaluationItem[] = needsWork.map((r) => ({
        questionId: r.questionId,
        question: questions.find((q) => q.id === r.questionId)!,
        userAnswer: r.userAnswer,
        temperature: r.temperature,
        hint: r.hint,
      }));
      const { cards } = await generateStudyCards(items);
      if (!cards || cards.length === 0) {
        Alert.alert("Error", "Could not generate study cards. Please try again.");
        return;
      }
      setStudyCards(cards);
      setStudyIndex(0);
      setStudyRound(1);
      setShowStudyAnswer(false);
      setPhase("study");
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Could not create study cards.");
    } finally {
      setLoading(false);
    }
  }

  // ── Study card navigation ─────────────────────────────────────────────────

  function handleStudyNext() {
    const nextIndex = studyIndex + 1;
    if (nextIndex < studyCards.length) {
      setStudyIndex(nextIndex);
      setShowStudyAnswer(false);
    } else if (studyRound < MARATHON_ROUNDS) {
      setStudyRound((r) => r + 1);
      setStudyIndex(0);
      setShowStudyAnswer(false);
    } else {
      const blank: Record<string, string> = {};
      retestQuestions.forEach((q) => (blank[q.id] = ""));
      setRetestAnswers(blank);
      setPhase("retest");
    }
  }

  // ── Submit retest answers ─────────────────────────────────────────────────

  async function handleSubmitRetest() {
    const unanswered = retestQuestions.filter((q) => !retestAnswers[q.id]?.trim());
    if (unanswered.length > 0) {
      Alert.alert("Missing answers", "Please answer all questions before submitting.");
      return;
    }
    setLoading(true);
    setLoadingMsg("Checking your reasoning...");
    try {
      const { results } = await evaluateAnswers(retestQuestions, retestAnswers);
      setRetestFeedback(results);
      setPhase("retest_feedback");
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message || "Could not evaluate answers.");
    } finally {
      setLoading(false);
    }
  }

  // ── UI helpers ─────────────────────────────────────────────────────────────

  function renderHeader(title: string, subtitle?: string) {
    return (
      <View style={{ marginBottom: 24 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Text style={{ color: SUBTEXT, fontSize: 14 }}>← Back</Text>
        </Pressable>
        <Text style={{ color: ACCENT, fontSize: 12, fontWeight: "700", letterSpacing: 1 }}>
          HOMEWORK HUB
        </Text>
        <Text style={{ color: TEXT, fontSize: 26, fontWeight: "800", marginTop: 4 }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: SUBTEXT, fontSize: 14, marginTop: 6, lineHeight: 20 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    );
  }

  // ── Phase: Upload ──────────────────────────────────────────────────────────

  function renderUpload() {
    return (
      <>
        {renderHeader(
          "Upload Homework",
          "Add one or more PDFs or photos — the AI reads everything together as a single assignment and finds all the questions."
        )}

        {/* File list */}
        {selectedFiles.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            {selectedFiles.map((f) => (
              <View
                key={f.name}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: CARD_BG,
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: ACCENT + "55",
                }}
              >
                <Text style={{ fontSize: 20, marginRight: 10 }}>
                  {f.mimeType?.startsWith("image") ? "🖼️" : "📄"}
                </Text>
                <Text
                  style={{ color: "#22c55e", fontWeight: "700", fontSize: 13, flex: 1 }}
                  numberOfLines={1}
                >
                  {f.name}
                </Text>
                <Pressable
                  onPress={() => handleRemoveFile(f.name)}
                  hitSlop={10}
                  style={{
                    marginLeft: 10,
                    backgroundColor: "rgba(239,68,68,0.15)",
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ color: "#ef4444", fontWeight: "700", fontSize: 13 }}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Add files button */}
        <Pressable
          onPress={handlePickFile}
          style={{
            borderWidth: 2,
            borderColor: selectedFiles.length > 0 ? ACCENT : BORDER,
            borderStyle: "dashed",
            borderRadius: 18,
            padding: selectedFiles.length > 0 ? 18 : 32,
            alignItems: "center",
            backgroundColor: CARD_BG,
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: selectedFiles.length > 0 ? 24 : 36, marginBottom: 8 }}>
            {selectedFiles.length > 0 ? "➕" : "📄"}
          </Text>
          {selectedFiles.length > 0 ? (
            <Text style={{ color: SUBTEXT, fontWeight: "700", fontSize: 14 }}>
              Add More Files
            </Text>
          ) : (
            <>
              <Text style={{ color: TEXT, fontWeight: "700", fontSize: 16 }}>Pick PDFs or Photos</Text>
              <Text style={{ color: SUBTEXT, fontSize: 13, marginTop: 6, textAlign: "center" }}>
                Supports PDF, JPG, and PNG — select multiple at once
              </Text>
            </>
          )}
        </Pressable>

        <View
          style={{
            backgroundColor: "#1b2540",
            borderRadius: 14,
            padding: 14,
            marginBottom: 20,
          }}
        >
          <Text style={{ color: ACCENT, fontWeight: "700", fontSize: 13, marginBottom: 4 }}>
            🌡️ How the Temperature System Works
          </Text>
          <Text style={{ color: SUBTEXT, fontSize: 13, lineHeight: 20 }}>
            Instead of marking answers right or wrong, the AI tells you how close your{" "}
            <Text style={{ color: TEXT }}>reasoning</Text> is. From ❄️ Ice Cold all the way
            to 🔥🔥 On Fire — it helps you think your way to the answer without just giving it to you.
          </Text>
        </View>

        <Pressable
          onPress={handleAnalyze}
          disabled={selectedFiles.length === 0 || loading}
          style={{
            backgroundColor: selectedFiles.length > 0 ? ACCENT : "#2a2e36",
            borderRadius: 14,
            padding: 16,
            alignItems: "center",
          }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: TEXT, fontWeight: "700", fontSize: 16 }}>
              {selectedFiles.length > 1
                ? `Analyze ${selectedFiles.length} Files`
                : "Analyze Homework"}
            </Text>
          )}
        </Pressable>
        {loading && (
          <Text style={{ color: SUBTEXT, textAlign: "center", marginTop: 12, fontSize: 13 }}>
            {loadingMsg}
          </Text>
        )}
      </>
    );
  }

  // ── Phase: Quiz ────────────────────────────────────────────────────────────

  function renderQuiz() {
    return (
      <>
        {renderHeader(
          "Answer the Questions",
          "Answer in your own words — explain your reasoning, not just a one-word answer. The AI reads your thinking."
        )}

        {questions.map((q, i) => (
          <View
            key={q.id}
            style={{
              backgroundColor: CARD_BG,
              borderWidth: 1,
              borderColor: BORDER,
              borderRadius: 16,
              padding: 16,
              marginBottom: 14,
            }}
          >
            <Text style={{ color: SUBTEXT, fontSize: 12, fontWeight: "700", marginBottom: 6 }}>
              QUESTION {i + 1}
            </Text>
            <Text style={{ color: TEXT, fontSize: 15, lineHeight: 22, marginBottom: 12 }}>
              {q.text}
            </Text>
            <TextInput
              value={answers[q.id] ?? ""}
              onChangeText={(val) => setAnswers((prev) => ({ ...prev, [q.id]: val }))}
              placeholder="Explain your thinking..."
              placeholderTextColor="#555"
              multiline
              textAlignVertical="top"
              style={{
                backgroundColor: "#0f172a",
                borderWidth: 1,
                borderColor: BORDER,
                borderRadius: 10,
                color: TEXT,
                padding: 12,
                fontSize: 14,
                minHeight: 70,
              }}
            />
          </View>
        ))}

        <Pressable
          onPress={handleSubmitAnswers}
          disabled={loading}
          style={{
            backgroundColor: ACCENT,
            borderRadius: 14,
            padding: 16,
            alignItems: "center",
            marginTop: 8,
          }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: TEXT, fontWeight: "700", fontSize: 16 }}>Check My Reasoning</Text>
          )}
        </Pressable>
        {loading && (
          <Text style={{ color: SUBTEXT, textAlign: "center", marginTop: 12, fontSize: 13 }}>
            {loadingMsg}
          </Text>
        )}
      </>
    );
  }

  // ── Phase: Feedback (temperature results) ─────────────────────────────────

  function renderFeedback(
    results: TemperatureFeedback[],
    qs: HomeworkQuestion[],
    isRetest: boolean
  ) {
    const avgScore =
      results.reduce((sum, r) => {
        const pct = TEMP_CONFIG[r.temperature].barPercent;
        return sum + pct;
      }, 0) / results.length;

    const onFireCount = results.filter((r) => r.temperature === "on_fire").length;
    const isAllFire = onFireCount === results.length;

    return (
      <>
        {renderHeader(
          isRetest ? "Retest Results" : "Your Reasoning",
          isRetest
            ? "See how your thinking has improved after studying!"
            : "The temperature shows how close your reasoning is — not whether you are right or wrong."
        )}

        {/* Overall temperature summary */}
        <View
          style={{
            backgroundColor: CARD_BG,
            borderWidth: 1,
            borderColor: BORDER,
            borderRadius: 18,
            padding: 20,
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <Text style={{ color: SUBTEXT, fontSize: 12, fontWeight: "700" }}>AVERAGE TEMPERATURE</Text>
          <Text style={{ color: TEXT, fontSize: 32, marginTop: 8 }}>
            {avgScore >= 90
              ? "🔥🔥"
              : avgScore >= 70
              ? "🔥"
              : avgScore >= 45
              ? "🌤️"
              : avgScore >= 25
              ? "🥶"
              : "❄️"}
          </Text>
          <Text
            style={{
              color: avgScore >= 70 ? "#fb923c" : avgScore >= 45 ? "#fde047" : "#67e8f9",
              fontWeight: "800",
              fontSize: 18,
              marginTop: 4,
            }}
          >
            {avgScore >= 90
              ? "On Fire!"
              : avgScore >= 70
              ? "Hot"
              : avgScore >= 45
              ? "Warm"
              : avgScore >= 25
              ? "Cold"
              : "Ice Cold"}
          </Text>
          {isAllFire && (
            <Text style={{ color: "#22c55e", fontSize: 14, marginTop: 8, textAlign: "center" }}>
              Your reasoning is excellent on every question!
            </Text>
          )}
        </View>

        {/* Per-question feedback */}
        {results.map((r, i) => {
          const q = qs.find((q) => q.id === r.questionId);
          const cfg = TEMP_CONFIG[r.temperature];
          const prevFb = isRetest
            ? feedbackResults.find((f) => f.questionId === r.questionId)
            : null;
          const prevBar = prevFb ? TEMP_CONFIG[prevFb.temperature].barPercent : null;
          const improved =
            prevBar !== null && cfg.barPercent > prevBar;

          return (
            <View
              key={r.questionId}
              style={{
                backgroundColor: CARD_BG,
                borderWidth: 1,
                borderColor: cfg.color + "44",
                borderRadius: 16,
                padding: 16,
                marginBottom: 14,
              }}
            >
              <Text style={{ color: SUBTEXT, fontSize: 11, fontWeight: "700", marginBottom: 4 }}>
                Q{i + 1}
              </Text>
              <Text style={{ color: TEXT, fontSize: 14, lineHeight: 20, marginBottom: 10 }}>
                {q?.text}
              </Text>

              {/* Temperature bar */}
              <TemperatureBar level={r.temperature} />

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 8,
                }}
              >
                <Text style={{ color: cfg.color, fontWeight: "800", fontSize: 14 }}>
                  {cfg.emoji} {cfg.label}
                </Text>
                {improved && (
                  <Text style={{ color: "#22c55e", fontSize: 12, fontWeight: "700" }}>
                    ↑ Warmer!
                  </Text>
                )}
              </View>

              {/* Your answer */}
              <Text style={{ color: "#4a5568", fontSize: 12, marginTop: 8 }}>
                Your answer:{" "}
                <Text style={{ color: SUBTEXT, fontStyle: "italic" }}>{r.userAnswer}</Text>
              </Text>

              {/* Hint */}
              <View
                style={{
                  backgroundColor: "#0f172a",
                  borderRadius: 10,
                  padding: 12,
                  marginTop: 10,
                  borderLeftWidth: 3,
                  borderLeftColor: cfg.color,
                }}
              >
                <Text style={{ color: SUBTEXT, fontSize: 13, lineHeight: 20 }}>
                  💭 {r.hint}
                </Text>
              </View>

              {/* Encouragement */}
              <Text
                style={{
                  color: "#4a5568",
                  fontSize: 12,
                  marginTop: 8,
                  fontStyle: "italic",
                }}
              >
                {r.encouragement}
              </Text>
            </View>
          );
        })}

        {/* Action button */}
        {!isRetest ? (
          isAllFire ? (
            <Pressable
              onPress={() => router.back()}
              style={{
                backgroundColor: "#22c55e",
                borderRadius: 14,
                padding: 16,
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <Text style={{ color: TEXT, fontWeight: "700", fontSize: 16 }}>
                Amazing! All done!
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleStartStudy}
              disabled={loading}
              style={{
                backgroundColor: ACCENT,
                borderRadius: 14,
                padding: 16,
                alignItems: "center",
                marginTop: 8,
              }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{ color: TEXT, fontWeight: "700", fontSize: 16 }}>
                  Start Study Session →
                </Text>
              )}
            </Pressable>
          )
        ) : (
          <Pressable
            onPress={() => router.back()}
            style={{
              backgroundColor: ACCENT,
              borderRadius: 14,
              padding: 16,
              alignItems: "center",
              marginTop: 8,
            }}
          >
            <Text style={{ color: TEXT, fontWeight: "700", fontSize: 16 }}>
              Back to Decks
            </Text>
          </Pressable>
        )}

        {loading && (
          <Text style={{ color: SUBTEXT, textAlign: "center", marginTop: 12, fontSize: 13 }}>
            {loadingMsg}
          </Text>
        )}
      </>
    );
  }

  // ── Phase: Study (Marathon) ────────────────────────────────────────────────

  function renderStudy() {
    const card = studyCards[studyIndex];
    const progressPct = ((studyIndex + 1) / studyCards.length) * 100;

    return (
      <>
        <View style={{ marginBottom: 20 }}>
          <Text style={{ color: ACCENT, fontSize: 12, fontWeight: "700", letterSpacing: 1 }}>
            HOMEWORK HUB — STUDY SESSION
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
            <Text style={{ color: TEXT, fontSize: 18, fontWeight: "800" }}>
              Round {studyRound} of {MARATHON_ROUNDS}
            </Text>
            <Text style={{ color: SUBTEXT, fontSize: 14 }}>
              {studyIndex + 1} / {studyCards.length}
            </Text>
          </View>
          <View
            style={{
              height: 4,
              backgroundColor: BORDER,
              borderRadius: 2,
              marginTop: 10,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: 4,
                width: `${progressPct}%`,
                backgroundColor: ACCENT,
                borderRadius: 2,
              }}
            />
          </View>
        </View>

        <View
          style={{
            backgroundColor: CARD_BG,
            borderWidth: 1,
            borderColor: BORDER,
            borderRadius: 20,
            padding: 24,
            minHeight: 220,
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          {!showStudyAnswer ? (
            <>
              <Text style={{ color: SUBTEXT, fontSize: 11, fontWeight: "700", marginBottom: 12 }}>
                THINK ABOUT THIS
              </Text>
              <Text style={{ color: TEXT, fontSize: 17, lineHeight: 28 }}>{card.front}</Text>
              <Pressable
                onPress={() => setShowStudyAnswer(true)}
                style={{
                  marginTop: 24,
                  backgroundColor: "#1b2540",
                  borderRadius: 12,
                  padding: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: SUBTEXT, fontWeight: "700" }}>
                  Tap to see the reasoning guide
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={{ color: SUBTEXT, fontSize: 11, fontWeight: "700", marginBottom: 12 }}>
                A WAY TO THINK ABOUT THIS
              </Text>
              <Text style={{ color: TEXT, fontSize: 16, lineHeight: 26 }}>{card.back}</Text>
            </>
          )}
        </View>

        {showStudyAnswer && (
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              onPress={() => { setShowStudyAnswer(false); handleStudyNext(); }}
              style={{
                flex: 1,
                backgroundColor: "#1b2540",
                borderWidth: 1,
                borderColor: BORDER,
                borderRadius: 14,
                padding: 16,
                alignItems: "center",
              }}
            >
              <Text style={{ color: SUBTEXT, fontWeight: "700" }}>Still thinking...</Text>
            </Pressable>
            <Pressable
              onPress={() => { setShowStudyAnswer(false); handleStudyNext(); }}
              style={{
                flex: 1,
                backgroundColor: "#0f2a1a",
                borderWidth: 1,
                borderColor: "#22c55e55",
                borderRadius: 14,
                padding: 16,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#22c55e", fontWeight: "700" }}>Got it!</Text>
            </Pressable>
          </View>
        )}

        <Text
          style={{
            color: "#374151",
            fontSize: 12,
            textAlign: "center",
            marginTop: 20,
            lineHeight: 18,
          }}
        >
          {MARATHON_ROUNDS} rounds builds real understanding.{"\n"}
          No answers given — just better thinking.
        </Text>
      </>
    );
  }

  // ── Phase: Retest ──────────────────────────────────────────────────────────

  function renderRetest() {
    return (
      <>
        {renderHeader(
          "Time to Retest!",
          `You worked through ${MARATHON_ROUNDS} rounds of study cards. Now try these questions again — see how your reasoning has heated up!`
        )}

        {retestQuestions.map((q, i) => {
          const origFb = feedbackResults.find((r) => r.questionId === q.id);
          const origCfg = origFb ? TEMP_CONFIG[origFb.temperature] : null;
          return (
            <View
              key={q.id}
              style={{
                backgroundColor: CARD_BG,
                borderWidth: 1,
                borderColor: BORDER,
                borderRadius: 16,
                padding: 16,
                marginBottom: 14,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={{ color: SUBTEXT, fontSize: 12, fontWeight: "700" }}>
                  QUESTION {i + 1}
                </Text>
                {origCfg && (
                  <Text style={{ color: origCfg.color, fontSize: 12 }}>
                    Was: {origCfg.emoji} {origCfg.label}
                  </Text>
                )}
              </View>
              <Text style={{ color: TEXT, fontSize: 15, lineHeight: 22, marginBottom: 12 }}>
                {q.text}
              </Text>
              <TextInput
                value={retestAnswers[q.id] ?? ""}
                onChangeText={(val) =>
                  setRetestAnswers((prev) => ({ ...prev, [q.id]: val }))
                }
                placeholder="Explain your thinking..."
                placeholderTextColor="#555"
                multiline
                textAlignVertical="top"
                style={{
                  backgroundColor: "#0f172a",
                  borderWidth: 1,
                  borderColor: BORDER,
                  borderRadius: 10,
                  color: TEXT,
                  padding: 12,
                  fontSize: 14,
                  minHeight: 70,
                }}
              />
            </View>
          );
        })}

        <Pressable
          onPress={handleSubmitRetest}
          disabled={loading}
          style={{
            backgroundColor: ACCENT,
            borderRadius: 14,
            padding: 16,
            alignItems: "center",
            marginTop: 8,
          }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: TEXT, fontWeight: "700", fontSize: 16 }}>
              Check My Reasoning
            </Text>
          )}
        </Pressable>
        {loading && (
          <Text style={{ color: SUBTEXT, textAlign: "center", marginTop: 12, fontSize: 13 }}>
            {loadingMsg}
          </Text>
        )}
      </>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  function renderPhase() {
    switch (phase) {
      case "upload":
        return renderUpload();
      case "quiz":
        return renderQuiz();
      case "feedback":
        return renderFeedback(feedbackResults, questions, false);
      case "study":
        return renderStudy();
      case "retest":
        return renderRetest();
      case "retest_feedback":
        return renderFeedback(retestFeedback, retestQuestions, true);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24, paddingTop: 60, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        {renderPhase()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
