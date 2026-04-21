import api from "./api";

export async function getUnlockStatus() {
  const res = await api.get("/unlock");
  return res.data;
}