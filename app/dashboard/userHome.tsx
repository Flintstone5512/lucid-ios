import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  AppState,
  Linking,
  Platform,
  Modal,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";

import { useRefocusStore } from "../../store/useRefocusStore";
import { getSharedState, sendHeartbeat, getDecks } from "../../services/api";
import MetricCard from "../../components/MetricCard";
import UpgradeButton from "../../components/UpgradeButton";
import { LucidTheme } from "../../constants/lucidTheme";
import { hasIOSAppSelection } from "../../modules/screen-time";
import { getMasteredCards } from "../../services/testModeService";
import { isSmartBlockingEnabled } from "../../services/smartBlockingService";

// Must stay in sync with useEnforcement.ts
const ANDROID_BLOCKED_APPS = [
  "com.instagram.android",
  "com.zhiliaoapp.musically",
  "com.twitter.android",
  "com.google.android.youtube",
  "com.facebook.katana",
  "com.facebook.lite",
  "com.facebook.orca",
];

async function buildEnforcementPayload() {
  try {
    const blockingActive = await isSmartBlockingEnabled();
    if (Platform.OS === "ios") {
      const hasIOSSelection = await hasIOSAppSelection().catch(() => false);
      return {
        platform: "ios" as const,
        blockingActive,
        hasIOSSelection,
        blockedApps: [] as string[],
      };
    }
    return {
      platform: "android" as const,
      blockingActive,
      hasIOSSelection: null,
      blockedApps: blockingActive ? ANDROID_BLOCKED_APPS : [],
    };
  } catch {
    return undefined;
  }
}

export default function UserDashboard() {
  const { setStatePatch, streak, usage } = useRefocusStore();
  const { plan } = useRefocusStore();
  const [notificationsGranted, setNotificationsGranted] = useState(true);

  // Test mode launch modal state
  const [testModalVisible, setTestModalVisible] = useState(false);
  const [testDecks, setTestDecks] = useState<any[]>([]);
  const [testDecksLoading, setTestDecksLoading] = useState(false);
  const [testSelectedDeckId, setTestSelectedDeckId] = useState<string | null>(null);
  const [testSelectedDeckName, setTestSelectedDeckName] = useState("");
  const [testQuestionField, setTestQuestionField] = useState<"front" | "back">("front");
  const [testAnswerField, setTestAnswerField] = useState<"front" | "back">("back");
  const [testSampleCard, setTestSampleCard] = useState<{ front: string; back: string } | null>(null);
  const [testSampleLoading, setTestSampleLoading] = useState(false);

  async function openTestModal() {
    setTestModalVisible(true);
    setTestSelectedDeckId(null);
    setTestSelectedDeckName("");
    setTestSampleCard(null);
    setTestQuestionField("front");
    setTestAnswerField("back");
    setTestDecksLoading(true);
    try {
      const decks = await getDecks();
      setTestDecks(Array.isArray(decks) ? decks : []);
    } catch {
      setTestDecks([]);
    } finally {
      setTestDecksLoading(false);
    }
  }

  async function selectTestDeck(deckId: string, deckName: string) {
    setTestSelectedDeckId(deckId);
    setTestSelectedDeckName(deckName);
    setTestSampleCard(null);
    setTestSampleLoading(true);
    try {
      const cards = await getMasteredCards(deckId);
      const first = cards[0];
      setTestSampleCard(first ? { front: first.front || "", back: first.back || "" } : null);
    } catch {
      setTestSampleCard(null);
    } finally {
      setTestSampleLoading(false);
    }
  }

  function selectTestQuestion(f: "front" | "back") {
    setTestQuestionField(f);
    if (testAnswerField === f) setTestAnswerField(f === "front" ? "back" : "front");
  }

  function selectTestAnswer(f: "front" | "back") {
    setTestAnswerField(f);
    if (testQuestionField === f) setTestQuestionField(f === "front" ? "back" : "front");
  }

  function confirmTestLaunch() {
    if (!testSelectedDeckId) return;
    setTestModalVisible(false);
    router.push({
      pathname: "/test/[deckId]",
      params: {
        deckId: testSelectedDeckId,
        deckName: testSelectedDeckName,
        questionField: testQuestionField,
        answerField: testAnswerField,
      },
    });
  }

  async function checkNotificationPermission() {
    if (Platform.OS !== "ios") return;
    const { status } = await Notifications.getPermissionsAsync();
    setNotificationsGranted(status === "granted");
  }

  useEffect(() => {
    async function load() {
      try {
        const state = await getSharedState();
        setStatePatch({
          ...state,
          context: state.context,
        });
      } catch (err) {
        console.log("Dashboard load error:", err);
      }
    }

    load();
    checkNotificationPermission();
    buildEnforcementPayload().then(sendHeartbeat);

    // Re-check whenever the user returns from Settings; send heartbeat on foreground
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        checkNotificationPermission();
        buildEnforcementPayload().then(sendHeartbeat);
      }
    });

    return () => sub.remove();
  }, []);

  return (
    <>
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* =========================
         🔔 NOTIFICATION PERMISSION BANNER
      ========================= */}
      {!notificationsGranted && (
        <Pressable
          style={styles.notifBanner}
          onPress={() => Linking.openSettings()}
        >
          <Text style={styles.notifBannerTitle}>⚠️ Notifications Disabled</Text>
          <Text style={styles.notifBannerBody}>
            Lucid can't alert you when your time is up. Tap to enable in Settings.
          </Text>
        </Pressable>
      )}

      {/* =========================
         🔥 HEADER CARD
      ========================= */}
      <View style={styles.headerCard}>
        <Text style={styles.title}>Your Progress</Text>
        <Text style={styles.subtitle}>
          Earn your scroll. Build your focus.
        </Text>
      </View>

      {/* =========================
         🔥 CORE METRICS
      ========================= */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Today</Text>

        <View style={styles.row}>
          <MetricCard
            label="🔥 Streak"
            value={streak?.currentStreak || 0}
            onPress={() => router.push("/streak")}
          />

          <MetricCard
            label="⏱ Time Earned"
            value={`${usage?.minutes || 0}m`}
            onPress={() => router.push("/wasted")}
          />
          <MetricCard
  label="⚡ XP"
  value={usage?.xp || 0}
/>

<MetricCard
  label="🏆 Level"
  value={Math.floor((usage?.xp || 0) / 100)}
/>
        </View>
      </View>

      {/* =========================
         🔥 ACTION (PRIMARY CTA)
      ========================= */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Focus Session</Text>

        <Text style={styles.helper}>
          Complete cards to unlock your apps
        </Text>

        <Pressable
          onPress={() => router.push("/session")}
          style={styles.cta}
        >
          <Text style={styles.ctaText}>Start Session</Text>
        </Pressable>
      </View>

      {/* =========================
         🔥 FEATURES GRID
      ========================= */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Tools</Text>

        <View style={styles.row}>
          <MetricCard
            label="🏆 Leaderboard"
            value="View"
            onPress={() => router.push("/leaderboard")}
          />

          <MetricCard
            label="🧘 Detox Mode"
            value="Manage"
            onPress={() => router.push("/detox")}
          />
        </View>
      </View>

      {/* =========================
         🧪 TEST MODE
      ========================= */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Test Mode</Text>
        <Text style={styles.helper}>
          Quiz yourself on cards you've already mastered.
        </Text>
        <Pressable
          onPress={openTestModal}
          style={styles.cta}
        >
          <Text style={styles.ctaText}>Start a Test</Text>
        </Pressable>
      </View>

      {/* =========================
         🔥 SOCIAL PROOF / COMPETITION
      ========================= */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Top Performers</Text>

        <View style={styles.leaderboardCard}>
          <Text style={styles.leaderText}>🥇 Alex — 420 pts</Text>
          <Text style={styles.leaderText}>🥈 You — 180 pts</Text>
          <Text style={styles.leaderHint}>
            You're climbing. Keep going.
          </Text>
        </View>

        {plan === "free" && (
          <View style={{ marginTop: 12 }}>
            <UpgradeButton label="Unlock Full Leaderboard" />
          </View>
        )}
      </View>

      {/* =========================
         🔥 EMPTY STATE (FALLBACK UX)
      ========================= */}
      {!streak && !usage && (
        <View style={styles.card}>
          <Text style={styles.emptyTitle}>No activity yet</Text>
          <Text style={styles.emptySubtitle}>
            Start your first session to begin tracking progress
          </Text>
        </View>
      )}
    </ScrollView>

    {/* =========================
       🧪 TEST LAUNCH MODAL
    ========================= */}
    <Modal
      visible={testModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setTestModalVisible(false)}
    >
      <View style={{ flex: 1, backgroundColor: "#0e1424" }}>
        {/* Header */}
        <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#1b2540" }}>
          <Text style={{ color: "white", fontSize: 22, fontWeight: "800", marginBottom: 4 }}>Start a Test</Text>
          <Text style={{ color: "#A9BDDB", fontSize: 13 }}>Pick a deck and configure your card sides.</Text>
        </View>

        <ScrollView style={{ flex: 1, padding: 20 }} contentContainerStyle={{ paddingBottom: 32 }}>

          {/* Step 1: Deck picker */}
          <Text style={{ color: "#D86732", fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 }}>
            Select Deck
          </Text>
          {testDecksLoading ? (
            <ActivityIndicator color="#D86732" style={{ marginVertical: 16 }} />
          ) : testDecks.length === 0 ? (
            <Text style={{ color: "#6b7a9b", fontStyle: "italic", fontSize: 13 }}>
              No decks found. Create one in the Decks tab.
            </Text>
          ) : (
            testDecks.map((deck) => {
              const id = deck._id || deck.id;
              const name = deck.name || "Unnamed";
              const selected = testSelectedDeckId === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => selectTestDeck(id, name)}
                  style={{
                    backgroundColor: selected ? "#2a1800" : "#1b2540",
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 8,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderWidth: 2,
                    borderColor: selected ? "#D86732" : "transparent",
                  }}
                >
                  <Text style={{ color: selected ? "#D86732" : "white", fontWeight: "700", fontSize: 14 }}>{name}</Text>
                  <Text style={{ color: "#6b7a9b", fontSize: 12 }}>
                    {deck.cardCount || deck.cardsCount || deck.totalCards || deck.count || 0} cards
                  </Text>
                </Pressable>
              );
            })
          )}

          {/* Step 2: Card side config (only shown once a deck is selected) */}
          {testSelectedDeckId && (
            <>
              <Text style={{ color: "#D86732", fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6, marginTop: 24, marginBottom: 10 }}>
                Question (shown as the prompt)
              </Text>
              {(["front", "back"] as const).map((field) => {
                const selected = testQuestionField === field;
                return (
                  <Pressable
                    key={field}
                    onPress={() => selectTestQuestion(field)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#1b2540",
                      borderRadius: 12,
                      padding: 14,
                      gap: 12,
                      marginBottom: 8,
                      borderWidth: 2,
                      borderColor: selected ? "#D86732" : "transparent",
                    }}
                  >
                    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: selected ? "#D86732" : "#6b7a9b", justifyContent: "center", alignItems: "center" }}>
                      {selected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#D86732" }} />}
                    </View>
                    <Text style={{ color: selected ? "#D86732" : "#A9BDDB", fontSize: 15, fontWeight: "600" }}>
                      {field === "front" ? "Front field" : "Back field"}
                    </Text>
                  </Pressable>
                );
              })}

              <Text style={{ color: "#6EADEB", fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6, marginTop: 20, marginBottom: 10 }}>
                Answer (correct answer &amp; options)
              </Text>
              {(["front", "back"] as const).map((field) => {
                const selected = testAnswerField === field;
                return (
                  <Pressable
                    key={field}
                    onPress={() => selectTestAnswer(field)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#1b2540",
                      borderRadius: 12,
                      padding: 14,
                      gap: 12,
                      marginBottom: 8,
                      borderWidth: 2,
                      borderColor: selected ? "#6EADEB" : "transparent",
                    }}
                  >
                    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: selected ? "#6EADEB" : "#6b7a9b", justifyContent: "center", alignItems: "center" }}>
                      {selected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#6EADEB" }} />}
                    </View>
                    <Text style={{ color: selected ? "#6EADEB" : "#A9BDDB", fontSize: 15, fontWeight: "600" }}>
                      {field === "front" ? "Front field" : "Back field"}
                    </Text>
                  </Pressable>
                );
              })}

              {/* Live preview */}
              <Text style={{ color: "#D86732", fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6, marginTop: 24, marginBottom: 10 }}>
                Preview
              </Text>
              {testSampleLoading ? (
                <View style={{ height: 100, justifyContent: "center", alignItems: "center", backgroundColor: "#1b2540", borderRadius: 16, gap: 10 }}>
                  <ActivityIndicator color="#D86732" />
                  <Text style={{ color: "#6b7a9b", fontSize: 13 }}>Loading sample card…</Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  <View style={{ backgroundColor: "#1b2540", borderRadius: 14, padding: 16 }}>
                    <Text style={{ color: "#A9BDDB", fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>QUESTION</Text>
                    <Text style={{ color: "white", fontSize: 15, fontWeight: "600", lineHeight: 22 }} numberOfLines={4}>
                      {testSampleCard ? testSampleCard[testQuestionField] : "No mastered cards yet — complete study sessions first."}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: "#0f291a", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#16a34a" }}>
                    <Text style={{ color: "#4ade80", fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>ANSWER</Text>
                    <Text style={{ color: "white", fontSize: 15, fontWeight: "600", lineHeight: 22 }} numberOfLines={3}>
                      {testSampleCard ? testSampleCard[testAnswerField] : "—"}
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={{ padding: 20, paddingBottom: 44, gap: 12, borderTopWidth: 1, borderTopColor: "#1b2540" }}>
          <Pressable
            onPress={confirmTestLaunch}
            disabled={!testSelectedDeckId}
            style={{ backgroundColor: testSelectedDeckId ? "#D86732" : "#2a2e36", padding: 18, borderRadius: 16, alignItems: "center" }}
          >
            <Text style={{ color: testSelectedDeckId ? "#fff" : "#6b7a9b", fontWeight: "800", fontSize: 16 }}>
              Start Test
            </Text>
          </Pressable>
          <Pressable onPress={() => setTestModalVisible(false)}>
            <Text style={{ color: "#A9BDDB", textAlign: "center", fontSize: 14, fontWeight: "600" }}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
    </>
  );
}

/* =========================
   🔥 STYLES
========================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LucidTheme.bg,
    padding: 24,
  },

  headerCard: {
    backgroundColor: "#1b2540",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },

  title: {
    color: "white",
    fontSize: 26,
    fontWeight: "800",
  },

  subtitle: {
    color: "#A9BDDB",
    marginTop: 6,
  },

  card: {
    backgroundColor: "#1b2540",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },

  sectionTitle: {
    color: "#D86732",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10,
  },

  helper: {
    color: "#A9BDDB",
    marginBottom: 10,
  },

  row: {
    flexDirection: "row",
    gap: 10,
  },

  cta: {
    backgroundColor: "#D86732",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
  },

  ctaText: {
    fontWeight: "800",
    fontSize: 16,
    color: "#0B0B0F",
  },

  leaderboardCard: {
    backgroundColor: "#0e1424",
    padding: 16,
    borderRadius: 14,
  },

  leaderText: {
    color: "#fff",
    marginBottom: 6,
    fontWeight: "700",
  },

  leaderHint: {
    color: "#A9BDDB",
    marginTop: 6,
    fontSize: 12,
  },

  emptyTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },

  emptySubtitle: {
    color: "#A9BDDB",
    marginTop: 6,
    textAlign: "center",
  },

  notifBanner: {
    backgroundColor: "#7c2d12",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ef4444",
  },

  notifBannerTitle: {
    color: "#fecaca",
    fontWeight: "800",
    fontSize: 15,
    marginBottom: 4,
  },

  notifBannerBody: {
    color: "#fca5a5",
    fontSize: 13,
    lineHeight: 18,
  },
});