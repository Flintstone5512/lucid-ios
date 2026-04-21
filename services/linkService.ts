import api from "./api";

export async function joinWithCode(code: string, name: string) {
  const res = await api.post("/parent/join", {
    code,
    name,
  });

  return res.data;
}