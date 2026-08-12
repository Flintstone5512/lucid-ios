import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Audio, Video, ResizeMode } from "expo-av";

type MediaRef = { type: "image" | "audio" | "video"; url: string };

function CardContent({
  text,
  media,
  textStyle,
  onPlayAudio,
  isPlayingAudio,
}: {
  text: string;
  media?: MediaRef[];
  textStyle: any;
  onPlayAudio: (url: string) => void;
  isPlayingAudio: boolean;
}) {
  const images = media?.filter((m) => m.type === "image") ?? [];
  const audios = media?.filter((m) => m.type === "audio") ?? [];
  const videos = media?.filter((m) => m.type === "video") ?? [];

  return (
    <View>
      {images.map((m, i) => (
        <Image
          key={i}
          source={{ uri: m.url }}
          style={styles.cardImage}
          resizeMode="contain"
        />
      ))}
      {videos.map((m, i) => (
        <Video
          key={i}
          source={{ uri: m.url }}
          style={styles.cardVideo}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={false}
          onError={(err) => console.error("[SESSION] video error", err)}
        />
      ))}
      {!!text && <Text style={textStyle}>{text}</Text>}
      {audios.map((m, i) => (
        <Pressable key={i} onPress={() => onPlayAudio(m.url)} style={styles.audioBtn}>
          <Text style={styles.audioBtnText}>
            {isPlayingAudio ? "⏸ Playing…" : "▶ Play Audio"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

import { showRewardedAd } from "../services/adService";
import { askAITutor } from "../services/aiDeckService";
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
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  const [noCardsMode, setNoCardsMode] = useState(false);
  const [noCardsGraceUntil, setNoCardsGraceUntil] = useState<string | null>(null);

  const [tutorVisible, setTutorVisible] = useState(false);
  const [tutorLoading, setTutorLoading] = useState(false);
  const [tutorText, setTutorText] = useState("");

  const {
    selectedDeckId,
    setStatePatch,
    streak,
    usage,
    unlockedUntil,
    shuffleMode,
    shuffleDeckIds,
    plan,
  } = useRefocusStore();

  const isPaidUser = plan !== null && plan !== "free";

  useEffect(() => {
    load();
  }, [selectedDeckId, shuffleMode, shuffleDeckIds]);

  useEffect(() => {
  console.log("✅ SESSION SCREEN MOUNTED");
}, []);

  function fisherYatesShuffle(arr: any[]) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  async function load() {
    const isShuffling = shuffleMode && shuffleDeckIds.length > 0;
    console.log("[SESSION] load() called — shuffleMode:", shuffleMode, "shuffleDeckIds:", shuffleDeckIds, "selectedDeckId:", selectedDeckId);

    if (unlockedUntil > Date.now()) {
      console.log("[SESSION] Active unlock — returning to tabs");
      router.replace("/(tabs)");
      return;
    }

    if (!isShuffling && !selectedDeckId) {
      console.log("[SESSION] No deck selected — showing 'Select a deck first'");
      setLoading(false);
      return;
    }

    if (shuffleMode && shuffleDeckIds.length === 0) {
      console.log("[SESSION] Shuffle mode on but no decks selected");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setNoCardsMode(false);
      setNoCardsGraceUntil(null);

      let safeCards: any[];

      if (isShuffling) {
        console.log("[SESSION] Shuffle mode — fetching from", shuffleDeckIds.length, "decks");
        const results = await Promise.all(shuffleDeckIds.map((id) => getSession(id)));
        const merged = results.flatMap((res) => (res.cards || []).filter(Boolean));
        safeCards = fisherYatesShuffle(merged);
        console.log("[SESSION] Shuffle merged card count:", safeCards.length);
      } else {
        console.log("[SESSION] Calling getSession for deck:", selectedDeckId);
        const res = await getSession(selectedDeckId!);
        console.log("[SESSION] getSession response:", JSON.stringify(res));
        safeCards = (res.cards || []).filter(Boolean);
        console.log("[SESSION] safeCards count:", safeCards.length);
      }

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
    setIsPlayingAudio(false);
    if (soundRef.current) {
      soundRef.current.unloadAsync();
      soundRef.current = null;
    }
  }, [index]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, []);

  async function playAudio(url: string) {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
      });
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true }   // start playback immediately once loaded
      );
      soundRef.current = sound;
      setIsPlayingAudio(true);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlayingAudio(false);
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch (err) {
      console.error("[SESSION] audio playback failed", err);
      setIsPlayingAudio(false);
    }
  }

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

      // Don't auto-navigate — let the completion screen show so the user can
      // press Home and return to Instagram without landing on the Lucid dashboard.
      await reopenBlockedApp();
    } catch (err: any) {
      console.error("[SESSION] handleSessionEnd FAILED:", err?.message, err?.response?.status);
      await reopenBlockedApp();
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

  async function openTutor() {
    if (!isPaidUser) {
      Alert.alert("Paid Feature", "Upgrade to unlock the AI Tutor.");
      return;
    }
    const card = cards[index];
    if (!card) return;
    setTutorVisible(true);
    setTutorText("");
    setTutorLoading(true);
    try {
      const explanation = await askAITutor(card.front, card.back);
      setTutorText(explanation);
    } catch {
      setTutorText("Sorry, couldn't load an explanation right now. Try again.");
    } finally {
      setTutorLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "white" }}>Loading session...</Text>
      </View>
    );
  }

  if (shuffleMode && shuffleDeckIds.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "white" }}>Select at least one deck in Shuffle Mode.</Text>
      </View>
    );
  }

  if (!shuffleMode && !selectedDeckId) {
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
        <Text style={{ fontSize: 44 }}>🔓</Text>

        <Text style={styles.rewardTitle}>Apps Unlocked!</Text>

        <Text style={styles.rewardSub}>
          You earned {minutes} minutes.{"\n"}Most people scroll. You progressed.
        </Text>

        <Text style={[styles.rewardSub, { marginTop: 24, color: "#6b7a99" }]}>
          Press the Home button to return to your app.
        </Text>

        <Pressable
          onPress={() => router.replace("/(tabs)")}
          style={[styles.secondaryBtn, { marginTop: 32 }]}
        >
          <Text style={styles.secondaryBtnText}>Go to Dashboard</Text>
        </Pressable>
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
        <CardContent text={card.front} media={card.frontMedia} textStyle={styles.cardFront} onPlayAudio={playAudio} isPlayingAudio={isPlayingAudio} />

        {!!microReward && (
          <Text style={styles.microReward}>{microReward}</Text>
        )}

        {showAnswer && (
          <CardContent text={card.back} media={card.backMedia} textStyle={styles.cardBack} onPlayAudio={playAudio} isPlayingAudio={isPlayingAudio} />
        )}

        <Pressable onPress={openTutor} style={styles.tutorBtn}>
          <Text style={styles.tutorBtnText}>🤖 AI Tutor</Text>
        </Pressable>
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

      {/* AI TUTOR MODAL */}
      <Modal
        visible={tutorVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTutorVisible(false)}
      >
        <View style={styles.tutorOverlay}>
          <View style={styles.tutorSheet}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ color: "white", fontWeight: "800", fontSize: 17 }}>🤖 AI Tutor</Text>
              <Pressable onPress={() => setTutorVisible(false)}>
                <Text style={{ color: "#A9BDDB", fontSize: 22, lineHeight: 24 }}>×</Text>
              </Pressable>
            </View>

            {tutorLoading ? (
              <View style={{ alignItems: "center", paddingVertical: 32 }}>
                <ActivityIndicator color="#D86732" />
                <Text style={{ color: "#A9BDDB", marginTop: 12 }}>Thinking...</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={{ color: "#e2e8f0", lineHeight: 24, fontSize: 15 }}>
                  {tutorText}
                </Text>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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

  cardImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },

  cardVideo: {
    width: "100%",
    height: 220,
    borderRadius: 8,
    marginBottom: 12,
  },

  audioBtn: {
    marginTop: 14,
    backgroundColor: "#1e2d45",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
    alignSelf: "center",
  },

  audioBtnText: {
    color: "#6EADEB",
    fontSize: 16,
    fontWeight: "600",
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

  tutorBtn: {
    marginTop: 20,
    alignSelf: "center",
    backgroundColor: "#161b22",
    borderWidth: 1,
    borderColor: "#2a2e36",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },

  tutorBtnText: {
    color: "#A9BDDB",
    fontSize: 13,
    fontWeight: "600",
  },

  tutorOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },

  tutorSheet: {
    backgroundColor: "#0f172a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: "70%",
    borderTopWidth: 1,
    borderColor: "#2a2e36",
  },
});