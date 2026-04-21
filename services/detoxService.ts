import api from "./api";

export async function getDetox() {
  const res = await api.get("/detox");
  return res.data;
}

export async function updateDetox(payload: any) {
  const res = await api.put("/detox", payload);
  return res.data;
}

export async function checkDetox() {
  const res = await api.get("/detox/check");
  return res.data;
}

export async function useEmergencyBypass(minutes = 10) {
  const res = await api.post("/detox/bypass", { minutes });
  return res.data;
}