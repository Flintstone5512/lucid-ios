import api from "./api";

export async function getLeaderboard() {
  const res = await api.get("/leaderboard");
  return res.data;
}