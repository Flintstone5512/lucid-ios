import api from "./api";

/* =========================
   🔥 GET SESSION
========================= */

export async function getSession(deckId: string) {
  const res = await api.get(`/reviews/session/${deckId}`);
  return res.data;
}

/* =========================
   🔥 SUBMIT REVIEW + UNLOCK
========================= */

export async function submitReview(payload: {
  cardId: string;
  deckId: string;
  rating: string;
}) {
  const res = await api.post("/reviews", payload);

  return res.data; // 🔥 expect unlock info here
}