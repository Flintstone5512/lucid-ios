// src/services/contextService.ts

import api from "./api";
import { useRefocusStore } from "../store/useRefocusStore";

export async function refreshUserContext() {
  try {
    const res = await api.get("/me/context");
    console.log("[CONTEXT] raw /me/context response keys:", Object.keys(res.data || {}));

    // The API returns { context: { role, settings, account, streak, usage, ... } }
    // Store the full context so role, account, streak, etc. are all available
    const fullContext = res.data.context ?? res.data;

    useRefocusStore.getState().setStatePatch({
      context: fullContext,
    });

  } catch (err) {
    console.error("Failed to refresh context", err);
  }
}