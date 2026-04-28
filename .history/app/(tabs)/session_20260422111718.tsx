import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { showRewardedAd } from "../../services/adService";
import api from "../../services/api";
import {
  grantAndroidUnlock,
  hideBlockingOverlay,
} from "../../services/nativeBridge";
import { setUnlockState } from "../../services/nativeDetection";
import { getSession, submitReview } from "../../services/reviewService";
import { useRefocusStore } from "../../store/useRefocusStore";

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
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 24,
          backgroundColor: "#0e1424",
        }}
      >
        <Text style={{ color: "white" }}>Select a deck first.</Text>
      </View>
    );
  }

  if (!cards.length) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 24,
          backgroundColor: "#0e1424",
        }}
      >
        <Text style={{ color: "white" }}>Loading...</Text>
      </View>
    );
  }

  const card = cards[index];

  async function handleSessionEnd() {
    try {
      const completionRes = await api.post("/review/session/complete");

      const { showAd } = completionRes?.data || {};

      /* =========================
         🎯 IF AD SHOULD SHOW
      ========================= */
      if (showAd) {
        showRewardedAd(async () => {
          try {
            /* 🔥 GRANT REWARD AFTER AD */
            const rewardRes = await api.post("/unlock/reward", {
              type: "time",
            });

            const unlock = rewardRes?.data?.unlock;

            /* 🔥 SYNC STATE + NATIVE BYPASS */
            if (unlock?.unlockedUntil) {
              const unlockUntil = new Date(unlock.unlockedUntil).getTime();
              const expiresAt = new Date(unlock.unlockedUntil).toISOString();

              setStatePatch({
                unlockedUntil: unlockUntil,
              });

              setUnlockState({
                expiresAt,
              });

              await grantAndroidUnlock(expiresAt);
              await hideBlockingOverlay();
            }
          } catch (err) {
            console.error("Ad reward failed:", err);
          }

          /* 🔥 ALWAYS EXIT AFTER AD */
          router.back();
        });

        return;
      }

      /* =========================
         🚫 NO AD → JUST EXIT
      ========================= */
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

        setStatePatch({
          unlockedUntil: Date.now() + minutes * 60000,
        });

        /* 🔥 SYNC NATIVE DETECTION BYPASS */
        setUnlockState({
          expiresAt,
        });

        await grantAndroidUnlock(expiresAt);
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

  if (completed) {
    const minutes = unlockData?.unlockMinutes || 10;

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0e1424",
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <Text style={{ fontSize: 40 }}>🔥</Text>

        <Text
          style={{
            color: "#D86732",
            fontSize: 28,
            fontWeight: "800",
            textAlign: "center",
            marginTop: 10,
          }}
        >
          You earned {minutes} minutes
        </Text>

        <Text
          style={{
            color: "#A9BDDB",
            marginTop: 10,
            textAlign: "center",
          }}
        >
          Most people scroll.{"\n"}You progressed.
        </Text>

        <Pressable
          onPress={() => router.back()}
          style={{
            marginTop: 30,
            backgroundColor: "#D86732",
            padding: 16,
            borderRadius: 14,
            width: "100%",
          }}
        >
          <Text style={{ textAlign: "center", fontWeight: "800" }}>
            Continue
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: "#0e1424" }}>
      {/* 🔥 STREAK + XP */}
      <Text style={{ color: "#F8C373", marginBottom: 4 }}>
        🔥 {streak?.currentStreak || 0} day streak
      </Text>

      <Text style={{ color: "#A9BDDB", marginBottom: 6 }}>
        ⚡ XP: {usage?.xp || 0}
      </Text>

      {/* 🔥 PROGRESS */}
      <View
        style={{
          height: 6,
          backgroundColor: "#1b2540",
          borderRadius: 999,
          marginBottom: 16,
        }}
      >
        <View
          style={{
            width: `${((index + 1) / cards.length) * 100}%`,
            height: "100%",
            backgroundColor: "#D86732",
            borderRadius: 999,
          }}
        />
      </View>

      <Text style={{ color: "#A9BDDB", marginBottom: 12 }}>
        {index + 1} / {cards.length}
      </Text>

      <Text style={{ color: "white", fontSize: 24, fontWeight: "800" }}>
        {card.front}
      </Text>

      {!!microReward && (
        <Text style={{ color: "#D86732", marginTop: 10, fontSize: 18 }}>
          {microReward}
        </Text>
      )}

      {showAnswer && (
        <Text style={{ color: "#D86732", marginTop: 20, fontSize: 20 }}>
          {card.back}
        </Text>
      )}

      {!showAnswer ? (
        <Pressable
          onPress={() => setShowAnswer(true)}
          style={{
            marginTop: 24,
            backgroundColor: "#1b2540",
            padding: 16,
            borderRadius: 14,
          }}
        >
          <Text
            style={{
              color: "white",
              textAlign: "center",
              fontWeight: "700",
            }}
          >
            Show Answer
          </Text>
        </Pressable>
      ) : (
        <View style={{ marginTop: 24 }}>
          {["again", "good", "easy"].map((r) => (
            <Pressable
              key={r}
              onPress={() => answer(r)}
              style={{
                backgroundColor: r === "good" ? "#D86732" : "#1b2540",
                padding: 16,
                borderRadius: 14,
                marginBottom: 12,
              }}
            >
              <Text
                style={{
                  color: r === "good" ? "#111" : "#fff",
                  textAlign: "center",
                  fontWeight: "700",
                  textTransform: "capitalize",
                }}
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