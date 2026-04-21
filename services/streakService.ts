import api from "./api";

export async function getStreak() {
  const res = await api.get("/streak");
  return res.data;
}

export async function markStreakAtRisk() {
  const res = await api.post("/streak/at-risk");
  return res.data;
}

export async function qualifyToday() {
  const res = await api.post("/streak/qualify");
  return res.data;
}