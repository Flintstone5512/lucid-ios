import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { showRewardedAd } from "../services/adService";
import api from "../services/api";
import { syncEnforcementDecision } from "../services/enforcementSync";
import {
  grantNativeUnlock,
  hideBlockingOverlay,
  reopenBlockedApp,
} from "../services/nativeBridge";
import { getSession, submitReview } from "../services/reviewService";
import { useRefocusStore } from "../store/useRefocusStore";

const NO_CARDS_GRACE_MINUTES = 20;

export default function SessionScreen() {
  const [cards, setCards] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const [completed, setCompleted] = useState(false);
  const [unlockData, setUnlockData] = useState<any>(null);
  const [microReward, setMicroReward] = useState("");

  const [startTime, setStartTime] = useState<number>(Date.now());
  const [loading, setLoading] = useState(true);

  const [noCardsMode, setNoCardsMode] = useState(false);
  const [noCardsGraceUntil, setNoCardsGraceUntil] = useState<string | null>(
    null
  );

  const { selectedDeckId, setStatePatch, streak, usage, unlockedUntil } =
    useRefocusStore();

  useEffect(() => {
    load();
  }, [selectedDeckId]);

  useEffect(() => {
  console.log("✅ SESSION SCREEN MOUNTED");
}, []);

  async function load() {
    console.log("[SESSION] load() called — selectedDeckId:", selectedDeckId, "unlockedUntil:", unlockedUntil ? new Date(unlockedUntil).toISOString() : "none");

    if (unlockedUntil > Date.now()) {
      console.log("[SESSION] Active unlock — returning to tabs");
      router.replace("/(tabs)");
      return;
    }

    if (!selectedDeckId) {
      console.log("[SESSION] No deck selected — showing 'Select a deck first'");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setNoCardsMode(false);
      setNoCardsGraceUntil(null);

      console.log("[SESSION] Calling getSession for deck:", selectedDeckId);
      const res = await getSession(selectedDeckId);
      console.log("[SESSION] getSession response:", JSON.stringify(res));

      const safeCards = (res.cards || []).filter(Boolean);
      console.log("[SESSION] safeCards count:", safeCards.length);

      if (!safeCards.length) {
        console.log("[SESSION] No cards — entering noCardsMode, granting grace period");
        const expiresAt = new Date(
          Date.now() + NO_CARDS_GRACE_MINUTES * 60 * 1000
        ).toISOString();

        await grantNativeUnlock(expiresAt);
        await hideBlockingOverlay();
        await syncEnforcementDecision();

        setNoCardsMode(true);
        setNoCardsGraceUntil(expiresAt);
        setCards([]);
        return;
      }

      console.log("[SESSION] Cards loaded OK — starting session");
      setCards(safeCards);
      setIndex(0);
      setShowAnswer(false);
      setCompleted(false);
      setUnlockData(null);
      setMicroReward("");
    } catch (err: any) {
      console.error("[SESSION] load() FAILED:", err?.message, err?.response?.status, err?.response?.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setStartTime(Date.now());
  }, [index]);

  useEffect(() => {
    if (!completed) return;

    console.log("[SESSION] completed=true — calling handleSessionEnd in 800ms");
    const timer = setTimeout(() => {
      handleSessionEnd();
    }, 800);

    return () => clearTimeout(timer);
  }, [completed]);

  async function handleSessionEnd() {
    console.log("[SESSION] handleSessionEnd called");
    try {
      const completionRes = await api.post("/reviews/session/complete");
      const { showAd, expiresAt } = completionRes?.data || {};
      console.log("[SESSION] session/complete response — showAd:", showAd, "expiresAt:", expiresAt);

      if (expiresAt) {
        const expiresMs = new Date(expiresAt).getTime();
        await grantNativeUnlock(expiresAt);
        setStatePatch({ unlockedUntil: expiresMs });
        console.log("[SESSION] unlockedUntil set to", expiresAt);
      }

      // Sync native enforcement state now that the unlock exists in DB
      await syncEnforcementDecision();

      if (showAd) {
        console.log("[SESSION] showing rewarded ad");
        showRewardedAd(async () => {
          console.log("[SESSION] ad reward earned — reopening blocked app");
          await reopenBlockedApp();
          router.replace("/(tabs)");
        });
        return;
      }

      await reopenBlockedApp();
      router.replace("/(tabs)");
    } catch (err: any) {
      console.error("[SESSION] handleSessionEnd FAILED:", err?.message, err?.response?.status);
      await reopenBlockedApp();
      router.replace("/(tabs)");
    }
  }

  async function continueWithGrace() {
  try {
    console.log("🟡 Continue pressed");

    let expiresAt = noCardsGraceUntil;

    if (!expiresAt) {
      expiresAt = new Date(
        Date.now() + 20 * 60 * 1000
      ).toISOString();

      await grantNativeUnlock(expiresAt);
    }

    // 🔥 STEP 1: update enforcement FIRST
    await syncEnforcementDecision();

    // 🔥 STEP 2: try to close overlay
    await hideBlockingOverlay();

    // 🔥 STEP 3: return to app
    setTimeout(async () => {
      console.log("🚀 Reopening blocked app...");
      await reopenBlockedApp();
    }, 250);

    // 🔥 STEP 4: HARD FALLBACK (CRITICAL)
    setTimeout(() => {
      console.log("⚠️ Fallback navigation");
      router.replace("/(tabs)");
    }, 800);

  } catch (err) {
    console.error("❌ Continue failed", err);

    // 🔥 NEVER TRAP USER
    router.replace("/(tabs)");
  }
}

  function goAddDeck() {
    router.replace("/(tabs)");
  }

  async function answer(rating: string) {
  const isLastCard = index >= cards.length - 1;

  try {
    const card = cards[index];
    if (!card) {
      console.log("❌ No card found at index:", index);
      return;
    }

    console.log("👉 answering index:", index, "of", cards.length);

    const responseTimeMs = Date.now() - startTime;

    const payload = {
      cardId: card._id || card.id,
      deckId: card.deckId || selectedDeckId,
      rating,
      responseTimeMs,
    };

    let res: any = null;

    /* =========================
       🔁 RETRY (WRITE CONFLICT SAFE)
    ========================= */
    for (let i = 0; i < 2; i++) {
      try {
        res = await submitReview(payload);
        break;
      } catch (err) {
        console.log("⚠️ retrying review...", i);
        if (i === 1) throw err;
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    setMicroReward("+1");
    setTimeout(() => setMicroReward(""), 500);

    /* =========================
       🔥 COOLDOWN
    ========================= */
    if (res?.unlock?.reason === "cooldown_active") {
      alert(
        `Cooldown active. Try again in ${Math.ceil(
          res.unlock.remainingCooldown
        )} minutes`
      );
      return;
    }

    /* =========================
       🔥 NORMAL UNLOCK FLOW
    ========================= */
    if (res?.unlock?.unlocked) {
      console.log("✅ UNLOCK GRANTED");

      const minutes = res.unlock.unlockMinutes;

      const expiresAt = new Date(
        Date.now() + minutes * 60000
      ).toISOString();

      setStatePatch({
        unlockedUntil: Date.now() + minutes * 60000,
      });

      await grantNativeUnlock(expiresAt);
      await hideBlockingOverlay();
      await syncEnforcementDecision();

      setUnlockData(res.unlock);
      setCompleted(true);

      return;
    }

    /* =========================
       🔥 LAST CARD (FORCE EXIT)
    ========================= */
    if (isLastCard) {
      console.log("🔥 LAST CARD — forcing exit");

      const expiresAt = new Date(
        Date.now() + 60 * 1000
      ).toISOString();

      await grantNativeUnlock(expiresAt);
      await hideBlockingOverlay();

      setUnlockData({ unlockMinutes: 1 });
      setCompleted(true);

      return;
    }

    /* =========================
       🔁 NEXT CARD
    ========================= */
    setIndex((prev) => prev + 1);
    setShowAnswer(false);

  } catch (err: any) {
    console.error("❌ Review failed", err?.response?.data || err);

    /* =========================
       🔥 FAILSAFE LAST CARD EXIT
    ========================= */
    if (isLastCard) {
      console.log("⚠️ FAILSAFE LAST CARD EXIT");

      const expiresAt = new Date(
        Date.now() + 60 * 1000
      ).toISOString();

      try {
        await grantNativeUnlock(expiresAt);
        await hideBlockingOverlay();
      } catch (e) {
        console.log("⚠️ unlock fallback failed:", e);
      }

      setUnlockData({ unlockMinutes: 1 });
      setCompleted(true);

      return;
    }
  }
}

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "white" }}>Loading session...</Text>
      </View>
    );
  }

  if (!selectedDeckId) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "white" }}>Select a deck first.</Text>
      </View>
    );
  }

  if (noCardsMode) {
    return (
      <View style={styles.center}>
        <Text style={styles.noCardsIcon}>🧠</Text>

        <Text style={styles.rewardTitle}>No cards available</Text>

        <Text style={styles.rewardSub}>
          Your blocking is still ON.{"\n"}
          We gave you {NO_CARDS_GRACE_MINUTES} minutes of temporary access so
          you are not stuck.
        </Text>

        <Pressable onPress={goAddDeck} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>➕ Add Deck</Text>
        </Pressable>

        <Pressable onPress={continueWithGrace} style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>
            ⏳ Continue for now
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!cards.length) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "white" }}>No cards available.</Text>
      </View>
    );
  }

  const card = cards[index];

  if (completed) {
    const minutes = unlockData?.unlockMinutes || 10;

    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 40 }}>🔥</Text>

        <Text style={styles.rewardTitle}>
          You earned {minutes} minutes
        </Text>

        <Text style={styles.rewardSub}>
          Most people scroll.{"\n"}You progressed.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <Text style={{ color: "#F8C373", marginBottom: 4 }}>
          🔥 {streak?.currentStreak || 0} day streak
        </Text>

        <Text style={{ color: "#A9BDDB", marginBottom: 6 }}>
          ⚡ XP: {usage?.xp || 0}
        </Text>

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((index + 1) / cards.length) * 100}%` },
            ]}
          />
        </View>

        <Text style={{ color: "#A9BDDB", marginTop: 8 }}>
          {index + 1} / {cards.length}
        </Text>
      </View>

      <View style={styles.centerSection}>
        <Text style={styles.cardFront}>{card.front}</Text>

        {!!microReward && (
          <Text style={styles.microReward}>{microReward}</Text>
        )}

        {showAnswer && (
          <Text style={styles.cardBack}>{card.back}</Text>
        )}
      </View>

      <View style={styles.bottomSection}>
        {!showAnswer ? (
          <Pressable
            onPress={() => setShowAnswer(true)}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnText}>Show Answer</Text>
          </Pressable>
        ) : (
          <>
            {["again", "good", "easy"].map((r) => (
              <Pressable
                key={r}
                onPress={() => answer(r)}
                style={[
                  styles.answerBtn,
                  r === "good" && styles.answerGood,
                ]}
              >
                <Text
                  style={[
                    styles.answerText,
                    r === "good" && { color: "#111" },
                  ]}
                >
                  {r}
                </Text>
              </Pressable>
            ))}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0e1424",
    padding: 24,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#0e1424",
  },

  topSection: {},

  centerSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  bottomSection: {
    paddingBottom: 10,
  },

  noCardsIcon: {
    fontSize: 44,
    marginBottom: 8,
  },

  rewardTitle: {
    color: "#D86732",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 10,
  },

  rewardSub: {
    color: "#A9BDDB",
    marginTop: 10,
    textAlign: "center",
    lineHeight: 22,
  },

  primaryBtn: {
    marginTop: 30,
    backgroundColor: "#D86732",
    padding: 16,
    borderRadius: 14,
    width: "100%",
  },

  primaryBtnText: {
    color: "#111",
    textAlign: "center",
    fontWeight: "800",
  },

  progressBar: {
    height: 6,
    backgroundColor: "#1b2540",
    borderRadius: 999,
    marginBottom: 16,
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#D86732",
    borderRadius: 999,
  },

  cardFront: {
    color: "white",
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
  },

  cardBack: {
    color: "#D86732",
    marginTop: 20,
    fontSize: 22,
    textAlign: "center",
  },

  microReward: {
    color: "#D86732",
    marginTop: 10,
    fontSize: 18,
  },

  secondaryBtn: {
    marginTop: 16,
    backgroundColor: "#1b2540",
    padding: 16,
    borderRadius: 14,
    width: "100%",
  },

  secondaryBtnText: {
    color: "white",
    textAlign: "center",
    fontWeight: "700",
  },

  answerBtn: {
    backgroundColor: "#1b2540",
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
  },

  answerGood: {
    backgroundColor: "#D86732",
  },

  answerText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "700",
    textTransform: "capitalize",
  },
});