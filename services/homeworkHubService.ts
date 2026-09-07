import api from "./api";

export interface HomeworkQuestion {
  id: string;
  text: string;
}

export type TemperatureLevel = "ice_cold" | "cold" | "warm" | "hot" | "on_fire";

export interface TemperatureFeedback {
  questionId: string;
  temperature: TemperatureLevel;
  hint: string;
  encouragement: string;
  userAnswer: string;
}

export interface StudyCard {
  questionId: string;
  front: string;
  back: string;
}

export interface EvaluationItem {
  questionId: string;
  question: HomeworkQuestion;
  userAnswer: string;
  temperature: TemperatureLevel;
  hint: string;
}

export async function extractHomework(file: {
  uri: string;
  name: string;
  mimeType?: string;
}): Promise<{ questions: HomeworkQuestion[] }> {
  const form = new FormData();
  form.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.mimeType || "application/octet-stream",
  } as any);
  const res = await api.post("/homework/extract", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function evaluateAnswers(
  questions: HomeworkQuestion[],
  answers: Record<string, string>
): Promise<{ results: TemperatureFeedback[] }> {
  const res = await api.post("/homework/evaluate", { questions, answers });
  // Merge the user's original answers back into the results
  const results: TemperatureFeedback[] = res.data.results.map((r: TemperatureFeedback) => ({
    ...r,
    userAnswer: answers[r.questionId] || "",
  }));
  return { results };
}

export async function generateStudyCards(
  evaluationItems: EvaluationItem[]
): Promise<{ cards: StudyCard[] }> {
  const res = await api.post("/homework/study-cards", { evaluationItems });
  return res.data;
}
