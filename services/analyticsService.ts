import api from "./api";

export async function getAnalyticsDashboard() {
  const res = await api.get("/analytics/dashboard");
  return res.data;
}