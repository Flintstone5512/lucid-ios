import api from "./api";

/* =========================
   🔥 DASHBOARD
========================= */

export async function getParentDashboard() {
  const res = await api.get("/parent/dashboard");
  return res.data;
}

/* =========================
   🔥 CHILD MANAGEMENT
========================= */

export async function updateChildRestrictions(payload: {
  childId: string;
  restrictions: {
    maxDailyMinutes: number;
    hardcoreMode?: boolean;
    blockedSites?: string[];
  };
  focusMode?: "off" | "soft" | "strict";
}) {
  const res = await api.put("/parent/children/restrictions", payload);
  return res.data;
}

/* =========================
   🔥 LINK CODE
========================= */

export async function generateLinkCode() {
  const res = await api.post("/link-code/link-code");
  return res.data;
}

/* =========================
   🔥 PARENT CONTROL MODE
========================= */

export async function updateParentFocusMode(
  focusMode: "off" | "soft" | "strict"
) {
  const res = await api.post("/parent/control/control-mode", {
    focusMode,
  });
  return res.data;
}