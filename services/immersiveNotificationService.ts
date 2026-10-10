import api from "./api";

export interface ImmersiveSettings {
  _id: string;
  userId: string;
  enabled: boolean;
  paused: boolean;
  deckId: string | null;
  intervalMinutes: number;
  windowStart: string; // "HH:MM"
  windowEnd: string;   // "HH:MM"
  timezone: string;
  shuffleMode: boolean;
  cardRangeStart: number | null;
  cardRangeEnd: number | null;
  retiredCardIds: string[];
  cardQueue: string[];
  currentIndex: number;
  lastSentAt: string | null;
  notifTitleFieldIndex: number;
  notifBodyFieldIndex: number;
  subDeckCardIds: string[];
}

export async function getImmersiveSettings(): Promise<ImmersiveSettings> {
  const res = await api.get("/immersive-notifications/settings");
  return res.data.settings;
}

export async function updateImmersiveSettings(
  patch: Partial<Omit<ImmersiveSettings, "_id" | "userId" | "retiredCardIds" | "cardQueue" | "lastSentAt">>
): Promise<ImmersiveSettings> {
  const res = await api.put("/immersive-notifications/settings", patch);
  return res.data.settings;
}

export async function retireCard(cardId: string): Promise<ImmersiveSettings> {
  const res = await api.post(`/immersive-notifications/retire/${cardId}`);
  return res.data.settings;
}

export async function unretireCard(cardId: string): Promise<ImmersiveSettings> {
  const res = await api.delete(`/immersive-notifications/retire/${cardId}`);
  return res.data.settings;
}

export async function getRetiredCards(): Promise<any[]> {
  const res = await api.get("/immersive-notifications/retired");
  return res.data.cards;
}

export async function sendPreview(): Promise<{ card: any; note: any }> {
  const res = await api.post("/immersive-notifications/preview");
  return res.data;
}

export async function recordCardAction(
  cardId: string,
  action: "hard" | "got_it" | "skip"
): Promise<void> {
  await api.post("/immersive-notifications/card-action", { cardId, action });
}

export async function rewindSession(steps: number): Promise<ImmersiveSettings> {
  const res = await api.post("/immersive-notifications/rewind", { steps });
  return res.data.settings;
}

export async function getDeckFields(): Promise<{
  fields: string[];
  titleIdx: number;
  bodyIdx: number;
}> {
  const res = await api.get("/immersive-notifications/deck-fields");
  return { fields: res.data.fields, titleIdx: res.data.titleIdx, bodyIdx: res.data.bodyIdx };
}

export interface WordVariation {
  english: string;
  transliteration?: string; // Pinyin, Latin transliteration, etc. — present for non-Latin scripts
  translation: string;       // Target language sentence
}

export async function getWordVariations(params: {
  word: string;
  context: string;
  targetLanguage?: string;
}): Promise<WordVariation[]> {
  const res = await api.post("/immersive-notifications/word-variations", params);
  return res.data.variations;
}

export async function createVariationCards(params: {
  deckId: string;
  variations: WordVariation[];
  targetLanguage?: string;
}): Promise<Array<{ _id: string; front: string; back: string }>> {
  const res = await api.post("/immersive-notifications/variation-cards", params);
  return res.data.cards;
}
