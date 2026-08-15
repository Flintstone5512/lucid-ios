import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { getDecks } from "../../services/api";
import { scheduleChildTest, scheduleLocalTestNotification } from "../../services/testModeService";
import { useRefocusStore } from "../../store/useRefocusStore";
import { LucidTheme } from "../../constants/lucidTheme";

const SCHEDULE_OPTIONS = [
  { label: "Tomorrow", daysFromNow: 1 },
  { label: "In 2 days", daysFromNow: 2 },
  { label: "Next week", daysFromNow: 7 },
];

function scheduledDate(daysFromNow: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(9, 0, 0, 0); // 9 AM
  return d;
}

export default function TestSetupScreen() {
  const { context } = useRefocusStore();
  const role = context?.role;
  const children: any[] = context?.account?.children || [];

  const [decks, setDecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [selectedDeckName, setSelectedDeckName] = useState("");

  // Parent-only state
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [selectedChildName, setSelectedChildName] = useState("");
  const [scheduleIndex, setScheduleIndex] = useState<number | null>(null);
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    getDecks()
      .then((d) => setDecks(Array.isArray(d) ? d : []))
      .catch(() => setDecks([]))
      .finally(() => setLoading(false));
  }, []);

  function handleStartTest() {
    if (!selectedDeckId) {
      Alert.alert("Pick a deck", "Select a deck to test yourself on.");
      return;
    }
    router.push({
      pathname: "/test/[deckId]",
      params: { deckId: selectedDeckId, deckName: selectedDeckName },
    });
  }

  async function handleScheduleChildTest() {
    if (!selectedChildId) {
      Alert.alert("Pick a child", "Select which child to schedule a test for.");
      return;
    }
    if (!selectedDeckId) {
      Alert.alert("Pick a deck", "Select a deck for the test.");
      return;
    }
    if (scheduleIndex === null) {
      Alert.alert("Pick a date", "Choose when to send the test notification.");
      return;
    }

    const { daysFromNow } = SCHEDULE_OPTIONS[scheduleIndex];
    const when = scheduledDate(daysFromNow);

    setScheduling(true);
    try {
      await scheduleChildTest({
        childId: selectedChildId,
        deckId: selectedDeckId,
        deckName: selectedDeckName,
        scheduledAt: when.toISOString(),
      });
      await scheduleLocalTestNotification(selectedChildName, selectedDeckName, when);
      Alert.alert(
        "Test Scheduled",
        `${selectedChildName} will be notified on ${when.toLocaleDateString()} at 9 AM.`
      );
    } catch {
      Alert.alert("Error", "Failed to schedule the test. Try again.");
    } finally {
      setScheduling(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#D86732" size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Test Mode</Text>
        <Text style={styles.subtitle}>
          {role === "parent"
            ? "Quiz your child on cards they've mastered, or test yourself."
            : "Test yourself on cards you already know."}
        </Text>
      </View>

      {/* Deck picker */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Select Deck</Text>
        <Text style={styles.helper}>Cards rated Good or Easy will be used.</Text>

        {decks.length === 0 ? (
          <Text style={styles.empty}>No decks found. Create one in the Decks tab.</Text>
        ) : (
          decks.map((deck) => {
            const id = deck._id || deck.id;
            const name = deck.name || "Unnamed Deck";
            const selected = selectedDeckId === id;
            return (
              <Pressable
                key={id}
                onPress={() => {
                  setSelectedDeckId(id);
                  setSelectedDeckName(name);
                }}
                style={[styles.deckRow, selected && styles.deckRowSelected]}
              >
                <Text style={[styles.deckName, selected && styles.deckNameSelected]}>
                  {name}
                </Text>
                <Text style={styles.deckMeta}>
                  {deck.cardCount || deck.cardsCount || deck.totalCards || deck.count || 0} cards
                </Text>
              </Pressable>
            );
          })
        )}
      </View>

      {/* Solo: start test */}
      {role !== "parent" && (
        <Pressable
          style={[styles.cta, !selectedDeckId && styles.ctaDisabled]}
          onPress={handleStartTest}
        >
          <Text style={styles.ctaText}>Start Test</Text>
        </Pressable>
      )}

      {/* Parent: test themselves or schedule child test */}
      {role === "parent" && (
        <>
          <Pressable
            style={[styles.cta, !selectedDeckId && styles.ctaDisabled]}
            onPress={handleStartTest}
          >
            <Text style={styles.ctaText}>Test Myself</Text>
          </Pressable>

          {/* Child picker */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Schedule Test for a Child</Text>
            <Text style={styles.helper}>
              Pick a child and we'll send them a notification.
            </Text>

            {children.length === 0 ? (
              <Text style={styles.empty}>No children connected yet.</Text>
            ) : (
              children.map((child: any) => {
                const cid = child.userId;
                const cname = child.name || "Unnamed";
                const selected = selectedChildId === cid;
                return (
                  <Pressable
                    key={cid}
                    onPress={() => {
                      setSelectedChildId(cid);
                      setSelectedChildName(cname);
                    }}
                    style={[styles.deckRow, selected && styles.deckRowSelected]}
                  >
                    <Text style={[styles.deckName, selected && styles.deckNameSelected]}>
                      {cname}
                    </Text>
                    <Text style={styles.deckMeta}>
                      🔥 {child.streak?.currentStreak || 0} day streak
                    </Text>
                  </Pressable>
                );
              })
            )}
          </View>

          {/* Schedule picker */}
          {selectedChildId && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>When to Notify</Text>
              <View style={styles.scheduleRow}>
                {SCHEDULE_OPTIONS.map((opt, i) => (
                  <Pressable
                    key={opt.label}
                    onPress={() => setScheduleIndex(i)}
                    style={[styles.scheduleBtn, scheduleIndex === i && styles.scheduleBtnSelected]}
                  >
                    <Text style={[styles.scheduleBtnText, scheduleIndex === i && styles.scheduleBtnTextSelected]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {selectedChildId && (
            <Pressable
              style={[
                styles.cta,
                styles.ctaSecondary,
                (!selectedDeckId || scheduleIndex === null || scheduling) && styles.ctaDisabled,
              ]}
              onPress={handleScheduleChildTest}
              disabled={scheduling}
            >
              <Text style={styles.ctaText}>
                {scheduling ? "Scheduling..." : `Schedule Test for ${selectedChildName}`}
              </Text>
            </Pressable>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LucidTheme.bg,
    padding: 24,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: LucidTheme.bg,
  },
  header: {
    marginBottom: 24,
  },
  backBtn: {
    marginBottom: 12,
  },
  backText: {
    color: "#D86732",
    fontWeight: "700",
    fontSize: 15,
  },
  title: {
    color: "white",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 6,
  },
  subtitle: {
    color: "#A9BDDB",
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#1b2540",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#D86732",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },
  helper: {
    color: "#A9BDDB",
    fontSize: 13,
    marginBottom: 12,
  },
  empty: {
    color: "#6b7a9b",
    fontStyle: "italic",
    fontSize: 13,
  },
  deckRow: {
    backgroundColor: "#0e1424",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  deckRowSelected: {
    borderColor: "#D86732",
  },
  deckName: {
    color: "white",
    fontWeight: "700",
    fontSize: 14,
    flex: 1,
  },
  deckNameSelected: {
    color: "#D86732",
  },
  deckMeta: {
    color: "#6b7a9b",
    fontSize: 12,
  },
  cta: {
    backgroundColor: "#D86732",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  ctaSecondary: {
    backgroundColor: "#1b2540",
    borderWidth: 2,
    borderColor: "#D86732",
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  ctaText: {
    fontWeight: "800",
    fontSize: 16,
    color: "#fff",
  },
  scheduleRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  scheduleBtn: {
    backgroundColor: "#0e1424",
    borderRadius: 10,
    padding: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  scheduleBtnSelected: {
    borderColor: "#D86732",
  },
  scheduleBtnText: {
    color: "#A9BDDB",
    fontWeight: "700",
    fontSize: 13,
  },
  scheduleBtnTextSelected: {
    color: "#D86732",
  },
});
