import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { showRewardedAd } from "../services/adService";
import api from "../services/api";
import { syncEnforcementDecision } from "../services/enforcementSync";
import {
  grantAndroidUnlock,
  hideBlockingOverlay,
  reopenBlockedApp,
} from "../services/nativeBridge";
import { getSession, submitReview } from "../services/reviewService";
import { useRefocusStore } from "../store/useRefocusStore";

export default function SessionScreen() {
  const [cards, setCards] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const [completed, setCompleted] = useState(false);
  const [unlockData, setUnlockData] = useState<any>(null);
  const [microReward, setMicroReward] = useState("");

  const [startTime, setStartTime] = useState<number>(Date.now());
  const [loading, setLoading] = useState(true);

  const { selectedDeckId, setStatePatch, streak, usage } =
    useRefocusStore();

  /* =========================
     🔥 LOAD SESSION
  ========================= */
  useEffect(() => {
    load();
  }, [selectedDeckId]);

  async function load() {
    if (!selectedDeckId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const res = await getSession(selectedDeckId);
      const safeCards = (res.cards || []).filter(Boolean);

      setCards(safeCards);
      setIndex(0);
      setShowAnswer(false);
      setCompleted(false);
      setUnlockData(null);
      setMicroReward("");

    } catch (err) {
      console.error("Session load failed", err);
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     🔥 TIMER RESET PER CARD
  ========================= */
  useEffect(() => {
    setStartTime(Date.now());
  }, [index]);

  /* =========================
     🔥 AUTO RETURN AFTER COMPLETE
  ========================= */
  useEffect(() => {
    if (!completed) return;

    const timer = setTimeout(async () => {
      try {
        console.log("🚀 Returning to blocked app...");
        await reopenBlockedApp();
      } catch (err) {
        console.log("❌ reopen failed:", err);
        router.replace("/(tabs)");
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [completed]);

  /* =========================
     🔥 LOADING STATE
  ========================= */
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

  if (!cards.length) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "white" }}>No cards available.</Text>
      </View>
    );
  }

  const card = cards[index];

  /* =========================
     🔥 SESSION END HANDLER (KEPT)
  ========================= */
  async function handleSessionEnd() {
    try {
      const completionRes = await api.post("/reviews/session/complete");
      const { showAd } = completionRes?.data || {};

      if (showAd) {
        showRewardedAd(async () => {
          await reopenBlockedApp();
        });
        return;
      }

      await reopenBlockedApp();
    } catch (err) {
      console.error("Session completion failed", err);

      // 🔥 FAIL SAFE EXIT
      await reopenBlockedApp();
    }
  }

  /* =========================
     🔥 ANSWER HANDLER
  ========================= */
  async function answer(rating: string) {
    try {
      const responseTimeMs = Date.now() - startTime;

      const payload = {
        cardId: card._id || card.id,
        deckId: card.deckId || selectedDeckId,
        rating,
        responseTimeMs,
      };

      let res;

      // 🔥 RETRY FIX (WRITE CONFLICT SAFE)
      for (let i = 0; i < 2; i++) {
        try {
          res = await submitReview(payload);
          break;
        } catch (err) {
          if (i === 1) throw err;
          await new Promise((r) => setTimeout(r, 100));
        }
      }

      setMicroReward("+1");
      setTimeout(() => setMicroReward(""), 500);

      /* 🔥 COOLDOWN */
      if (res.unlock?.reason === "cooldown_active") {
        alert(
          `Cooldown active. Try again in ${Math.ceil(
            res.unlock.remainingCooldown
          )} minutes`
        );
        return;
      }

      /* 🔥 UNLOCK */
      if (res.unlock?.unlocked) {
        const minutes = res.unlock.unlockMinutes;

        const expiresAt = new Date(
          Date.now() + minutes * 60000
        ).toISOString();

        setStatePatch({
          unlockedUntil: Date.now() + minutes * 60000,
        });

        await grantAndroidUnlock(expiresAt);
        await hideBlockingOverlay();
        await syncEnforcementDecision();

        setUnlockData(res.unlock);
        setCompleted(true);

        return;
      }

      /* 🔥 END SESSION */
      if (index + 1 >= cards.length) {
        await handleSessionEnd();

        // 🔥 GUARANTEED EXIT
        setTimeout(() => {
          reopenBlockedApp();
        }, 200);

        return;
      }

      setIndex((prev) => prev + 1);
      setShowAnswer(false);

    } catch (err: any) {
      console.error("Review failed", err?.response?.data || err);

      // 🔥 FAILSAFE — NEVER TRAP USER
      if (index + 1 >= cards.length) {
        setCompleted(true);

        setUnlockData({
          unlockMinutes: 1,
        });

        const expiresAt = new Date(
          Date.now() + 60000
        ).toISOString();

        await grantAndroidUnlock(expiresAt);
        await hideBlockingOverlay();

        setTimeout(() => {
          reopenBlockedApp();
        }, 150);
      }
    }
  }

  /* =========================
     ✅ COMPLETION UI
  ========================= */
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

  /* =========================
     ✅ MAIN UI
  ========================= */
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

/* =========================
   STYLES (UNCHANGED)
========================= */

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
    marginTop: 24,
    backgroundColor: "#1b2540",
    padding: 16,
    borderRadius: 14,
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