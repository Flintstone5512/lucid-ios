import api from "./api";

/* =========================
   🔥 AI GENERATE (TEXT → DECK)
========================= */

export type CardType = "basic" | "multiple_choice" | "cloze" | "mixed";

export async function generateDeck(prompt: string, cardType: CardType = "basic", deckName?: string) {
  const form = new FormData();
  form.append("type", "text");
  form.append("prompt", prompt);
  form.append("cardType", cardType);
  if (deckName) form.append("deckName", deckName);

  const res = await api.post("/ai-deck", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 30000,
  });

  return res.data;
}

export async function askAITutor(front: string, back: string): Promise<string> {
  const res = await api.post("/ai-tutor/explain", { front, back });
  return res.data.explanation;
}

/* =========================
   🔥 IMPORT ANKI (.apkg)
========================= */

export type AnkiFieldSchema = { name: string; value: string }[];

export type AnkiPreview = {
  deckName: string;
  totalNotes: number;
  modelSchemas: { modelId: string; modelName: string; fields: string[] }[];
  samples: AnkiFieldSchema[];
};

export async function previewAnkiDeck(file: {
  uri: string;
  name: string;
  mimeType?: string;
}): Promise<AnkiPreview> {
  const form = new FormData();
  form.append("file", {
    uri: file.uri,
    name: file.name || "deck.apkg",
    type: file.mimeType || "application/octet-stream",
  } as any);

  const res = await api.post("/import/apkg/preview", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60000,
  });

  return res.data;
}

export async function importAnkiDeck(
  file: { uri: string; name: string; mimeType?: string },
  frontFieldIndices: number[] = [0],
  backFieldIndices: number[]  = [1],
  audioFieldIndex: number | null = null,
  deckName?: string,
) {
  const form = new FormData();

  form.append("file", {
    uri: file.uri,
    name: file.name || "deck.apkg",
    type: file.mimeType || "application/octet-stream",
  } as any);

  form.append("frontFieldIndices", JSON.stringify(frontFieldIndices));
  form.append("backFieldIndices",  JSON.stringify(backFieldIndices));
  if (audioFieldIndex != null) {
    form.append("audioFieldIndex", String(audioFieldIndex));
  }
  if (deckName) form.append("deckName", deckName);

  const res = await api.post("/import/apkg", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 90000,
  });

  return res.data;
}

/* =========================
   🔥 IMPORT EXCEL (.xlsx / .csv)
========================= */

export async function previewExcelDeck(file: {
  uri: string;
  name: string;
  mimeType?: string;
}): Promise<AnkiPreview> {
  const form = new FormData();
  form.append("file", {
    uri: file.uri,
    name: file.name || "deck.xlsx",
    type: file.mimeType || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  } as any);

  const res = await api.post("/import/xlsx/preview", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 30000,
  });

  return res.data;
}

export async function importExcelDeck(
  file: { uri: string; name: string; mimeType?: string },
  frontFieldIndices: number[] = [0],
  backFieldIndices: number[]  = [1],
  deckName?: string,
) {
  const form = new FormData();

  form.append("file", {
    uri: file.uri,
    name: file.name || "deck.xlsx",
    type: file.mimeType || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  } as any);

  form.append("frontFieldIndices", JSON.stringify(frontFieldIndices));
  form.append("backFieldIndices",  JSON.stringify(backFieldIndices));
  if (deckName) form.append("deckName", deckName);

  const res = await api.post("/import/xlsx", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 90000,
  });

  return res.data;
}

export async function remapDeckFields(
  deckId: string,
  frontFieldIndices: number[],
  backFieldIndices: number[],
  audioFieldIndex: number | null,
) {
  const res = await api.patch(`/decks/${deckId}/remap-fields`, {
    frontFieldIndices,
    backFieldIndices,
    audioFieldIndex,
  });
  return res.data;
}
