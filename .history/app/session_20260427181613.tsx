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

  const { selectedDeckId, setStatePatch, streak, usage } =
    useRefocusStore();

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
      setNoCardsMode(false);
      setNoCardsGraceUntil(null);

      const res = await getSession(selectedDeckId);
      const safeCards = (res.cards || []).filter(Boolean);

      if (!safeCards.length) {
        const expiresAt = new Date(
          Date.now() + NO_CARDS_GRACE_MINUTES * 60 * 1000
        ).toISOString();

        await grantAndroidUnlock(expiresAt);
        await hideBlockingOverlay();
        await syncEnforcementDecision();

        setNoCardsMode(true);
        setNoCardsGraceUntil(expiresAt);
        setCards([]);
        return;
      }

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

  useEffect(() => {
    setStartTime(Date.now());
  }, [index]);

  useEffect(() => {
    if (!completed) return;

    const timer = setTimeout(async () => {
      try {
        await reopenBlockedApp();
      } catch (err) {
        router.replace("/(tabs)");
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [completed]);

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
      await reopenBlockedApp();
    }
  }

  async function continueWithGrace() {
    try {
      if (!noCardsGraceUntil) {
        const expiresAt = new Date(
          Date.now() + NO_CARDS_GRACE_MINUTES * 60 * 1000
        ).toISOString();

        await grantAndroidUnlock(expiresAt);
      }

      await hideBlockingOverlay();

      setTimeout(() => {
        reopenBlockedApp();
      }, 200);
    } catch (err) {
      console.error("Continue grace failed", err);
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

      await grantAndroidUnlock(expiresAt);
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

      setCompleted(true);
      setUnlockData({ unlockMinutes: 1 });

      const expiresAt = new Date(
        Date.now() + 60 * 1000
      ).toISOString();

      await grantAndroidUnlock(expiresAt);
      await hideBlockingOverlay();

      setTimeout(() => {
        console.log("🚀 Returning to blocked app...");
        reopenBlockedApp();
      }, 150);

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

      setCompleted(true);
      setUnlockData({ unlockMinutes: 1 });

      const expiresAt = new Date(
        Date.now() + 60 * 1000
      ).toISOString();

      try {
        await grantAndroidUnlock(expiresAt);
        await hideBlockingOverlay();
      } catch (e) {
        console.log("⚠️ unlock fallback failed:", e);
      }

      setTimeout(() => {
        console.log("🚀 Returning to blocked app (failsafe)...");
        reopenBlockedApp();
      }, 150);

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