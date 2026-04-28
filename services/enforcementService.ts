import api from "./api";

export async function checkEnforcement() {
  const res = await api.get("/enforcement/check");
  return res.data;
}