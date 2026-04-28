import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { showRewardedAd } from "../services/adService
import api from "../services/api";
import {
  grantAndroidUnlock,
  hideBlockingOverlay,
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

  const { selectedDeckId, setStatePatch, streak, usage } =
    useRefocusStore();

  useEffect(() => {
    load();
  }, [selectedDeckId]);

  async function load() {
    if (!selectedDeckId) return;

    try {
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
    }
  }

  useEffect(() => {
    setStartTime(Date.now());
  }, [index]);

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
        <Text style={{ color: "white" }}>Loading...</Text>
      </View>
    );
  }

  const card = cards[index];

  async function handleSessionEnd() {
    try {
      const completionRes = await api.post("/review/session/complete");
      const { showAd } = completionRes?.data || {};

      if (showAd) {
        showRewardedAd(() => {
          router.back();
        });
        return;
      }

      router.back();
    } catch (err) {
      console.error("Session completion failed", err);
      router.back();
    }
  }

  async function answer(rating: string) {
    try {
      const responseTimeMs = Date.now() - startTime;

      const payload = {
        cardId: card._id || card.id,
        deckId: card.deckId || selectedDeckId,
        rating,
        responseTimeMs,
      };

      const res = await submitReview(payload);

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

        /* 🔥 Update JS store (UI only) */
        setStatePatch({
          unlockedUntil: Date.now() + minutes * 60000,
        });

        /* 🔥 THIS IS NOW YOUR REAL CONTROL */
        await grantAndroidUnlock(expiresAt);

        /* 🔥 Immediately remove overlay */
        await hideBlockingOverlay();

        setUnlockData(res.unlock);
        setCompleted(true);
        return;
      }

      if (index + 1 >= cards.length) {
        await handleSessionEnd();
        return;
      }

      setIndex((prev) => prev + 1);
      setShowAnswer(false);
    } catch (err: any) {
      console.error("Review failed", err?.response?.data || err);
    }
  }

  /* =========================
     ✅ COMPLETION SCREEN
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

        <Pressable
          onPress={() => router.back()}
          style={styles.primaryBtn}
        >
          <Text style={styles.primaryBtnText}>Continue</Text>
        </Pressable>
      </View>
    );
  }

  /* =========================
     ✅ MAIN SESSION UI
  ========================= */

  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: "#0e1424" }}>
      {/* STREAK */}
      <Text style={{ color: "#F8C373", marginBottom: 4 }}>
        🔥 {streak?.currentStreak || 0} day streak
      </Text>

      {/* XP */}
      <Text style={{ color: "#A9BDDB", marginBottom: 6 }}>
        ⚡ XP: {usage?.xp || 0}
      </Text>

      {/* PROGRESS */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${((index + 1) / cards.length) * 100}%` },
          ]}
        />
      </View>

      <Text style={{ color: "#A9BDDB", marginBottom: 12 }}>
        {index + 1} / {cards.length}
      </Text>

      <Text style={styles.cardFront}>{card.front}</Text>

      {!!microReward && (
        <Text style={styles.microReward}>{microReward}</Text>
      )}

      {showAnswer && (
        <Text style={styles.cardBack}>{card.back}</Text>
      )}

      {!showAnswer ? (
        <Pressable
          onPress={() => setShowAnswer(true)}
          style={styles.secondaryBtn}
        >
          <Text style={styles.secondaryBtnText}>Show Answer</Text>
        </Pressable>
      ) : (
        <View style={{ marginTop: 24 }}>
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
        </View>
      )}
    </View>
  );
}

/* =========================
   STYLES
========================= */



const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#0e1424",
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

  primaryBtn: {
    marginTop: 30,
    backgroundColor: "#D86732",
    padding: 16,
    borderRadius: 14,
    width: "100%",
  },

  primaryBtnText: {
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
    fontSize: 24,
    fontWeight: "800",
  },

  cardBack: {
    color: "#D86732",
    marginTop: 20,
    fontSize: 20,
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