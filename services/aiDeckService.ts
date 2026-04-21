import api from "./api";

/* =========================
   🔥 AI GENERATE (TEXT → DECK)
========================= */

export async function generateDeck(prompt: string) {
  const form = new FormData();
  form.append("type", "text");
  form.append("prompt", prompt);

  const res = await api.post("/ai-deck", form);

  return res.data;
}

/* =========================
   🔥 IMPORT ANKI (.apkg)
========================= */

export async function importAnkiDeck(file: {
  uri: string;
  name: string;
  mimeType?: string;
}) {
  const form = new FormData();

  form.append("file", {
    uri: file.uri,
    name: file.name || "deck.apkg",
    type: file.mimeType || "application/octet-stream",
  } as any);

  const res = await api.post("/import/apkg", form, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
}