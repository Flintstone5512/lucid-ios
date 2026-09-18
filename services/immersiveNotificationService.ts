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
