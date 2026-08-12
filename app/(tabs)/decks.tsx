import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
  Modal,
  Switch,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";

import { generateDeck, importAnkiDeck, previewAnkiDeck, remapDeckFields, CardType, AnkiPreview } from "../../services/aiDeckService";
import { useRefocusStore } from "../../store/useRefocusStore";
import {
  saveSelectedDeck,
  saveShuffleMode,
  loadShuffleMode,
  saveShuffleDeckIds,
  loadShuffleDeckIds,
} from "../../services/deckStorage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../services/api";
import UpgradeButton from "../../components/UpgradeButton";
import { refreshUserContext } from "../../services/contextService";

/* ─────────────────────────────────────────────
   Shared Anki field-mapping modal component
───────────────────────────────────────────── */
function AnkiFieldModal({
  title, subtitle, fields, sample,
  frontIndices, backIndices, audioIndex,
  onFrontToggle, onBackToggle, onAudioToggle,
  onConfirm, confirmLabel, onCancel,
}: {
  title: string; subtitle: string;
  fields: string[];
  sample: { name: string; value: string }[];
  frontIndices: number[]; backIndices: number[]; audioIndex: number | null;
  onFrontToggle: (i: number) => void;
  onBackToggle:  (i: number) => void;
  onAudioToggle: (i: number) => void;
  onConfirm: () => void; confirmLabel: string; onCancel: () => void;
}) {
  const frontPreview = frontIndices.map((i) => sample[i]?.value).filter(Boolean).join(" · ");
  const backPreview  = backIndices.map((i) => sample[i]?.value).filter(Boolean).join("\n");

  return (
    <View style={{ flex: 1, backgroundColor: "#0e1424" }}>
      <View style={{ padding: 20, paddingTop: 56, borderBottomWidth: 1, borderBottomColor: "rgba(169,189,219,0.1)" }}>
        <Text style={{ color: "white", fontSize: 20, fontWeight: "800" }}>{title}</Text>
        {!!subtitle && <Text style={{ color: "#A9BDDB", marginTop: 4, fontSize: 13 }}>{subtitle}</Text>}
      </View>

      <ScrollView style={{ flex: 1, padding: 20 }}>
        <Text style={{ color: "#A9BDDB", fontSize: 13, marginBottom: 16, lineHeight: 18 }}>
          Select one or more fields per side. Multiple fields are joined together on the card.
        </Text>

        {/* FRONT — multi-select */}
        <Text style={{ color: "#D86732", fontWeight: "700", marginBottom: 8 }}>Front of Card</Text>
        {fields.map((name, i) => {
          const selected = frontIndices.includes(i);
          return (
            <Pressable key={`f${i}`} onPress={() => onFrontToggle(i)} style={{
              flexDirection: "row", alignItems: "flex-start",
              backgroundColor: selected ? "rgba(216,103,50,0.15)" : "#161b22",
              borderWidth: 1, borderColor: selected ? "#D86732" : "#2a2e36",
              borderRadius: 10, padding: 12, marginBottom: 8,
            }}>
              <View style={{
                width: 18, height: 18, borderRadius: 3, borderWidth: 2,
                borderColor: selected ? "#D86732" : "#555",
                backgroundColor: selected ? "#D86732" : "transparent",
                marginRight: 10, marginTop: 1, alignItems: "center", justifyContent: "center",
              }}>
                {selected && <Text style={{ color: "#111", fontSize: 11, fontWeight: "900" }}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: selected ? "#D86732" : "white", fontWeight: "700", fontSize: 13 }}>{name}</Text>
                {sample[i]?.value ? <Text style={{ color: "#A9BDDB", fontSize: 12, marginTop: 2 }} numberOfLines={2}>{sample[i].value}</Text> : null}
              </View>
            </Pressable>
          );
        })}

        {/* BACK — multi-select */}
        <Text style={{ color: "#6EADEB", fontWeight: "700", marginTop: 16, marginBottom: 8 }}>Back of Card</Text>
        {fields.map((name, i) => {
          const selected = backIndices.includes(i);
          return (
            <Pressable key={`b${i}`} onPress={() => onBackToggle(i)} style={{
              flexDirection: "row", alignItems: "flex-start",
              backgroundColor: selected ? "rgba(110,173,235,0.15)" : "#161b22",
              borderWidth: 1, borderColor: selected ? "#6EADEB" : "#2a2e36",
              borderRadius: 10, padding: 12, marginBottom: 8,
            }}>
              <View style={{
                width: 18, height: 18, borderRadius: 3, borderWidth: 2,
                borderColor: selected ? "#6EADEB" : "#555",
                backgroundColor: selected ? "#6EADEB" : "transparent",
                marginRight: 10, marginTop: 1, alignItems: "center", justifyContent: "center",
              }}>
                {selected && <Text style={{ color: "#111", fontSize: 11, fontWeight: "900" }}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: selected ? "#6EADEB" : "white", fontWeight: "700", fontSize: 13 }}>{name}</Text>
                {sample[i]?.value ? <Text style={{ color: "#A9BDDB", fontSize: 12, marginTop: 2 }} numberOfLines={2}>{sample[i].value}</Text> : null}
              </View>
            </Pressable>
          );
        })}

        {/* AUDIO — optional single pick */}
        <Text style={{ color: "#A9BDDB", fontWeight: "700", marginTop: 16, marginBottom: 4 }}>Audio Field <Text style={{ fontWeight: "400", fontSize: 12 }}>(optional)</Text></Text>
        <Text style={{ color: "#555", fontSize: 12, marginBottom: 8 }}>Pick the field containing [sound:…] tags. Plays on the front of each card.</Text>
        {fields.map((name, i) => {
          const selected = audioIndex === i;
          return (
            <Pressable key={`a${i}`} onPress={() => onAudioToggle(i)} style={{
              flexDirection: "row", alignItems: "center",
              backgroundColor: selected ? "rgba(80,200,120,0.12)" : "#161b22",
              borderWidth: 1, borderColor: selected ? "#50c878" : "#2a2e36",
              borderRadius: 10, padding: 12, marginBottom: 6,
            }}>
              <View style={{
                width: 18, height: 18, borderRadius: 9, borderWidth: 2,
                borderColor: selected ? "#50c878" : "#555",
                backgroundColor: selected ? "#50c878" : "transparent",
                marginRight: 10,
              }} />
              <Text style={{ color: selected ? "#50c878" : "#A9BDDB", fontWeight: selected ? "700" : "400", fontSize: 13 }}>{name}</Text>
            </Pressable>
          );
        })}

        {/* Live preview */}
        {sample.length > 0 && (frontIndices.length > 0 || backIndices.length > 0) && (
          <View style={{ marginTop: 24, backgroundColor: "#161b22", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#2a2e36" }}>
            <Text style={{ color: "#D86732", fontWeight: "700", fontSize: 11, marginBottom: 10, letterSpacing: 1 }}>PREVIEW</Text>
            <Text style={{ color: "#888", fontSize: 11, marginBottom: 4 }}>FRONT</Text>
            <Text style={{ color: "white", fontSize: 14, marginBottom: 12 }} numberOfLines={4}>{frontPreview || "—"}</Text>
            <View style={{ height: 1, backgroundColor: "#2a2e36", marginBottom: 12 }} />
            <Text style={{ color: "#888", fontSize: 11, marginBottom: 4 }}>BACK</Text>
            <Text style={{ color: "white", fontSize: 14 }} numberOfLines={6}>{backPreview || "—"}</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={{ padding: 20, gap: 10 }}>
        <Pressable
          onPress={onConfirm}
          disabled={frontIndices.length === 0 || backIndices.length === 0}
          style={{
            backgroundColor: frontIndices.length > 0 && backIndices.length > 0 ? "#D86732" : "#2a2e36",
            padding: 16, borderRadius: 14, alignItems: "center",
          }}
        >
          <Text style={{ color: frontIndices.length > 0 && backIndices.length > 0 ? "#111" : "#555", fontWeight: "800", fontSize: 16 }}>{confirmLabel}</Text>
        </Pressable>
        <Pressable onPress={onCancel} style={{ padding: 14, alignItems: "center" }}>
          <Text style={{ color: "#A9BDDB", fontWeight: "600" }}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function DecksScreen() {
  const [prompt, setPrompt] = useState("");
  const [cardType, setCardType] = useState<CardType>("basic");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [decks, setDecks] = useState<any[]>([]);

  const {
    selectedDeckId,
    setSelectedDeck,
    shuffleMode,
    shuffleDeckIds,
    setShuffleMode,
    toggleShuffleDeck,
    setShuffleDeckIds,
  } = useRefocusStore();
  const { plan, adMode, limits, context } = useRefocusStore();

  const usageDecks = context?.settings?.usage?.decksCreated ?? context?.usage?.decksCreated ?? 0;
  const usageCards = context?.settings?.usage?.cardsCreated ?? context?.usage?.cardsCreated ?? 0;

  const maxDecks = limits?.maxDecks ?? 2;
  const maxCards = limits?.maxCards ?? 100;

  const actualDeckCount = decks.length;

  const totalCardsAcrossDecks = useMemo(() => {
    return decks.reduce((sum, deck) => {
      const count =
        deck.cardCount ??
        deck.cardsCount ??
        deck.totalCards ??
        deck.count ??
        0;
      return sum + count;
    }, 0);
  }, [decks]);

  const displayDeckCount = Math.max(usageDecks, actualDeckCount);
  const displayCardCount = Math.max(usageCards, totalCardsAcrossDecks);

  const isPaidUser = plan !== null && plan !== "free";

  // Anki field-mapping modal state (import)
  const [pendingFile, setPendingFile] = useState<any>(null);
  const [ankiPreview, setAnkiPreview] = useState<AnkiPreview | null>(null);
  const [frontFieldIndices, setFrontFieldIndices] = useState<number[]>([0]);
  const [backFieldIndices, setBackFieldIndices] = useState<number[]>([1]);
  const [audioFieldIndex, setAudioFieldIndex] = useState<number | null>(null);
  const [fieldModalVisible, setFieldModalVisible] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  // Remap modal state (paid users, existing anki decks)
  const [remapDeck, setRemapDeck] = useState<any>(null);
  const [remapFront, setRemapFront] = useState<number[]>([0]);
  const [remapBack, setRemapBack] = useState<number[]>([1]);
  const [remapAudio, setRemapAudio] = useState<number | null>(null);
  const [remapLoading, setRemapLoading] = useState(false);

  const [editingDeck, setEditingDeck] = useState<any>(null);
  const [deckCards, setDeckCards] = useState<any[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [newCardFront, setNewCardFront] = useState("");
  const [newCardBack, setNewCardBack] = useState("");
  const [addingCard, setAddingCard] = useState(false);
  const [cardStatus, setCardStatus] = useState("");

  const shouldShowAdsUpgrade =
    plan === "free" &&
    adMode !== "ad_supported" &&
    displayDeckCount >= Math.max(1, maxDecks - 1);

  useEffect(() => {
    loadDecks();
    loadPersistedShuffleState();
  }, []);

  async function loadPersistedShuffleState() {
    const [mode, ids] = await Promise.all([loadShuffleMode(), loadShuffleDeckIds()]);
    setShuffleMode(mode);
    setShuffleDeckIds(ids);
  }

  async function loadDecks() {
    try {
      const res = await api.get("/decks");
      setDecks(res.data.decks || res.data || []);
    } catch (err) {
      console.error("Failed to load decks", err);
      setStatus("❌ Failed to load decks");
    }
  }

  async function selectDeck(deckId: string) {
    try {
      setSelectedDeck(deckId);
      await saveSelectedDeck(deckId);
      setStatus("✅ Deck selected");
    } catch (err) {
      console.error("Failed to save selected deck", err);
      setStatus("❌ Failed to select deck");
    }
  }

  async function handleShuffleModeToggle(enabled: boolean) {
    setShuffleMode(enabled);
    await saveShuffleMode(enabled);
    if (!enabled) {
      setStatus("");
    }
  }

  async function handleShuffleDeckToggle(deckId: string) {
    const next = shuffleDeckIds.includes(deckId)
      ? shuffleDeckIds.filter((id) => id !== deckId)
      : [...shuffleDeckIds, deckId];
    setShuffleDeckIds(next);
    await saveShuffleDeckIds(next);
  }

  async function enableAdsMode() {
    try {
      setLoading(true);
      setStatus("Enabling more decks with ads...");

      await api.post("/ad-mode/enable-ad-mode");
      await refreshUserContext();

      setStatus("✅ Ads enabled — more decks unlocked");
    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to enable ads mode");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    if (!prompt.trim()) return;

    const state = useRefocusStore.getState();
    const currentMaxDecks = state.limits?.maxDecks ?? 2;
    const liveDeckCount = decks.length;

    if (liveDeckCount >= currentMaxDecks) {
      setStatus("⚠️ Deck limit reached");
      return;
    }

    setLoading(true);
    setStatus("Generating...");

    try {
      await generateDeck(prompt.trim(), cardType);
      await refreshUserContext();
      await loadDecks();

      setStatus("✅ Deck created");
      setPrompt("");
    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to generate");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteDeck(deckId: string, deckName: string) {
    Alert.alert(
      "Delete Deck",
      `Delete "${deckName}"? This will permanently remove the deck and all its cards.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              setStatus("Deleting deck...");
              await api.delete(`/decks/${deckId}`);
              if (selectedDeckId === deckId) {
                setSelectedDeck(null);
                await AsyncStorage.removeItem("selectedDeckId");
              }
              await Promise.all([loadDecks(), refreshUserContext()]);
              setStatus("✅ Deck deleted");
            } catch (err) {
              console.error(err);
              setStatus("❌ Failed to delete deck");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }

  async function handleUpload() {
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (result.canceled) return;

    const file = result.assets[0];
    const state = useRefocusStore.getState();
    const currentMaxDecks = state.limits?.maxDecks ?? 2;

    if (decks.length >= currentMaxDecks) {
      setStatus("⚠️ Deck limit reached");
      return;
    }

    setPreviewing(true);
    setStatus("Reading deck...");

    try {
      const preview = await previewAnkiDeck(file);
      const fields = preview.modelSchemas?.[0]?.fields ?? [];
      setPendingFile(file);
      setAnkiPreview(preview);
      setFrontFieldIndices([0]);
      setBackFieldIndices([Math.min(1, fields.length - 1)]);
      setAudioFieldIndex(null);
      setFieldModalVisible(true);
      setStatus("");
    } catch (err) {
      console.error(err);
      setStatus("❌ Could not read deck");
    } finally {
      setPreviewing(false);
    }
  }

  async function handleConfirmImport() {
    if (!pendingFile) return;
    setFieldModalVisible(false);
    setLoading(true);
    setStatus("Importing...");

    try {
      await importAnkiDeck(pendingFile, frontFieldIndices, backFieldIndices, audioFieldIndex);
      await refreshUserContext();
      await loadDecks();
      setStatus("✅ Deck imported");
    } catch (err: any) {
      console.error(err);
      setStatus("❌ Upload failed");
    } finally {
      setLoading(false);
      setPendingFile(null);
      setAnkiPreview(null);
    }
  }

  function openRemapModal(deck: any) {
    setRemapDeck(deck);
    setRemapFront(deck.frontFieldIndices ?? [0]);
    setRemapBack(deck.backFieldIndices ?? [1]);
    setRemapAudio(deck.audioFieldIndex ?? null);
  }

  async function handleConfirmRemap() {
    if (!remapDeck) return;
    setRemapLoading(true);
    try {
      await remapDeckFields(remapDeck._id, remapFront, remapBack, remapAudio);
      setRemapDeck(null);
      setStatus("✅ Fields remapped");
    } catch (err) {
      console.error(err);
      setStatus("❌ Remap failed");
    } finally {
      setRemapLoading(false);
    }
  }

  function toggleIndex(arr: number[], idx: number): number[] {
    return arr.includes(idx) ? arr.filter((i) => i !== idx) : [...arr, idx];
  }

  async function openEditDeck(deck: any) {
    setEditingDeck(deck);
    setDeckCards([]);
    setCardStatus("");
    setNewCardFront("");
    setNewCardBack("");
    setCardsLoading(true);
    try {
      const res = await api.get(`/cards/${deck._id}`);
      setDeckCards(res.data.cards || []);
    } catch (err) {
      console.error("Failed to load cards", err);
      setCardStatus("❌ Failed to load cards");
    } finally {
      setCardsLoading(false);
    }
  }

  function closeEditDeck() {
    setEditingDeck(null);
    setDeckCards([]);
    setNewCardFront("");
    setNewCardBack("");
    setCardStatus("");
  }

  async function handleAddCard() {
    if (!newCardFront.trim() || !newCardBack.trim()) return;
    setAddingCard(true);
    setCardStatus("");
    try {
      const res = await api.post("/cards", {
        deckId: editingDeck._id,
        front: newCardFront.trim(),
        back: newCardBack.trim(),
      });
      setDeckCards((prev) => [...prev, res.data.card]);
      setNewCardFront("");
      setNewCardBack("");
      setCardStatus("✅ Card added");
      setDecks((prev) =>
        prev.map((d) =>
          d._id === editingDeck._id
            ? { ...d, cardCount: (d.cardCount ?? 0) + 1 }
            : d
        )
      );
      await refreshUserContext();
    } catch (err: any) {
      if (err?.response?.data?.upgradeRequired) {
        setCardStatus("⚠️ Card limit reached — upgrade to add more");
      } else {
        setCardStatus("❌ Failed to add card");
      }
    } finally {
      setAddingCard(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0e1424" }}
      contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
    >
      <Text style={{ color: "white", fontSize: 28, fontWeight: "800" }}>
        Decks
      </Text>

      {/* USAGE SUMMARY */}
      <View
        style={{
          marginTop: 18,
          backgroundColor: "#161b22",
          borderWidth: 1,
          borderColor: "rgba(169, 189, 219, 0.12)",
          borderRadius: 18,
          padding: 16,
        }}
      >
        <Text style={{ color: "#A9BDDB", fontSize: 12, fontWeight: "700" }}>
          CURRENT USAGE
        </Text>

        <View
          style={{
            flexDirection: "row",
            gap: 12,
            marginTop: 12,
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "#1b2540",
              borderRadius: 14,
              padding: 14,
            }}
          >
            <Text style={{ color: "#A9BDDB", fontSize: 12 }}>Decks</Text>
            <Text style={{ color: "white", fontSize: 22, fontWeight: "800", marginTop: 4 }}>
              {displayDeckCount} / {maxDecks}
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: "#1b2540",
              borderRadius: 14,
              padding: 14,
            }}
          >
            <Text style={{ color: "#A9BDDB", fontSize: 12 }}>Cards</Text>
            <Text style={{ color: "white", fontSize: 22, fontWeight: "800", marginTop: 4 }}>
              {displayCardCount} / {maxCards}
            </Text>
          </View>
        </View>

        <Text style={{ color: "#A9BDDB", marginTop: 12, fontSize: 13 }}>
          Plan: <Text style={{ color: "white", fontWeight: "700" }}>{plan || "free"}</Text>
          {"  "}•{"  "}
          Ads mode:{" "}
          <Text style={{ color: "white", fontWeight: "700" }}>
            {adMode === "ad_supported" ? "enabled" : "off"}
          </Text>
        </Text>
      </View>

      {/* AI GENERATE */}
      <Text style={{ color: "#D86732", marginTop: 24, fontWeight: "700" }}>
        Generate with AI
      </Text>

      <View
        style={{
          marginTop: 10,
          backgroundColor: "#161b22",
          borderWidth: 1,
          borderColor: "#2a2e36",
          borderRadius: 18,
          padding: 16,
        }}
      >
        <Text style={{ color: "#A9BDDB", marginBottom: 10, fontSize: 13 }}>
          Paste content like notes, transcripts, articles, study guides, homework,
          ChatGPT outputs, PDFs copied as text, or vocabulary lists.
        </Text>

        <TextInput
          value={prompt}
          onChangeText={setPrompt}
          multiline
          textAlignVertical="top"
          placeholder={`Paste anything here...

Examples:
• YouTube transcript
• Notes
• Article
• Schoolwork
• ChatGPT output
• Vocabulary list
• Study guide
• Class summary`}
          placeholderTextColor="#777"
          style={{
            minHeight: 160,
            borderWidth: 1,
            borderColor: "#2a2e36",
            backgroundColor: "#0f172a",
            color: "white",
            padding: 14,
            borderRadius: 12,
          }}
        />

        {/* CARD TYPE SELECTOR */}
        <Text style={{ color: "#A9BDDB", fontSize: 12, marginTop: 14, marginBottom: 8 }}>
          Card Type
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(
            [
              { key: "basic", label: "Basic" },
              { key: "multiple_choice", label: "Multiple Choice" },
              { key: "cloze", label: "Cloze" },
              { key: "mixed", label: "Mixed" },
            ] as { key: CardType; label: string }[]
          ).map(({ key, label }) => {
            const locked = !isPaidUser && key !== "basic";
            const selected = cardType === key;
            return (
              <Pressable
                key={key}
                onPress={() => {
                  if (locked) {
                    Alert.alert("Paid Feature", "Upgrade to unlock Multiple Choice, Cloze, and Mixed card types.");
                    return;
                  }
                  setCardType(key);
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: selected ? "#D86732" : "#2a2e36",
                  backgroundColor: selected ? "#2a1800" : "#0f172a",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Text style={{ color: selected ? "#D86732" : locked ? "#555" : "#A9BDDB", fontSize: 13 }}>
                  {label}
                </Text>
                {locked && <Text style={{ fontSize: 11 }}>🔒</Text>}
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={handleGenerate}
          style={{
            backgroundColor: "#D86732",
            padding: 16,
            borderRadius: 14,
            marginTop: 14,
          }}
        >
          <Text style={{ textAlign: "center", fontWeight: "800", color: "#111" }}>
            Generate Deck
          </Text>
        </Pressable>
      </View>

      {/* IMPORT */}
      <Text style={{ color: "#D86732", marginTop: 30, fontWeight: "700" }}>
        Import Existing Deck
      </Text>

      <View
        style={{
          marginTop: 10,
          backgroundColor: "#161b22",
          borderWidth: 1,
          borderColor: "#2a2e36",
          borderRadius: 18,
          padding: 16,
        }}
      >
        <Text style={{ color: "#A9BDDB", fontSize: 13 }}>
          Upload an Anki deck (.apkg) to bring your existing study system into Lucid.
        </Text>

        <Pressable
          onPress={handleUpload}
          style={{
            backgroundColor: "#1b2540",
            padding: 16,
            borderRadius: 14,
            marginTop: 12,
          }}
        >
          <Text style={{ color: "white", textAlign: "center", fontWeight: "700" }}>
            Upload .apkg
          </Text>
        </Pressable>
      </View>

      {/* ADS / UPGRADE BLOCK */}
      {shouldShowAdsUpgrade && (
        <View
          style={{
            marginTop: 20,
            backgroundColor: "#161b22",
            borderWidth: 1,
            borderColor: "rgba(216, 103, 50, 0.25)",
            borderRadius: 18,
            padding: 16,
          }}
        >
          <Text style={{ color: "white", fontSize: 18, fontWeight: "800" }}>
            Need more room?
          </Text>

          <Text style={{ color: "#A9BDDB", marginTop: 8, lineHeight: 20 }}>
            You’re close to your free deck limit. Keep using more decks for free by
            enabling ads after study sessions, or upgrade for unlimited access with no ads.
          </Text>

          <Pressable
            onPress={enableAdsMode}
            style={{
              backgroundColor: "#1b2540",
              padding: 16,
              borderRadius: 12,
              marginTop: 14,
              marginBottom: 10,
            }}
          >
            <Text style={{ color: "white", textAlign: "center", fontWeight: "700" }}>
              Use More Decks (with Ads)
            </Text>
          </Pressable>

          <UpgradeButton label="Go Unlimited (No Ads)" />
        </View>
      )}

      {/* ACTIVE ADS MODE BLOCK */}
      {plan === "free" && adMode === "ad_supported" && (
        <View
          style={{
            marginTop: 20,
            backgroundColor: "#161b22",
            borderWidth: 1,
            borderColor: "rgba(169, 189, 219, 0.12)",
            borderRadius: 18,
            padding: 16,
          }}
        >
          <Text style={{ color: "white", fontWeight: "800", fontSize: 16 }}>
            More Decks Mode Enabled
          </Text>
          <Text style={{ color: "#A9BDDB", marginTop: 8, lineHeight: 20 }}>
            You can use more decks on the free tier. Ads will show after study sessions
            instead of during deck creation.
          </Text>
        </View>
      )}

      {/* YOUR DECKS */}
      <Text style={{ color: "#D86732", marginTop: 30, fontWeight: "700" }}>
        Your Decks
      </Text>

      {/* SHUFFLE MODE TOGGLE — paid users only */}
      {isPaidUser && (
        <View
          style={{
            marginTop: 12,
            backgroundColor: "#161b22",
            borderWidth: 1,
            borderColor: shuffleMode
              ? "rgba(110, 173, 235, 0.35)"
              : "rgba(169, 189, 219, 0.12)",
            borderRadius: 14,
            padding: 14,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>
              Shuffle Mode
            </Text>
            <Text style={{ color: "#A9BDDB", fontSize: 12, marginTop: 3 }}>
              {shuffleMode
                ? shuffleDeckIds.length === 0
                  ? "Select decks below to mix into one session"
                  : `${shuffleDeckIds.length} deck${shuffleDeckIds.length !== 1 ? "s" : ""} selected — cards will shuffle together`
                : "Mix cards from multiple decks in one session"}
            </Text>
          </View>
          <Switch
            value={shuffleMode}
            onValueChange={handleShuffleModeToggle}
            trackColor={{ false: "#2a2e36", true: "#6EADEB" }}
            thumbColor={shuffleMode ? "#fff" : "#A9BDDB"}
          />
        </View>
      )}

      {decks.length === 0 ? (
        <View
          style={{
            marginTop: 12,
            backgroundColor: "#1b2540",
            padding: 16,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: "#A9BDDB" }}>
            No decks yet. Generate one with AI or upload an Anki deck to get started.
          </Text>
        </View>
      ) : (
        decks.map((deck: any) => {
          const deckCardCount =
            deck.cardCount ??
            deck.cardsCount ??
            deck.totalCards ??
            deck.count ??
            0;

          const isSingleSelected = !shuffleMode && selectedDeckId === deck._id;
          const isShuffleSelected = shuffleMode && shuffleDeckIds.includes(deck._id);
          const isActive = isSingleSelected || isShuffleSelected;

          const bgColor = isSingleSelected
            ? "#D86732"
            : isShuffleSelected
            ? "#1a2e4a"
            : "#1b2540";

          const borderColor = isShuffleSelected
            ? "rgba(110, 173, 235, 0.5)"
            : "transparent";

          return (
            <View
              key={deck._id}
              style={{
                flexDirection: "row",
                backgroundColor: bgColor,
                borderRadius: 12,
                marginTop: 10,
                overflow: "hidden",
                borderWidth: isShuffleSelected ? 1.5 : 0,
                borderColor,
              }}
            >
              <Pressable
                onPress={() =>
                  shuffleMode
                    ? handleShuffleDeckToggle(deck._id)
                    : selectDeck(deck._id)
                }
                style={{ flex: 1, padding: 14, flexDirection: "row", alignItems: "center" }}
              >
                {shuffleMode && (
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 2,
                      borderColor: isShuffleSelected ? "#6EADEB" : "#4a5568",
                      backgroundColor: isShuffleSelected ? "#6EADEB" : "transparent",
                      marginRight: 12,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isShuffleSelected && (
                      <Text style={{ color: "#0e1424", fontSize: 13, fontWeight: "800" }}>✓</Text>
                    )}
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: isSingleSelected ? "#111" : "#fff",
                      fontWeight: "700",
                      fontSize: 15,
                    }}
                  >
                    {deck.name}
                  </Text>
                  <Text
                    style={{
                      color: isSingleSelected ? "#2a2a2a" : "#A9BDDB",
                      marginTop: 6,
                      fontSize: 12,
                    }}
                  >
                    {deckCardCount} cards
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => openEditDeck(deck)}
                style={{
                  justifyContent: "center",
                  alignItems: "center",
                  paddingHorizontal: 14,
                  borderLeftWidth: 1,
                  borderLeftColor: isSingleSelected
                    ? "rgba(0,0,0,0.15)"
                    : "rgba(255,255,255,0.06)",
                }}
              >
                <Text
                  style={{
                    color: isSingleSelected ? "#2a2a2a" : "#A9BDDB",
                    fontSize: 16,
                  }}
                >
                  ✏️
                </Text>
              </Pressable>

              {isPaidUser && deck.sourceType === "anki_import" && deck.fieldSchema?.length > 0 && (
                <Pressable
                  onPress={() => openRemapModal(deck)}
                  style={{
                    justifyContent: "center",
                    alignItems: "center",
                    paddingHorizontal: 12,
                    borderLeftWidth: 1,
                    borderLeftColor: isSingleSelected
                      ? "rgba(0,0,0,0.15)"
                      : "rgba(255,255,255,0.06)",
                  }}
                >
                  <Text style={{ color: isSingleSelected ? "#2a2a2a" : "#6EADEB", fontSize: 15 }}>⇄</Text>
                </Pressable>
              )}

              {isPaidUser && (
                <Pressable
                  onPress={() => handleDeleteDeck(deck._id, deck.name)}
                  style={{
                    justifyContent: "center",
                    alignItems: "center",
                    paddingHorizontal: 14,
                    borderLeftWidth: 1,
                    borderLeftColor: isSingleSelected
                      ? "rgba(0,0,0,0.15)"
                      : "rgba(255,255,255,0.06)",
                  }}
                >
                  <Text
                    style={{
                      color: isSingleSelected ? "#5a1a1a" : "#e05252",
                      fontSize: 18,
                    }}
                  >
                    🗑
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })
      )}

      {/* STATUS */}
      {(loading || previewing) && <ActivityIndicator style={{ marginTop: 20 }} />}

      {!!status && (
        <Text style={{ marginTop: 20, color: "#A9BDDB" }}>
          {status}
        </Text>
      )}

      {/* FIELD MAPPING MODAL (import) */}
      <Modal
        visible={fieldModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setFieldModalVisible(false); setPendingFile(null); setAnkiPreview(null); }}
      >
        <AnkiFieldModal
          title="Map Card Fields"
          subtitle={ankiPreview ? `${ankiPreview.deckName} · ${ankiPreview.totalNotes} notes` : ""}
          fields={ankiPreview?.modelSchemas?.[0]?.fields ?? []}
          sample={ankiPreview?.samples?.[0] ?? []}
          frontIndices={frontFieldIndices}
          backIndices={backFieldIndices}
          audioIndex={audioFieldIndex}
          onFrontToggle={(i) => setFrontFieldIndices(toggleIndex(frontFieldIndices, i))}
          onBackToggle={(i) => setBackFieldIndices(toggleIndex(backFieldIndices, i))}
          onAudioToggle={(i) => setAudioFieldIndex(audioFieldIndex === i ? null : i)}
          onConfirm={handleConfirmImport}
          confirmLabel="Import Deck"
          onCancel={() => { setFieldModalVisible(false); setPendingFile(null); setAnkiPreview(null); }}
        />
      </Modal>

      {/* REMAP FIELDS MODAL (paid users, existing anki decks) */}
      <Modal
        visible={!!remapDeck}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setRemapDeck(null)}
      >
        <AnkiFieldModal
          title="Change Field Mapping"
          subtitle={remapDeck?.name ?? ""}
          fields={remapDeck?.fieldSchema ?? []}
          sample={[]}
          frontIndices={remapFront}
          backIndices={remapBack}
          audioIndex={remapAudio}
          onFrontToggle={(i) => setRemapFront(toggleIndex(remapFront, i))}
          onBackToggle={(i) => setRemapBack(toggleIndex(remapBack, i))}
          onAudioToggle={(i) => setRemapAudio(remapAudio === i ? null : i)}
          onConfirm={handleConfirmRemap}
          confirmLabel={remapLoading ? "Remapping..." : "Apply Changes"}
          onCancel={() => setRemapDeck(null)}
        />
      </Modal>

      {/* EDIT DECK MODAL */}
      <Modal
        visible={!!editingDeck}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeEditDeck}
      >
        <View style={{ flex: 1, backgroundColor: "#0e1424" }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 20,
              paddingTop: 56,
              borderBottomWidth: 1,
              borderBottomColor: "rgba(169,189,219,0.1)",
            }}
          >
            <Text
              style={{
                flex: 1,
                color: "white",
                fontSize: 20,
                fontWeight: "800",
              }}
              numberOfLines={1}
            >
              {editingDeck?.name}
            </Text>
            <Pressable onPress={closeEditDeck} style={{ paddingLeft: 16 }}>
              <Text style={{ color: "#A9BDDB", fontSize: 16, fontWeight: "600" }}>
                Done
              </Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
            {/* Card count summary */}
            <Text style={{ color: "#A9BDDB", fontSize: 13, marginBottom: 16 }}>
              {deckCards.length} card{deckCards.length !== 1 ? "s" : ""} in this deck
              {"  •  "}
              {displayCardCount} / {maxCards} total used
            </Text>

            {/* Existing cards */}
            {cardsLoading ? (
              <ActivityIndicator style={{ marginVertical: 20 }} />
            ) : deckCards.length === 0 ? (
              <View
                style={{
                  backgroundColor: "#161b22",
                  borderRadius: 10,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: "#2a2e36",
                }}
              >
                <Text style={{ color: "#777" }}>
                  No cards yet. Add one below.
                </Text>
              </View>
            ) : (
              deckCards.map((card: any, i: number) => (
                <View
                  key={card._id ?? i}
                  style={{
                    backgroundColor: "#161b22",
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: "#2a2e36",
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "700" }}>
                    {card.front}
                  </Text>
                  <Text style={{ color: "#A9BDDB", marginTop: 4, fontSize: 13 }}>
                    {card.back}
                  </Text>
                </View>
              ))
            )}

            {/* Add card section */}
            <Text
              style={{
                color: "#D86732",
                fontWeight: "700",
                marginTop: 28,
                marginBottom: 12,
              }}
            >
              Add a Card
            </Text>

            {displayCardCount >= maxCards ? (
              <View
                style={{
                  backgroundColor: "#161b22",
                  borderRadius: 12,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "rgba(216,103,50,0.3)",
                }}
              >
                <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>
                  Card limit reached
                </Text>
                <Text style={{ color: "#A9BDDB", marginTop: 6, lineHeight: 20 }}>
                  You've used {displayCardCount} of {maxCards} cards.{" "}
                  {plan === "free" && adMode !== "ad_supported"
                    ? "Enable ads or upgrade to add more."
                    : "Upgrade your plan to add more."}
                </Text>
                <View style={{ marginTop: 14 }}>
                  <UpgradeButton label="Upgrade for More Cards" />
                </View>
              </View>
            ) : (
              <>
                <TextInput
                  value={newCardFront}
                  onChangeText={setNewCardFront}
                  placeholder="Front (question or term)"
                  placeholderTextColor="#555"
                  style={{
                    backgroundColor: "#161b22",
                    color: "white",
                    borderRadius: 10,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: "#2a2e36",
                    marginBottom: 10,
                  }}
                />
                <TextInput
                  value={newCardBack}
                  onChangeText={setNewCardBack}
                  placeholder="Back (answer or definition)"
                  placeholderTextColor="#555"
                  multiline
                  textAlignVertical="top"
                  style={{
                    backgroundColor: "#161b22",
                    color: "white",
                    borderRadius: 10,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: "#2a2e36",
                    marginBottom: 14,
                    minHeight: 80,
                  }}
                />
                <Pressable
                  onPress={handleAddCard}
                  disabled={
                    addingCard ||
                    !newCardFront.trim() ||
                    !newCardBack.trim()
                  }
                  style={{
                    backgroundColor: "#D86732",
                    padding: 16,
                    borderRadius: 12,
                    opacity:
                      !newCardFront.trim() || !newCardBack.trim() ? 0.5 : 1,
                  }}
                >
                  {addingCard ? (
                    <ActivityIndicator color="#111" />
                  ) : (
                    <Text
                      style={{
                        color: "#111",
                        textAlign: "center",
                        fontWeight: "800",
                      }}
                    >
                      Add Card
                    </Text>
                  )}
                </Pressable>
              </>
            )}

            {!!cardStatus && (
              <Text style={{ color: "#A9BDDB", marginTop: 14 }}>
                {cardStatus}
              </Text>
            )}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}