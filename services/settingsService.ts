import api from "./api";

export async function getSettings() {
  const res = await api.get("/settings");
  return res.data;
}

export async function updateSettings(payload: any) {
  const res = await api.put("/settings", payload);
  return res.data;
}