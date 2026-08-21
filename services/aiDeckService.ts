import api from "./api";

/* =========================
   🔥 AI GENERATE (TEXT → DECK)
========================= */

export type CardType = "basic" | "multiple_choice" | "cloze" | "mixed";

export type AIPreviewCard = {
  type?: string;
  front?: string;
  back?: string;
  text?: string;
};

export type AIPreview = {
  deckName: string;
  cards: AIPreviewCard[];
};

export async function previewAIDeck(
  prompt: string,
  cardType: CardType = "basic",
): Promise<AIPreview> {
  const form = new FormData();
  form.append("type", "text");
  form.append("prompt", prompt);
  form.append("cardType", cardType);

  const res = await api.post("/ai-deck/preview", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 45000,
  });
  return res.data;
}

export async function previewAIDeckFromFile(
  file: { uri: string; name: string; mimeType?: string },
  cardType: CardType = "basic",
): Promise<AIPreview> {
  const form = new FormData();
  form.append("type", "file");
  form.append("cardType", cardType);
  form.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.mimeType || "application/octet-stream",
  } as any);

  const res = await api.post("/ai-deck/preview", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60000,
  });
  return res.data;
}

export async function confirmAIDeck(
  cards: AIPreviewCard[],
  deckName: string,
  cardType: CardType = "basic",
) {
  const res = await api.post("/ai-deck/confirm", { cards, deckName, cardType });
  return res.data;
}

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

export type MediaRef = { type: "image" | "audio" | "video"; url: string };
export type AnkiFieldSchema = { name: string; value: string; media?: MediaRef[] }[];

export type AnkiPreview = {
  deckName: string;
  totalNotes: number;
  modelSchemas: { modelId: string; modelName: string; fields: string[] }[];
  samples: AnkiFieldSchema[];
  suggestedFrontFieldIndices?: number[];
  suggestedBackFieldIndices?: number[];
  suggestedAudioFieldIndex?: number | null;
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

/* =========================
   🔥 PARENT DECK MANAGEMENT FOR CHILD
========================= */

export async function generateDeckForChild(
  prompt: string,
  cardType: CardType = "basic",
  deckName: string | undefined,
  targetChildId: string,
) {
  const form = new FormData();
  form.append("type", "text");
  form.append("prompt", prompt);
  form.append("cardType", cardType);
  if (deckName) form.append("deckName", deckName);
  form.append("targetChildId", targetChildId);

  const res = await api.post("/ai-deck/for-child", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 30000,
  });

  return res.data;
}

export async function importAnkiDeckForChild(
  file: { uri: string; name: string; mimeType?: string },
  frontFieldIndices: number[] = [0],
  backFieldIndices: number[]  = [1],
  audioFieldIndex: number | null = null,
  deckName: string | undefined,
  targetChildId: string,
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
  form.append("targetChildId", targetChildId);

  const res = await api.post("/import/apkg/for-child", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 90000,
  });

  return res.data;
}

export async function importExcelDeckForChild(
  file: { uri: string; name: string; mimeType?: string },
  frontFieldIndices: number[] = [0],
  backFieldIndices: number[]  = [1],
  deckName: string | undefined,
  targetChildId: string,
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
  form.append("targetChildId", targetChildId);

  const res = await api.post("/import/xlsx/for-child", form, {
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
