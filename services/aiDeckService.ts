import api from "./api";

/* =========================
   🔥 AI GENERATE (TEXT → DECK)
========================= */

export type CardType = "basic" | "multiple_choice" | "cloze" | "mixed";

export async function generateDeck(prompt: string, cardType: CardType = "basic") {
  const form = new FormData();
  form.append("type", "text");
  form.append("prompt", prompt);
  form.append("cardType", cardType);

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
  frontFieldIndex = 0,
  backFieldIndex = 1,
) {
  const form = new FormData();

  form.append("file", {
    uri: file.uri,
    name: file.name || "deck.apkg",
    type: file.mimeType || "application/octet-stream",
  } as any);

  form.append("frontFieldIndex", String(frontFieldIndex));
  form.append("backFieldIndex", String(backFieldIndex));

  const res = await api.post("/import/apkg", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 90000,
  });

  return res.data;
}
