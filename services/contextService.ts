// src/services/contextService.ts

import api from "./api";
import { useRefocusStore } from "../store/useRefocusStore";

export async function refreshUserContext() {
  try {
    const res = await api.get("/me/context");

    useRefocusStore.getState().setStatePatch({
      context: {
        settings: res.data.settings,
      },
    });

  } catch (err) {
    console.error("Failed to refresh context", err);
  }
}