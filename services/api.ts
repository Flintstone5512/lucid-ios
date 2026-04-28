import axios from "axios";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { InternalAxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";
/* =========================
   🔥 ENV SWITCH
========================= */

const USE_LOCAL = false; // 👈 toggle if needed

const LOCAL_BASE =
  Platform.OS === "android"
    ? "http://10.0.2.2:3001/api"
    : "http://localhost:3001/api";

const PROD_BASE =
  "https://lucid-backend-production.up.railway.app/api";

const BASE = USE_LOCAL ? LOCAL_BASE : PROD_BASE;

/* =========================
   🔥 AXIOS INSTANCE
========================= */

const api = axios.create({
  baseURL: BASE,
  timeout: 10000,
});

/* =========================
   🔥 AUTH STATE
========================= */

let token: string | null = null;

/* =========================
   🔥 SET TOKEN
========================= */

export async function setAuthToken(t: string | null) {
  token = t;

  if (t) {
    await AsyncStorage.setItem("authToken", t);
  } else {
    await AsyncStorage.removeItem("authToken");
  }
}

/* =========================
   🔥 BOOTSTRAP TOKEN
========================= */

export async function bootstrapAuthToken() {
  const stored = await AsyncStorage.getItem("authToken");

  if (stored) {
    token = stored;
  }

  return stored;

}



export async function clearAuthToken() {
  try {
    await SecureStore.deleteItemAsync("token");
  } catch (err) {
    console.log("Failed to clear token", err);
  }
}

/* =========================
   🔥 🔥 THIS IS THE MISSING PIECE 🔥 🔥
========================= */

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
   console.log("TOKEN:", token); // 🔥 ADD THIS
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});
/* =========================
   🔥 CORE API (MATCH EXTENSION)
========================= */

export async function getContext() {
  const res = await api.get("/me/context");
  return res.data;
}

export async function getStreak() {
  const res = await api.get("/streak");
  return res.data;
}

export async function getMastery() {
  const res = await api.get("/progress/mastery");
  return res.data;
}

export async function getWastedScreen() {
  const res = await api.get("/usage/wasted-screen");
  return res.data;
}

/* =========================
   🔥 SHARED STATE (LIKE EXTENSION)
========================= */

export async function getSharedState() {
  const [streak, mastery, context, usage, settings] = await Promise.all([
    getStreak(),
    getMastery(),
    getContext(),
    getWastedScreen(),
    getSettings(), // 🔥 ADD THIS
  ]);

  return {
    streak: streak?.streak || null,
    mastery: mastery?.mastery || [],
    context: context?.context || null,
    usage: usage || null,

    // 🔥 THIS FIXES EVERYTHING
    settings: settings?.settings || null,
  };
}

/* =========================
   🔥 UNLOCK + REVIEW (IMPORTANT)
========================= */
export async function getDecks() {
  const res = await api.get("/decks");
  return res.data.decks || res.data;
}


export async function getSession(deckId: string) {
  const res = await api.get(`/reviews/session/${deckId}`);
  return res.data;
}

export async function submitReview(payload: any) {
  const res = await api.post("/reviews", payload);
  return res.data;
}

export async function requestUnlock() {
  const res = await api.post("/unlock", {});
  return res.data;
}

/* =========================
   🔥 SETTINGS
========================= */

export async function getSettings() {
  const res = await api.get("/settings");
  return res.data;
}

export async function updateSettings(payload: any) {
  const res = await api.put("/settings", payload);
  return res.data;
}

/* =========================
   🔥 ANALYTICS
========================= */

export async function getAnalyticsDashboard() {
  const res = await api.get("/analytics/dashboard");
  return res.data;
}

/* =========================
   🔥 EXPORT
========================= */

export default api;