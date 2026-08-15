import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as Notifications from "expo-notifications";
import api from "./api";

/* =========================
   TYPES
========================= */

export interface TestQuestion {
  cardId: string;
  front: string;
  back: string;
  type: "multiple_choice" | "free_recall";
  options: string[]; // always 4 items; for free_recall still populated but unused
  correctAnswer: string;
}

export interface TestResult {
  cardId: string;
  front: string;
  correctAnswer: string;
  userAnswer: string;
  correct: boolean;
  questionType: "multiple_choice" | "free_recall";
}

const RESULTS_KEY = "lucid_test_results";

/* =========================
   API
========================= */

export async function getMasteredCards(deckId: string, childId?: string): Promise<any[]> {
  try {
    const params = childId ? `?childUserId=${childId}` : "";
    const res = await api.get(`/decks/${deckId}/mastered-cards${params}`);
    return res.data?.cards || res.data || [];
  } catch {
    // Endpoint not live yet — fall back to the regular review session cards
    try {
      const res = await api.get(`/reviews/session/${deckId}`);
      const cards = res.data?.cards || res.data || [];
      return cards;
    } catch {
      return [];
    }
  }
}

export async function scheduleChildTest(payload: {
  childId: string;
  deckId: string;
  deckName: string;
  scheduledAt: string; // ISO
}) {
  try {
    await api.post("/tests/schedule", payload);
  } catch {
    // Non-critical if backend doesn't have this endpoint yet
  }
}

export async function submitTestResults(payload: {
  deckId: string;
  childId?: string;
  results: { cardId: string; correct: boolean; questionType: string }[];
  durationSeconds: number;
}) {
  try {
    await api.post("/tests/results", payload);
  } catch {
    // Non-critical
  }
}

/* =========================
   QUESTION GENERATION
========================= */

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateTestQuestions(cards: any[]): TestQuestion[] {
  const allBacks = cards.map((c) => c.back).filter(Boolean);

  return shuffle(cards).map((card) => {
    const cardId = card._id || card.id;
    const front = card.front || "";
    const back = card.back || "";

    const canDoMC = allBacks.length >= 4;
    // Alternate types; use MC roughly 60% of the time when possible
    const type: "multiple_choice" | "free_recall" =
      canDoMC && Math.random() < 0.6 ? "multiple_choice" : "free_recall";

    let options: string[] = [];
    if (type === "multiple_choice") {
      const distractors = shuffle(allBacks.filter((b) => b !== back)).slice(0, 3);
      options = shuffle([back, ...distractors]);
    } else {
      options = [back];
    }

    return { cardId, front, back, type, options, correctAnswer: back };
  });
}

/* =========================
   RESULT STORAGE
========================= */

export async function saveTestResults(results: TestResult[]) {
  await AsyncStorage.setItem(RESULTS_KEY, JSON.stringify(results));
}

export async function loadTestResults(): Promise<TestResult[]> {
  const raw = await AsyncStorage.getItem(RESULTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function clearTestResults() {
  await AsyncStorage.removeItem(RESULTS_KEY);
}

/* =========================
   NOTIFICATIONS
========================= */

export async function scheduleLocalTestNotification(
  childName: string,
  deckName: string,
  scheduledAt: Date
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Test reminder for ${childName}`,
      body: `${childName} has a "${deckName}" test coming up. Open Lucid to begin.`,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: scheduledAt,
    },
  });
}

/* =========================
   PDF GENERATION
========================= */

export function buildTestReportHTML(opts: {
  deckName: string;
  childName?: string;
  results: TestResult[];
  durationSeconds: number;
  completedAt: string;
}): string {
  const { deckName, childName, results, durationSeconds, completedAt } = opts;
  const correct = results.filter((r) => r.correct).length;
  const total = results.length;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const mins = Math.floor(durationSeconds / 60);
  const secs = durationSeconds % 60;
  const durationStr = `${mins}m ${secs}s`;

  const grade =
    pct >= 90 ? "A" : pct >= 80 ? "B" : pct >= 70 ? "C" : pct >= 60 ? "D" : "F";

  const rows = results
    .map(
      (r) => `
      <tr>
        <td class="front">${escapeHtml(r.front)}</td>
        <td>${escapeHtml(r.correctAnswer)}</td>
        <td class="${r.correct ? "pass" : "fail"}">${r.correct ? "✓" : "✗"}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111; padding: 40px; }
  h1 { font-size: 28px; margin-bottom: 4px; }
  .subtitle { color: #555; font-size: 14px; margin-bottom: 32px; }
  .summary { display: flex; gap: 24px; margin-bottom: 32px; }
  .stat { background: #f5f5f5; border-radius: 12px; padding: 16px 24px; min-width: 100px; text-align: center; }
  .stat-value { font-size: 32px; font-weight: 800; color: #D86732; }
  .stat-label { font-size: 12px; color: #666; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead th { background: #1b2540; color: white; padding: 10px 12px; text-align: left; }
  tbody tr:nth-child(even) { background: #f9f9f9; }
  td { padding: 10px 12px; border-bottom: 1px solid #eee; vertical-align: top; }
  td.front { max-width: 260px; font-weight: 600; }
  td.pass { color: #16a34a; font-weight: 800; font-size: 16px; }
  td.fail { color: #dc2626; font-weight: 800; font-size: 16px; }
  .footer { margin-top: 40px; font-size: 11px; color: #999; }
</style>
</head>
<body>
<h1>Test Report — ${escapeHtml(deckName)}</h1>
<p class="subtitle">
  ${childName ? `Student: <strong>${escapeHtml(childName)}</strong> &nbsp;|&nbsp;` : ""}
  Completed: ${completedAt} &nbsp;|&nbsp; Duration: ${durationStr}
</p>

<div class="summary">
  <div class="stat"><div class="stat-value">${pct}%</div><div class="stat-label">Score</div></div>
  <div class="stat"><div class="stat-value">${grade}</div><div class="stat-label">Grade</div></div>
  <div class="stat"><div class="stat-value">${correct}/${total}</div><div class="stat-label">Correct</div></div>
  <div class="stat"><div class="stat-value">${durationStr}</div><div class="stat-label">Time</div></div>
</div>

<table>
  <thead>
    <tr>
      <th>Card Front</th>
      <th>Correct Answer</th>
      <th>Result</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>

<p class="footer">Generated by Lucid · ${completedAt}</p>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function exportTestPDF(html: string, filename?: string) {
  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: filename || "Test Report",
      UTI: "com.adobe.pdf",
    });
  }
}
