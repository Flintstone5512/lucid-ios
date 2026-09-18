import { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { LucidTheme } from "../../constants/lucidTheme";
import {
  getImmersiveSettings,
  updateImmersiveSettings,
  getRetiredCards,
  unretireCard,
  sendPreview,
  rewindSession,
  ImmersiveSettings,
} from "../../services/immersiveNotificationService";
import api from "../../services/api";

const INTERVALS = [1, 2, 3, 4, 5, 10];

// Build hour chips for window start/end — "06:00" through "23:00"
const HOURS = Array.from({ length: 18 }, (_, i) => {
  const h = i + 6;
  return `${String(h).padStart(2, "0")}:00`;
});

function detectTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export default function ImmersiveNotificationsScreen() {
  const [settings, setSettings] = useState<ImmersiveSettings | null>(null);
  const [decks, setDecks] = useState<any[]>([]);
  const [retiredCards, setRetiredCards] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showRetired, setShowRetired] = useState(false);
  // Raw text inputs for card range (so user can clear and retype)
  const [rangeStartText, setRangeStartText] = useState("");
  const [rangeEndText, setRangeEndText] = useState("");
  // Rewind
  const [rewindText, setRewindText] = useState("10");
  const [rewinding, setRewinding] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const [s, deckRes] = await Promise.all([
        getImmersiveSettings(),
        api.get("/decks"),
      ]);
      if (!s.timezone || s.timezone === "UTC") {
        s.timezone = detectTimezone();
      }
      setSettings(s);
      setDecks(deckRes.data?.decks ?? deckRes.data ?? []);
      setRangeStartText(s.cardRangeStart != null ? String(s.cardRangeStart) : "");
      setRangeEndText(s.cardRangeEnd != null ? String(s.cardRangeEnd) : "");
    } catch (err) {
      Alert.alert("Error", "Could not load Immersive Cram Session settings.");
    } finally {
      setLoading(false);
    }
  }

  async function loadRetired() {
    try {
      const cards = await getRetiredCards();
      setRetiredCards(cards);
    } catch {
      setRetiredCards([]);
    }
  }

  async function save() {
    if (!settings) return;

    // Parse range inputs
    const parsedStart = rangeStartText.trim() ? parseInt(rangeStartText.trim(), 10) : null;
    const parsedEnd = rangeEndText.trim() ? parseInt(rangeEndText.trim(), 10) : null;

    if (parsedStart != null && isNaN(parsedStart)) {
      Alert.alert("Invalid range", "Start card must be a number.");
      return;
    }
    if (parsedEnd != null && isNaN(parsedEnd)) {
      Alert.alert("Invalid range", "End card must be a number.");
      return;
    }
    if (parsedStart != null && parsedEnd != null && parsedStart > parsedEnd) {
      Alert.alert("Invalid range", "Start card must be less than or equal to end card.");
      return;
    }

    try {
      setSaving(true);
      const updated = await updateImmersiveSettings({
        enabled: settings.enabled,
        paused: settings.paused,
        deckId: settings.deckId,
        intervalMinutes: settings.intervalMinutes,
        windowStart: settings.windowStart,
        windowEnd: settings.windowEnd,
        timezone: settings.timezone,
        shuffleMode: settings.shuffleMode,
        cardRangeStart: parsedStart,
        cardRangeEnd: parsedEnd,
      });
      setSettings(updated);
      Alert.alert("Saved", "Immersive Cram Session settings updated.");
    } catch {
      Alert.alert("Error", "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUnretire(cardId: string) {
    try {
      const updated = await unretireCard(cardId);
      setSettings(updated);
      setRetiredCards((prev) => prev.filter((c) => c._id !== cardId));
    } catch {
      Alert.alert("Error", "Failed to un-retire card.");
    }
  }

  async function handlePreview() {
    if (!settings?.deckId) {
      Alert.alert("No deck selected", "Pick a deck before sending a preview.");
      return;
    }
    try {
      setPreviewing(true);
      await sendPreview();
      Alert.alert("Sent!", "A card notification was just sent to your device.");
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.error ?? "Preview failed.");
    } finally {
      setPreviewing(false);
    }
  }

  async function handleRewind() {
    const steps = parseInt(rewindText.trim(), 10);
    if (!steps || steps < 1) {
      Alert.alert("Invalid", "Enter a positive number of cards to rewind.");
      return;
    }
    try {
      setRewinding(true);
      const updated = await rewindSession(steps);
      setSettings(updated);
      Alert.alert("Rewound", `Queue moved back ${steps} card${steps === 1 ? "" : "s"}.`);
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.error ?? "Rewind failed.");
    } finally {
      setRewinding(false);
    }
  }

  function patch(changes: Partial<ImmersiveSettings>) {
    setSettings((prev) => (prev ? { ...prev, ...changes } : prev));
  }

  async function patchAndSave(changes: Partial<ImmersiveSettings>) {
    if (!settings) return;
    const next = { ...settings, ...changes };
    setSettings(next);
    try {
      const updated = await updateImmersiveSettings(changes);
      setSettings(updated);
    } catch {
      // Revert on failure
      setSettings(settings);
      Alert.alert("Error", "Failed to save. Please try again.");
    }
  }

  if (loading || !settings) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={LucidTheme.accent} />
      </View>
    );
  }

  const selectedDeck = decks.find((d) => String(d._id) === String(settings.deckId));

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Immersive Cram Session</Text>
      </View>

      <Text style={styles.subtitle}>
        Send flashcard prompts to your lock screen on a timer. Separate from your SRS review system.
      </Text>

      {/* MASTER TOGGLE */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Status</Text>
        <Pressable
          onPress={() => patchAndSave({ enabled: !settings.enabled })}
          style={[
            styles.bigToggle,
            settings.enabled ? styles.toggleOn : styles.toggleOff,
          ]}
        >
          <Text style={styles.toggleText}>
            {settings.enabled ? "ON — Tap to Disable" : "OFF — Tap to Enable"}
          </Text>
        </Pressable>
      </View>

      {/* PAUSE / RESUME */}
      {settings.enabled && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Session Control</Text>
          <Text style={styles.hint}>
            Pause keeps your place in the deck rotation. Resume picks up where you left off.
          </Text>
          <Pressable
            onPress={() => patchAndSave({ paused: !settings.paused })}
            style={[
              styles.bigToggle,
              settings.paused ? styles.pausedToggle : styles.resumedToggle,
            ]}
          >
            <Text style={styles.toggleText}>
              {settings.paused ? "⏸  Paused — Tap to Resume" : "▶  Running — Tap to Pause"}
            </Text>
          </Pressable>
          {settings.currentIndex > 0 && (
            <Text style={styles.progressHint}>
              Position: card {settings.currentIndex} of {settings.cardQueue?.length ?? "?"} in current cycle
            </Text>
          )}

          {/* REWIND */}
          <View style={styles.rewindRow}>
            <TextInput
              style={styles.rewindInput}
              value={rewindText}
              onChangeText={setRewindText}
              keyboardType="number-pad"
              returnKeyType="done"
              selectTextOnFocus
            />
            <Pressable
              onPress={handleRewind}
              disabled={rewinding}
              style={[styles.rewindBtn, rewinding && { opacity: 0.6 }]}
            >
              <Text style={styles.rewindBtnText}>
                {rewinding ? "..." : "⏪ Rewind"}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.rewindHint}>cards back in the queue</Text>
        </View>
      )}

      {/* DECK PICKER */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Select Deck</Text>
        <Text style={styles.hint}>
          Cards in this deck will cycle through your notifications.
        </Text>
        {decks.length === 0 ? (
          <Text style={styles.emptyText}>No decks found.</Text>
        ) : (
          decks.map((deck) => {
            const selected = String(deck._id) === String(settings.deckId);
            return (
              <Pressable
                key={deck._id}
                onPress={() =>
                  patch({ deckId: selected ? null : deck._id })
                }
                style={[styles.deckRow, selected && styles.deckRowSelected]}
              >
                <View style={styles.deckInfo}>
                  <Text style={[styles.deckName, selected && styles.deckNameSelected]}>
                    {deck.name}
                  </Text>
                  <Text style={styles.deckCount}>{deck.cardCount ?? 0} cards</Text>
                </View>
                {selected && <Text style={styles.checkmark}>✓</Text>}
              </Pressable>
            );
          })
        )}
      </View>

      {/* CARD RANGE */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Card Range</Text>
        <Text style={styles.hint}>
          Limit the session to a slice of the deck. Leave blank to use all cards.
          {selectedDeck ? ` Deck has ${selectedDeck.cardCount ?? "?"} cards.` : ""}
        </Text>
        <View style={styles.rangeRow}>
          <View style={styles.rangeField}>
            <Text style={styles.rangeLabel}>From card #</Text>
            <TextInput
              style={styles.rangeInput}
              value={rangeStartText}
              onChangeText={setRangeStartText}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor="#4a5a7a"
              returnKeyType="done"
            />
          </View>
          <Text style={styles.rangeSep}>—</Text>
          <View style={styles.rangeField}>
            <Text style={styles.rangeLabel}>To card #</Text>
            <TextInput
              style={styles.rangeInput}
              value={rangeEndText}
              onChangeText={setRangeEndText}
              keyboardType="number-pad"
              placeholder={selectedDeck ? String(selectedDeck.cardCount ?? "") : "end"}
              placeholderTextColor="#4a5a7a"
              returnKeyType="done"
            />
          </View>
        </View>
        {rangeStartText || rangeEndText ? (
          <Pressable onPress={() => { setRangeStartText(""); setRangeEndText(""); }}>
            <Text style={styles.clearRange}>Clear range (use all cards)</Text>
          </Pressable>
        ) : null}
      </View>

      {/* INTERVAL */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Notification Interval</Text>
        <View style={styles.chipRow}>
          {INTERVALS.map((min) => (
            <Pressable
              key={min}
              onPress={() => patch({ intervalMinutes: min })}
              style={[
                styles.chip,
                settings.intervalMinutes === min && styles.chipActive,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  settings.intervalMinutes === min && styles.chipTextActive,
                ]}
              >
                {min}m
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* TIME WINDOW */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Active Window</Text>
        <Text style={styles.hint}>
          Notifications only send during this time window (your local time).
        </Text>

        <Text style={styles.windowLabel}>Start time</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hourScroll}>
          {HOURS.map((h) => (
            <Pressable
              key={h}
              onPress={() => patch({ windowStart: h })}
              style={[
                styles.hourChip,
                settings.windowStart === h && styles.hourChipActive,
              ]}
            >
              <Text
                style={[
                  styles.hourText,
                  settings.windowStart === h && styles.hourTextActive,
                ]}
              >
                {formatHour(h)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={[styles.windowLabel, { marginTop: 12 }]}>End time</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hourScroll}>
          {HOURS.map((h) => (
            <Pressable
              key={h}
              onPress={() => patch({ windowEnd: h })}
              style={[
                styles.hourChip,
                settings.windowEnd === h && styles.hourChipActive,
              ]}
            >
              <Text
                style={[
                  styles.hourText,
                  settings.windowEnd === h && styles.hourTextActive,
                ]}
              >
                {formatHour(h)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.windowSummary}>
          Window: {formatHour(settings.windowStart)} → {formatHour(settings.windowEnd)}
        </Text>

        <Text style={styles.windowLabel}>Timezone</Text>
        <TextInput
          style={styles.tzInput}
          value={settings.timezone}
          onChangeText={(v) => patch({ timezone: v })}
          placeholder="e.g. America/New_York"
          placeholderTextColor="#4a5a7a"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* SHUFFLE */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Shuffle Mode</Text>
        <Text style={styles.hint}>
          When enabled, cards are randomized each cycle instead of shown in order.
        </Text>
        <Pressable
          onPress={() => patch({ shuffleMode: !settings.shuffleMode })}
          style={[
            styles.bigToggle,
            settings.shuffleMode ? styles.toggleOn : styles.toggleOff,
          ]}
        >
          <Text style={styles.toggleText}>
            {settings.shuffleMode ? "Shuffle ON" : "Shuffle OFF"}
          </Text>
        </Pressable>
      </View>

      {/* SAVE */}
      <Pressable
        onPress={save}
        disabled={saving}
        style={[styles.saveBtn, saving && { opacity: 0.6 }]}
      >
        <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Settings"}</Text>
      </Pressable>

      {/* PREVIEW */}
      <Pressable
        onPress={handlePreview}
        disabled={previewing}
        style={[styles.previewBtn, previewing && { opacity: 0.6 }]}
      >
        <Text style={styles.previewBtnText}>
          {previewing ? "Sending..." : "Send Test Notification Now"}
        </Text>
      </Pressable>

      {/* RETIRED CARDS */}
      <View style={styles.card}>
        <Pressable
          onPress={() => {
            const next = !showRetired;
            setShowRetired(next);
            if (next && retiredCards.length === 0) loadRetired();
          }}
          style={styles.retiredHeader}
        >
          <Text style={styles.sectionTitle}>Retired Cards</Text>
          <Text style={styles.retiredToggle}>{showRetired ? "▲" : "▼"}</Text>
        </Pressable>

        {showRetired && (
          <>
            {settings.retiredCardIds.length === 0 ? (
              <Text style={styles.emptyText}>No cards retired yet.</Text>
            ) : retiredCards.length === 0 ? (
              <ActivityIndicator color={LucidTheme.accent} />
            ) : (
              retiredCards.map((card) => {
                const front = card.note?.fields?.[0] ?? "(no content)";
                return (
                  <View key={card._id} style={styles.retiredRow}>
                    <Text style={styles.retiredFront} numberOfLines={2}>
                      {front}
                    </Text>
                    <Pressable
                      onPress={() => handleUnretire(card._id)}
                      style={styles.unretireBtn}
                    >
                      <Text style={styles.unretireText}>Restore</Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

function formatHour(hhmm: string) {
  const [h] = hhmm.split(":").map(Number);
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LucidTheme.bg,
    padding: 20,
  },
  center: {
    flex: 1,
    backgroundColor: LucidTheme.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 12,
    marginTop: 12,
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  backText: {
    color: LucidTheme.accent,
    fontWeight: "700",
    fontSize: 15,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    flex: 1,
  },
  subtitle: {
    color: LucidTheme.sub,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 24,
  },
  card: {
    backgroundColor: LucidTheme.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    color: LucidTheme.accent,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },
  hint: {
    color: LucidTheme.sub,
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 18,
  },
  bigToggle: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  toggleOn: {
    backgroundColor: "#1DB954",
  },
  toggleOff: {
    backgroundColor: "#2A2E36",
    borderWidth: 1,
    borderColor: "#3a4a6a",
  },
  pausedToggle: {
    backgroundColor: "#7C5C00",
    borderWidth: 1,
    borderColor: "#F0A500",
  },
  resumedToggle: {
    backgroundColor: "#0E4D2E",
    borderWidth: 1,
    borderColor: "#1DB954",
  },
  toggleText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
  progressHint: {
    color: LucidTheme.sub,
    fontSize: 11,
    textAlign: "center",
    marginTop: 8,
  },
  deckRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#111d36",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  deckRowSelected: {
    borderColor: LucidTheme.accent,
  },
  deckInfo: {
    flex: 1,
  },
  deckName: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  deckNameSelected: {
    color: LucidTheme.accentSoft,
  },
  deckCount: {
    color: LucidTheme.sub,
    fontSize: 12,
    marginTop: 2,
  },
  checkmark: {
    color: LucidTheme.accent,
    fontSize: 18,
    fontWeight: "800",
    marginLeft: 8,
  },
  emptyText: {
    color: LucidTheme.sub,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 12,
  },
  rangeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 8,
  },
  rangeField: {
    flex: 1,
  },
  rangeLabel: {
    color: LucidTheme.sub,
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 6,
  },
  rangeInput: {
    backgroundColor: "#111d36",
    borderRadius: 10,
    padding: 12,
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    borderWidth: 1,
    borderColor: "#2a3a5a",
    textAlign: "center",
  },
  rangeSep: {
    color: LucidTheme.sub,
    fontSize: 18,
    fontWeight: "700",
    paddingBottom: 12,
  },
  clearRange: {
    color: LucidTheme.accent,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
    paddingVertical: 4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#111d36",
    borderWidth: 1,
    borderColor: "#2a3a5a",
  },
  chipActive: {
    backgroundColor: LucidTheme.accent,
    borderColor: LucidTheme.accent,
  },
  chipText: {
    color: LucidTheme.sub,
    fontWeight: "700",
    fontSize: 13,
  },
  chipTextActive: {
    color: "#fff",
  },
  windowLabel: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
    marginBottom: 8,
  },
  hourScroll: {
    marginBottom: 4,
  },
  hourChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#111d36",
    borderWidth: 1,
    borderColor: "#2a3a5a",
    marginRight: 8,
  },
  hourChipActive: {
    backgroundColor: LucidTheme.accent,
    borderColor: LucidTheme.accent,
  },
  hourText: {
    color: LucidTheme.sub,
    fontWeight: "600",
    fontSize: 12,
  },
  hourTextActive: {
    color: "#fff",
  },
  windowSummary: {
    color: LucidTheme.accentSoft,
    fontWeight: "700",
    fontSize: 13,
    marginTop: 10,
    marginBottom: 16,
    textAlign: "center",
  },
  tzInput: {
    backgroundColor: "#111d36",
    borderRadius: 10,
    padding: 12,
    color: "#fff",
    fontSize: 13,
    borderWidth: 1,
    borderColor: "#2a3a5a",
    marginTop: 4,
  },
  saveBtn: {
    backgroundColor: LucidTheme.accent,
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  previewBtn: {
    backgroundColor: "#1b2540",
    borderWidth: 1,
    borderColor: LucidTheme.accent,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 20,
  },
  previewBtnText: {
    color: LucidTheme.accent,
    fontWeight: "700",
    fontSize: 15,
  },
  retiredHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  retiredToggle: {
    color: LucidTheme.sub,
    fontSize: 16,
  },
  retiredRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111d36",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    gap: 10,
  },
  retiredFront: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
    lineHeight: 18,
  },
  unretireBtn: {
    backgroundColor: LucidTheme.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  unretireText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  rewindRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  rewindInput: {
    width: 64,
    backgroundColor: "#111d36",
    borderRadius: 10,
    padding: 12,
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    borderWidth: 1,
    borderColor: "#2a3a5a",
    textAlign: "center",
  },
  rewindBtn: {
    flex: 1,
    backgroundColor: "#1b2540",
    borderWidth: 1,
    borderColor: "#4a6a9a",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  rewindBtnText: {
    color: "#A9BDDB",
    fontWeight: "700",
    fontSize: 14,
  },
  rewindHint: {
    color: LucidTheme.sub,
    fontSize: 11,
    marginTop: 5,
    marginLeft: 2,
  },
});
