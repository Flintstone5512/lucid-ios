import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { AnkiFieldModal } from "../../components/AnkiFieldModal";
import {
  previewAnkiDeck,
  importAnkiDeckForChild,
  previewExcelDeck,
  importExcelDeckForChild,
  generateDeckForChild,
  AnkiPreview,
} from "../../services/aiDeckService";

function timeAgoLabel(dateStr: string | null): string {
  if (!dateStr) return "never";
  const ms = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 1) return "less than an hour ago";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

import {
  getParentDashboard,
  updateChildRestrictions,
  generateLinkCode,
  updateParentFocusMode,
} from "../../services/parentService";

import { useRefocusStore } from "../../store/useRefocusStore";
import UpgradeButton from "../../components/UpgradeButton";
import MetricCard from "../../components/MetricCard";
import { LucidTheme } from "../../constants/lucidTheme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { applyShield, clearShield, hasSelection } from "../../modules/screen-time";
import {
  setAndroidParentSelfBlocking,
  getAndroidParentSelfBlockingStatus,
} from "../../services/nativeBridge";

const SELF_BLOCK_KEY = "parentSelfBlockingEnabled";
import { router, useFocusEffect } from "expo-router";

export default function ParentDashboard() {
  const [data, setData] = useState<any>(null);
  const [code, setCode] = useState("");
  const [focusMode, setFocusMode] = useState("soft");
  const [selfBlocking, setSelfBlocking] = useState(false);
  const [selfBlockLoading, setSelfBlockLoading] = useState(false);

  const { context, limits } = useRefocusStore();
  const alertedRef = useRef(false);

  // ── Deck management for child ─────────────────────
  const [importTarget, setImportTarget] = useState<{ id: string; name: string } | null>(null);
  const [importType, setImportType] = useState<"anki" | "excel" | null>(null);
  const [deckImporting, setDeckImporting] = useState(false);

  // Anki modal state
  const [ankiPreview, setAnkiPreview] = useState<AnkiPreview | null>(null);
  const [ankiFile, setAnkiFile] = useState<any>(null);
  const [ankiFront, setAnkiFront] = useState<number[]>([0]);
  const [ankiBack, setAnkiBack] = useState<number[]>([1]);
  const [ankiAudio, setAnkiAudio] = useState<number | null>(null);
  const [ankiDeckName, setAnkiDeckName] = useState("");

  // Excel modal state
  const [excelPreview, setExcelPreview] = useState<AnkiPreview | null>(null);
  const [excelFile, setExcelFile] = useState<any>(null);
  const [excelFront, setExcelFront] = useState<number[]>([0]);
  const [excelBack, setExcelBack] = useState<number[]>([1]);
  const [excelDeckName, setExcelDeckName] = useState("");

  const children = context?.account?.children || [];
  const maxChildren = limits?.maxChildren ?? 0;
  const plan = context?.settings?.billing?.plan;

  useEffect(() => {
    load();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === "ios") {
        // Read the stored preference, not the live shield state.
        // The shield may be temporarily cleared during an unlock window after a
        // session — that doesn't mean the user disabled self-blocking.
        // Also reapply the shield here so device restarts don't silently lift it;
        // applyShield() already skips during active unlock windows.
        AsyncStorage.getItem(SELF_BLOCK_KEY).then((val) => {
          const enabled = val === "true";
          setSelfBlocking(enabled);
          if (enabled) applyShield().catch(() => {});
        }).catch(() => {});
      } else if (Platform.OS === "android") {
        getAndroidParentSelfBlockingStatus().then((res) => {
          setSelfBlocking(!!res?.enabled);
        }).catch(() => {});
      }
    }, [])
  );

  async function load() {
    try {
      const res = await getParentDashboard();
      setData(res);

      if (!alertedRef.current) {
        const inactive = (res.children || []).filter((c: any) => c.isAppActive === false);
        if (inactive.length > 0) {
          alertedRef.current = true;
          const names = inactive.map((c: any) => c.name || "Unnamed").join(", ");
          Alert.alert(
            "App May Have Been Uninstalled",
            `${names} hasn't opened Lucid in over 24 hours. They may have removed the app from their device.`,
            [{ text: "OK" }]
          );
        }
      }
    } catch (err) {
      console.log("Parent dashboard error:", err);
    }
  }

  async function handleGenerateCode() {
    const res = await generateLinkCode();
    setCode(res.code);
  }

  async function saveParentMode(mode: string) {
    await updateParentFocusMode(mode as any);
    setFocusMode(mode);
  }

  async function toggleSelfBlocking() {
    try {
      setSelfBlockLoading(true);
      if (selfBlocking) {
        await clearShield();
        await AsyncStorage.setItem(SELF_BLOCK_KEY, "false");
        setSelfBlocking(false);
      } else {
        // Check whether the user has ever selected apps to block.
        // Don't use getShieldStatus() here — the shield may be temporarily
        // cleared during an unlock window even when apps are selected, which
        // would give a false "no selection" result and send the user to setup.
        const selRes = await hasSelection().catch(() => null);
        if (selRes?.hasSelection) {
          await AsyncStorage.setItem(SELF_BLOCK_KEY, "true");
          // applyShield() skips silently when an unlock window is active — that
          // is fine; it will reapply on the next foreground once the window expires.
          await applyShield().catch(() => {});
          setSelfBlocking(true);
        } else {
          // No apps selected yet — send to setup so the user can pick them.
          router.push("/screens/IOSScreenTimeSetupScreen");
        }
      }
    } catch {
      // ignore
    } finally {
      setSelfBlockLoading(false);
    }
  }

  async function toggleAndroidSelfBlocking() {
    try {
      setSelfBlockLoading(true);
      const next = !selfBlocking;
      await setAndroidParentSelfBlocking(next);
      setSelfBlocking(next);
    } catch {
      // ignore
    } finally {
      setSelfBlockLoading(false);
    }
  }

  function toggleIndex(arr: number[], idx: number): number[] {
    return arr.includes(idx) ? arr.filter((i) => i !== idx) : [...arr, idx];
  }

  function resetImportState() {
    setImportTarget(null);
    setImportType(null);
    setAnkiPreview(null);
    setAnkiFile(null);
    setAnkiFront([0]);
    setAnkiBack([1]);
    setAnkiAudio(null);
    setAnkiDeckName("");
    setExcelPreview(null);
    setExcelFile(null);
    setExcelFront([0]);
    setExcelBack([1]);
    setExcelDeckName("");
  }

  async function handleImportAnki(childId: string, childName: string) {
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (result.canceled) return;
    const file = result.assets[0];
    try {
      const preview = await previewAnkiDeck(file);
      const fields = preview.modelSchemas?.[0]?.fields ?? [];
      setImportTarget({ id: childId, name: childName });
      setImportType("anki");
      setAnkiFile(file);
      setAnkiPreview(preview);
      setAnkiFront([0]);
      setAnkiBack([Math.min(1, fields.length - 1)]);
      setAnkiAudio(null);
      const rawName = preview.deckName ?? "";
      setAnkiDeckName(rawName && rawName !== "Default" ? rawName : "");
    } catch {
      Alert.alert("Error", "Could not read deck file.");
    }
  }

  async function handleImportExcel(childId: string, childName: string) {
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (result.canceled) return;
    const file = result.assets[0];
    try {
      const preview = await previewExcelDeck(file);
      setImportTarget({ id: childId, name: childName });
      setImportType("excel");
      setExcelFile(file);
      setExcelPreview(preview);
      setExcelFront([0]);
      setExcelBack([Math.min(1, (preview.modelSchemas?.[0]?.fields?.length ?? 2) - 1)]);
      setExcelDeckName("");
    } catch {
      Alert.alert("Error", "Could not read spreadsheet file.");
    }
  }

  async function handleConfirmAnki() {
    if (!ankiFile || !importTarget) return;
    setImportType(null);
    setDeckImporting(true);
    try {
      await importAnkiDeckForChild(
        ankiFile,
        ankiFront,
        ankiBack,
        ankiAudio,
        ankiDeckName.trim() || undefined,
        importTarget.id,
      );
      Alert.alert("Done", `Deck imported for ${importTarget.name}.`);
    } catch {
      Alert.alert("Error", "Import failed. Please try again.");
    } finally {
      setDeckImporting(false);
      resetImportState();
    }
  }

  async function handleConfirmExcel() {
    if (!excelFile || !importTarget) return;
    setImportType(null);
    setDeckImporting(true);
    try {
      await importExcelDeckForChild(
        excelFile,
        excelFront,
        excelBack,
        excelDeckName.trim() || undefined,
        importTarget.id,
      );
      Alert.alert("Done", `Deck imported for ${importTarget.name}.`);
    } catch {
      Alert.alert("Error", "Import failed. Please try again.");
    } finally {
      setDeckImporting(false);
      resetImportState();
    }
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={styles.loading}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
    <ScrollView style={styles.container}>
      
      {/* =========================
         🔥 HEADER CARD
      ========================= */}
      <View style={styles.headerCard}>
        <Text style={styles.title}>Parent Control Center</Text>
        <Text style={styles.subtitle}>
          Manage screen time, learning, and behavior
        </Text>
      </View>

      {/* =========================
         🔥 INSIGHTS (TOP PRIORITY)
      ========================= */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Overview</Text>

        <View style={styles.row}>
          <MetricCard label="Children" value={children.length} />
          <MetricCard
            label="Active Today"
            value={
              data.children?.filter(
                (c: any) => c?.today?.wastedMinutes > 0
              ).length || 0
            }
          />
        </View>
      </View>

      {/* =========================
         🔥 CHILDREN
      ========================= */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Children</Text>

        {data.children?.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No children connected</Text>
            <Text style={styles.emptySubtitle}>
              Generate a code below and link your child's device
            </Text>
          </View>
        ) : (
          data.children.map((child: any) => (
            <ChildCard
              key={child.userId}
              child={child}
              reload={load}
              onImportAnki={() => handleImportAnki(child.userId, child.name || "child")}
              onImportExcel={() => handleImportExcel(child.userId, child.name || "child")}
            />
          ))
        )}
      </View>

      {/* =========================
         🔥 GLOBAL CONTROL
      ========================= */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Global Blocking Intensity</Text>

        <Text style={styles.helper}>
          Controls how aggressively Lucid interrupts scrolling for all children on this account
        </Text>

        <View style={styles.rowWrap}>
          {["soft", "strict"].map((mode) => (
            <Pressable
              key={mode}
              onPress={() => saveParentMode(mode)}
              style={[
                styles.modeBtn,
                focusMode === mode && styles.modeActive,
              ]}
            >
              <Text
                style={{
                  color: focusMode === mode ? "#111" : "#fff",
                  fontWeight: "800",
                }}
              >
                {mode.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* =========================
         🔥 iOS: BLOCK MY OWN DEVICE
      ========================= */}
      {Platform.OS === "ios" && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Block My Own Device</Text>
          <Text style={styles.helper}>
            As a parent, you can also block social apps on this device using the same system.
          </Text>

          <Pressable
            disabled={selfBlockLoading}
            onPress={toggleSelfBlocking}
            style={[
              styles.bigToggle,
              selfBlocking ? styles.toggleOn : styles.toggleOff,
              selfBlockLoading && { opacity: 0.5 },
            ]}
          >
            <Text style={styles.toggleText}>
              {selfBlockLoading
                ? "Updating..."
                : selfBlocking
                ? "🟢 Self-Blocking ON"
                : "🔴 Self-Blocking OFF"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.secondaryBtn}
            onPress={() => router.push("/screens/IOSScreenTimeSetupScreen")}
          >
            <Text style={styles.secondaryBtnText}>Choose Apps to Block</Text>
          </Pressable>
        </View>
      )}

      {/* =========================
         🔥 ANDROID: BLOCK MY OWN DEVICE
      ========================= */}
      {Platform.OS === "android" && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Block My Own Device</Text>
          <Text style={styles.helper}>
            As a parent, you can also block social apps on this device. The
            accessibility service will intercept them just like it does for
            your children.
          </Text>

          <Pressable
            disabled={selfBlockLoading}
            onPress={toggleAndroidSelfBlocking}
            style={[
              styles.bigToggle,
              selfBlocking ? styles.toggleOn : styles.toggleOff,
              selfBlockLoading && { opacity: 0.5 },
            ]}
          >
            <Text style={styles.toggleText}>
              {selfBlockLoading
                ? "Updating..."
                : selfBlocking
                ? "🟢 Self-Blocking ON"
                : "🔴 Self-Blocking OFF"}
            </Text>
          </Pressable>
        </View>
      )}

      {/* =========================
         🧪 TEST MODE
      ========================= */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Test Mode</Text>
        <Text style={styles.helper}>
          Create an active recall test from your child's mastered cards, schedule a notification, and download a PDF report when done.
        </Text>
        <Pressable
          style={styles.primaryBtn}
          onPress={() => router.push("/test")}
        >
          <Text style={styles.primaryBtnText}>Create a Test</Text>
        </Pressable>
      </View>

      {/* =========================
         🔥 ADD CHILD
      ========================= */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Add Child</Text>

        <Text style={styles.helper}>
          Share this code with your child to connect their device
        </Text>

        <Pressable style={styles.primaryBtn} onPress={handleGenerateCode}>
          <Text style={styles.primaryBtnText}>Generate Link Code</Text>
        </Pressable>

        {!!code && (
          <View style={styles.codeBox}>
            <Text style={styles.code}>{code}</Text>
          </View>
        )}
      </View>

      {/* =========================
         🔥 UPGRADE
      ========================= */}
      {maxChildren > 0 && children.length >= maxChildren - 1 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Upgrade</Text>

          <Text style={styles.helper}>
            Add more children and unlock advanced controls
          </Text>

          <UpgradeButton label="Upgrade Family Plan" />
        </View>
      )}
    </ScrollView>

    {/* ANKI FIELD MAPPING MODAL */}
    <Modal
      visible={importType === "anki"}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={resetImportState}
    >
      <AnkiFieldModal
        title="Map Card Fields"
        subtitle={ankiPreview ? `${ankiPreview.totalNotes} notes → ${importTarget?.name}` : ""}
        fields={ankiPreview?.modelSchemas?.[0]?.fields ?? []}
        sample={ankiPreview?.samples?.[0] ?? []}
        frontIndices={ankiFront}
        backIndices={ankiBack}
        audioIndex={ankiAudio}
        onFrontToggle={(i) => setAnkiFront(toggleIndex(ankiFront, i))}
        onBackToggle={(i) => setAnkiBack(toggleIndex(ankiBack, i))}
        onAudioToggle={(i) => setAnkiAudio(ankiAudio === i ? null : i)}
        deckName={ankiDeckName}
        onDeckNameChange={setAnkiDeckName}
        onConfirm={handleConfirmAnki}
        confirmLabel="Import for Child"
        onCancel={resetImportState}
      />
    </Modal>

    {/* EXCEL FIELD MAPPING MODAL */}
    <Modal
      visible={importType === "excel"}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={resetImportState}
    >
      <AnkiFieldModal
        title="Map Spreadsheet Columns"
        subtitle={excelPreview ? `${excelPreview.totalNotes} rows → ${importTarget?.name}` : ""}
        fields={excelPreview?.modelSchemas?.[0]?.fields ?? []}
        sample={excelPreview?.samples?.[0] ?? []}
        frontIndices={excelFront}
        backIndices={excelBack}
        audioIndex={null}
        onFrontToggle={(i) => setExcelFront(toggleIndex(excelFront, i))}
        onBackToggle={(i) => setExcelBack(toggleIndex(excelBack, i))}
        onAudioToggle={() => {}}
        deckName={excelDeckName}
        onDeckNameChange={setExcelDeckName}
        onConfirm={handleConfirmExcel}
        confirmLabel="Import for Child"
        onCancel={resetImportState}
        showAudio={false}
      />
    </Modal>

    {/* IMPORTING SPINNER */}
    {deckImporting && (
      <View style={styles.importOverlay}>
        <ActivityIndicator size="large" color="#D86732" />
        <Text style={{ color: "white", marginTop: 12, fontWeight: "700" }}>Importing deck...</Text>
      </View>
    )}

    </View>
  );
}

/* =========================
   🔥 CHILD CARD
========================= */

const AFTER_SCHOOL_HOURS = [
  { label: "12 PM", value: 12 },
  { label: "1 PM", value: 13 },
  { label: "2 PM", value: 14 },
  { label: "3 PM", value: 15 },
  { label: "4 PM", value: 16 },
];

function ChildCard({ child, reload, onImportAnki, onImportExcel }: any) {
  const [limit, setLimit] = useState(
    String(child.restrictions?.maxDailyMinutes || 60)
  );
  const [unlockMinutes, setUnlockMinutes] = useState(
    String(child.restrictions?.unlockMinutes || 10)
  );
  const [cardsRequired, setCardsRequired] = useState(
    String(child.restrictions?.cardsRequired || 5)
  );
  const [mode, setMode] = useState(child.focusMode || "soft");
  const [afterSchoolEnabled, setAfterSchoolEnabled] = useState(
    Boolean(child.afterSchoolMode?.enabled)
  );
  const [afterSchoolHour, setAfterSchoolHour] = useState(
    child.afterSchoolMode?.startHour ?? 14
  );

  // AI deck generation
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiDeckName, setAiDeckName] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiStatus, setAiStatus] = useState("");

  async function handleGenerateAIDeck() {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    setAiStatus("Generating...");
    try {
      await generateDeckForChild(
        aiPrompt.trim(),
        "basic",
        aiDeckName.trim() || undefined,
        child.userId,
      );
      setAiStatus("✅ Deck created for " + (child.name || "child"));
      setAiPrompt("");
      setAiDeckName("");
    } catch {
      setAiStatus("❌ Generation failed");
    } finally {
      setAiGenerating(false);
    }
  }

  async function save() {
    await updateChildRestrictions({
      childId: child.userId,
      restrictions: {
        maxDailyMinutes: Number(limit),
        unlockMinutes: Number(unlockMinutes),
        cardsRequired: Number(cardsRequired),
      },
      focusMode: mode,
      afterSchoolMode: {
        enabled: afterSchoolEnabled,
        startHour: afterSchoolHour,
      },
    });

    reload();
  }

  return (
    <View style={styles.childCard}>
      <Text style={styles.childName}>{child.name || "Unnamed Child"}</Text>

      {child.isAppActive === false && (
        <View style={styles.uninstalledBanner}>
          <Text style={styles.uninstalledTitle}>⚠️ App Not Detected</Text>
          <Text style={styles.uninstalledBody}>
            Last seen {timeAgoLabel(child.lastSeen)} — app may have been uninstalled.
          </Text>
        </View>
      )}

      <Text style={styles.meta}>
        🔥 Streak: {child.streak?.currentStreak || 0}
      </Text>

      <Text style={styles.meta}>
        📱 Usage: {child.today?.wastedMinutes || 0} min
      </Text>

      <Text
        style={{
          color: child.limitReached ? "#D86732" : "#F8C373",
          fontWeight: "800",
          marginTop: 6,
        }}
      >
        {child.limitReached ? "Limit reached" : "Within limit"}
      </Text>

      <Text style={styles.label}>Daily Limit (minutes)</Text>

      <TextInput
        value={limit}
        onChangeText={setLimit}
        keyboardType="numeric"
        style={styles.input}
      />

      <Text style={styles.label}>Unlock Duration (minutes per session)</Text>

      <TextInput
        value={unlockMinutes}
        onChangeText={setUnlockMinutes}
        keyboardType="numeric"
        style={styles.input}
      />

      <Text style={styles.label}>Cards Required per Session</Text>

      <TextInput
        value={cardsRequired}
        onChangeText={setCardsRequired}
        keyboardType="numeric"
        style={styles.input}
      />

      <Text style={styles.label}>Blocking Intensity</Text>

      <View style={styles.rowWrap}>
        {["soft", "strict"].map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            style={[
              styles.modeBtn,
              mode === m && styles.modeActive,
            ]}
          >
            <Text style={{ color: mode === m ? "#111" : "#fff" }}>
              {m}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.afterSchoolSection}>
        <View style={styles.afterSchoolHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.afterSchoolTitle}>After School Mode</Text>
            <Text style={styles.afterSchoolDesc}>
              Blocking and flashcards only activate after the chosen time
            </Text>
          </View>
          <Pressable
            onPress={() => setAfterSchoolEnabled((v) => !v)}
            style={[
              styles.afterSchoolToggle,
              afterSchoolEnabled ? styles.toggleOn : styles.toggleOff,
            ]}
          >
            <Text style={styles.toggleText}>
              {afterSchoolEnabled ? "ON" : "OFF"}
            </Text>
          </Pressable>
        </View>

        {afterSchoolEnabled && (
          <>
            <Text style={styles.label}>Blocking starts at</Text>
            <View style={styles.rowWrap}>
              {AFTER_SCHOOL_HOURS.map((h) => (
                <Pressable
                  key={h.value}
                  onPress={() => setAfterSchoolHour(h.value)}
                  style={[
                    styles.modeBtn,
                    afterSchoolHour === h.value && styles.modeActive,
                  ]}
                >
                  <Text style={{ color: afterSchoolHour === h.value ? "#111" : "#fff", fontWeight: "700" }}>
                    {h.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </View>

      {/* ── DECK MANAGEMENT ── */}
      <View style={styles.deckSection}>
        <Text style={styles.deckSectionTitle}>Add Decks for {child.name || "Child"}</Text>

        {/* AI Generate */}
        <TextInput
          value={aiDeckName}
          onChangeText={setAiDeckName}
          placeholder="Deck name (optional)"
          placeholderTextColor="#555"
          style={styles.input}
        />
        <TextInput
          value={aiPrompt}
          onChangeText={setAiPrompt}
          placeholder="What should the deck be about?"
          placeholderTextColor="#555"
          multiline
          numberOfLines={3}
          style={[styles.input, { minHeight: 72, textAlignVertical: "top" }]}
        />
        <Pressable
          style={[styles.deckBtn, (!aiPrompt.trim() || aiGenerating) && { opacity: 0.5 }]}
          onPress={handleGenerateAIDeck}
          disabled={!aiPrompt.trim() || aiGenerating}
        >
          <Text style={styles.deckBtnText}>
            {aiGenerating ? "Generating..." : "Generate AI Deck"}
          </Text>
        </Pressable>
        {!!aiStatus && <Text style={styles.deckStatus}>{aiStatus}</Text>}

        {/* Import buttons */}
        <View style={styles.importRow}>
          <Pressable style={styles.importBtn} onPress={onImportAnki}>
            <Text style={styles.importBtnText}>Import .apkg</Text>
          </Pressable>
          <Pressable style={styles.importBtn} onPress={onImportExcel}>
            <Text style={styles.importBtnText}>Import .xlsx</Text>
          </Pressable>
        </View>
      </View>

      <Pressable style={styles.primaryBtn} onPress={save}>
        <Text style={styles.primaryBtnText}>Save Changes</Text>
      </Pressable>
    </View>
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

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: LucidTheme.bg,
  },

  loading: {
    color: "#A9BDDB",
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

  childCard: {
    backgroundColor: "#0e1424",
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
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

  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  childName: {
    color: "white",
    fontSize: 18,
    fontWeight: "800",
  },

  meta: {
    color: "#A9BDDB",
    marginTop: 4,
  },

  label: {
    color: "#A9BDDB",
    marginTop: 10,
    fontSize: 12,
  },

  input: {
    backgroundColor: "#151820",
    color: "white",
    padding: 10,
    borderRadius: 10,
    marginTop: 6,
  },

  primaryBtn: {
    backgroundColor: "#D86732",
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
  },

  primaryBtnText: {
    textAlign: "center",
    fontWeight: "800",
    color: "#111",
  },

  codeBox: {
    marginTop: 12,
    backgroundColor: "#0e1424",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  code: {
    color: "#D86732",
    fontSize: 22,
    fontWeight: "800",
  },

  emptyState: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#0e1424",
    alignItems: "center",
  },

  emptyTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "800",
  },

  emptySubtitle: {
    color: "#A9BDDB",
    marginTop: 6,
    textAlign: "center",
  },

  modeBtn: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#151820",
  },

  modeActive: {
    backgroundColor: "#D86732",
  },

  bigToggle: {
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 6,
    marginBottom: 8,
  },

  toggleOn: {
    backgroundColor: "#1DB954",
  },

  toggleOff: {
    backgroundColor: "#FF4D4D",
  },

  toggleText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },

  secondaryBtn: {
    backgroundColor: "#151820",
    padding: 14,
    borderRadius: 12,
    marginTop: 4,
  },

  secondaryBtnText: {
    color: "white",
    textAlign: "center",
    fontWeight: "700",
  },

  uninstalledBanner: {
    backgroundColor: "#3b0d0d",
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#ef4444",
  },

  uninstalledTitle: {
    color: "#fca5a5",
    fontWeight: "800",
    fontSize: 13,
    marginBottom: 2,
  },

  uninstalledBody: {
    color: "#fca5a5",
    fontSize: 12,
    lineHeight: 17,
  },

  afterSchoolSection: {
    backgroundColor: "#151820",
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },

  afterSchoolHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  afterSchoolTitle: {
    color: "white",
    fontWeight: "800",
    fontSize: 14,
  },

  afterSchoolDesc: {
    color: "#A9BDDB",
    fontSize: 11,
    marginTop: 2,
  },

  afterSchoolToggle: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 52,
    alignItems: "center",
  },

  deckSection: {
    backgroundColor: "#151820",
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },

  deckSectionTitle: {
    color: "#D86732",
    fontWeight: "800",
    fontSize: 13,
    marginBottom: 10,
  },

  deckBtn: {
    backgroundColor: "#D86732",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },

  deckBtnText: {
    color: "#111",
    fontWeight: "800",
    fontSize: 13,
  },

  deckStatus: {
    color: "#A9BDDB",
    fontSize: 12,
    marginTop: 6,
  },

  importRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },

  importBtn: {
    flex: 1,
    backgroundColor: "#1b2540",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2a2e36",
  },

  importBtnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 12,
  },

  importOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
});