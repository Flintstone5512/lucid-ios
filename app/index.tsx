import { useEffect } from "react";
import { router } from "expo-router";

import { getOnboardingComplete } from "../services/storage";
import { bootstrapAuthToken, getContext } from "../services/api";

export default function Index() {
  useEffect(() => {
    async function init() {
      try {
        /* =========================
           🔐 AUTH CHECK
        ========================= */
        const token = await bootstrapAuthToken();

        if (!token) {
          router.replace("/login");
          return;
        }

        /* =========================
           🧠 ONBOARDING CHECK
        ========================= */
        const done = await getOnboardingComplete();

        if (!done) {
          router.replace("/(onboarding)");
          return;
        }

        /* =========================
           👤 ROLE CHECK (NEW)
        ========================= */
        const ctx = await getContext();

        const role = ctx?.context?.role;

        console.log("User role:", role);

        if (role === "parent") {
          router.replace("/(tabs)"); // 🔥 parent dashboard
        } else {
          router.replace("/(tabs)"); // 🔥 child app
        }
      } catch (err) {
        console.log("Init error:", err);
        router.replace("/login");
      }
    }

    init();
  }, []);

  return null;
}