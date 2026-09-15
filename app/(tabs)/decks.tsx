import { useState, useEffect, useMemo, useRef } from "react";
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
  Platform,
  Image,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";

import { generateDeck, importAnkiDeck, previewAnkiDeck, importExcelDeck, previewExcelDeck, remapDeckFields, previewAIDeck, previewAIDeckFromFile, confirmAIDeck, importAnkiDeckForChild, importExcelDeckForChild, CardType, AnkiPreview, AIPreviewCard } from "../../services/aiDeckService";
import { AnkiFieldModal } from "../../components/AnkiFieldModal";
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

function AIPreviewModalContent({
  cards,
  deckName,
  frontIndices,
  backIndices,
  onFrontToggle,
  onBackToggle,
  onDeckNameChange,
  onConfirm,
  onCancel,
}: {
  cards: AIPreviewCard[];
  deckName: string;
  frontIndices: number[];
  backIndices: number[];
  onFrontToggle: (i: number) => void;
  onBackToggle: (i: number) => void;
  onDeckNameChange: (name: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const sampleCard = cards.find((c) => c.type !== "cloze");
  const sample = [
    { name: "Front", value: sampleCard?.front ?? "" },
    { name: "Back",  value: sampleCard?.back  ?? "" },
  ];
  return (
    <AnkiFieldModal
      title="Map Card Fields"
      subtitle={`${cards.length} card${cards.length !== 1 ? "s" : ""} generated — choose which side is Front`}
      fields={["Front", "Back"]}
      sample={sample}
      frontIndices={frontIndices}
      backIndices={backIndices}
      audioIndex={null}
      onFrontToggle={onFrontToggle}
      onBackToggle={onBackToggle}
      onAudioToggle={() => {}}
      deckName={deckName}
      onDeckNameChange={onDeckNameChange}
      onConfirm={onConfirm}
      confirmLabel="Create Deck"
      onCancel={onCancel}
      showAudio={false}
    />
  );
}

export default function DecksScreen() {
  const [prompt, setPrompt] = useState("");
  const [deckNameInput, setDeckNameInput] = useState("");
  const [importDeckName, setImportDeckName] = useState("");
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
  const role = context?.role || "solo";

  const [children, setChildren] = useState<any[]>([]);
  const [selectedChildIndex, setSelectedChildIndex] = useState(0); // 0 = self, 1+ = children

  const selectedChildId = selectedChildIndex === 0 ? null : children[selectedChildIndex - 1]?.userId;

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

  // Use live counts so the UI updates immediately after deck deletion
  const displayDeckCount = actualDeckCount;
  const displayCardCount = totalCardsAcrossDecks;

  const formatLimit = (n: number) => n >= 999000 ? "Unlimited" : String(n);

  const isPaidUser = plan !== null && plan !== "free";

  // Anki field-mapping modal state (import)
  const [pendingFile, setPendingFile] = useState<any>(null);
  const [ankiPreview, setAnkiPreview] = useState<AnkiPreview | null>(null);
  const [frontFieldIndices, setFrontFieldIndices] = useState<number[]>([0]);
  const [backFieldIndices, setBackFieldIndices] = useState<number[]>([1]);
  const [audioFieldIndex, setAudioFieldIndex] = useState<number | null>(null);
  const [fieldModalVisible, setFieldModalVisible] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  // Excel field-mapping modal state (import)
  const [excelPendingFile, setExcelPendingFile] = useState<any>(null);
  const [excelPreview, setExcelPreview] = useState<AnkiPreview | null>(null);
  const [excelFrontIndices, setExcelFrontIndices] = useState<number[]>([0]);
  const [excelBackIndices, setExcelBackIndices] = useState<number[]>([1]);
  const [excelDeckName, setExcelDeckName] = useState("");
  const [excelModalVisible, setExcelModalVisible] = useState(false);
  const [excelPreviewing, setExcelPreviewing] = useState(false);

  // AI preview state (text paste or file upload → preview → map → confirm)
  const [aiPreviewCards, setAiPreviewCards] = useState<AIPreviewCard[]>([]);
  const [aiPreviewDeckName, setAiPreviewDeckName] = useState("");
  const [aiPreviewCardType, setAiPreviewCardType] = useState<CardType>("basic");
  const [aiPreviewFrontIndices, setAiPreviewFrontIndices] = useState<number[]>([0]);
  const [aiPreviewBackIndices, setAiPreviewBackIndices] = useState<number[]>([1]);
  const [aiPreviewModalVisible, setAiPreviewModalVisible] = useState(false);
  const [aiPreviewing, setAiPreviewing] = useState(false);

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

  // Goal state (edit modal)
  const [goalProgressMap, setGoalProgressMap] = useState<Record<string, any>>({});
  const [editGoalEnabled, setEditGoalEnabled] = useState(false);
  const [editGoalMonth, setEditGoalMonth] = useState("");
  const [editGoalDay, setEditGoalDay] = useState("");
  const [editGoalYear, setEditGoalYear] = useState("");
  const [goalSaving, setGoalSaving] = useState(false);

  // Goal setup modal (shown after create/import)
  const [newDeckGoalDeck, setNewDeckGoalDeck] = useState<{ _id: string; name: string } | null>(null);
  const [newDeckGoalEnabled, setNewDeckGoalEnabled] = useState(false);
  const [newDeckGoalMonth, setNewDeckGoalMonth] = useState("");
  const [newDeckGoalDay, setNewDeckGoalDay] = useState("");
  const [newDeckGoalYear, setNewDeckGoalYear] = useState("");
  const [newDeckGoalSaving, setNewDeckGoalSaving] = useState(false);

  const shouldShowAdsUpgrade =
    plan === "free" &&
    adMode !== "ad_supported" &&
    displayDeckCount >= Math.max(1, maxDecks - 1);

  useEffect(() => {
    if (role === "parent") {
      api.get("/parent/dashboard").then((res) => {
        setChildren(res.data?.children || []);
      }).catch(() => {});
    }
  }, [role]);

  useEffect(() => {
    loadDecks();
    loadPersistedShuffleState();
  }, [selectedChildId]);

  async function loadPersistedShuffleState() {
    const [mode, ids] = await Promise.all([loadShuffleMode(), loadShuffleDeckIds()]);
    setShuffleMode(mode);
    setShuffleDeckIds(ids);
  }

  async function loadDecks() {
    try {
      const params = selectedChildId ? { childId: selectedChildId } : {};
      const res = await api.get("/decks", { params });
      const loaded = res.data.decks || res.data || [];
      setDecks(loaded);
      loadGoalProgress(loaded);
    } catch (err) {
      console.error("Failed to load decks", err);
      setStatus("❌ Failed to load decks");
    }
  }

  async function loadGoalProgress(deckList: any[]) {
    const goalDecks = deckList.filter((d) => d.goalEnabled);
    if (!goalDecks.length) return;
    const results = await Promise.allSettled(
      goalDecks.map((d) => api.get(`/decks/${d._id}/goal-progress`, { params: selectedChildId ? { targetChildId: selectedChildId } : {} }))
    );
    const map: Record<string, any> = {};
    results.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value.data?.ok) {
        map[goalDecks[i]._id] = r.value.data;
      }
    });
    setGoalProgressMap((prev) => ({ ...prev, ...map }));
  }

  function parseDateParts(isoString: string | null | undefined) {
    if (!isoString) return { month: "", day: "", year: "" };
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return { month: "", day: "", year: "" };
    return {
      month: String(d.getUTCMonth() + 1),
      day: String(d.getUTCDate()),
      year: String(d.getUTCFullYear()),
    };
  }

  async function handleSaveGoal() {
    if (!editingDeck) return;
    setGoalSaving(true);
    try {
      let goalTargetDate: string | null = null;
      if (editGoalEnabled) {
        const m = parseInt(editGoalMonth, 10);
        const d = parseInt(editGoalDay, 10);
        const y = parseInt(editGoalYear, 10);
        if (!m || !d || !y || y < 2024 || m > 12 || d > 31) {
          setCardStatus("❌ Enter a valid date (MM / DD / YYYY)");
          setGoalSaving(false);
          return;
        }
        goalTargetDate = new Date(Date.UTC(y, m - 1, d)).toISOString();
      }
      await api.patch(`/decks/${editingDeck._id}/goal`, {
        ...(selectedChildId ? { targetChildId: selectedChildId } : {}),
        goalEnabled: editGoalEnabled,
        goalTargetDate,
      });
      // Refresh goal progress for this deck
      if (editGoalEnabled) {
        try {
          const res = await api.get(`/decks/${editingDeck._id}/goal-progress`, { params: selectedChildId ? { targetChildId: selectedChildId } : {} });
          if (res.data?.ok) {
            setGoalProgressMap((prev) => ({ ...prev, [editingDeck._id]: res.data }));
          }
        } catch {}
      } else {
        setGoalProgressMap((prev) => { const next = { ...prev }; delete next[editingDeck._id]; return next; });
      }
      // Keep deck list in sync
      setDecks((prev: any[]) => prev.map((dk) => dk._id === editingDeck._id
        ? { ...dk, goalEnabled: editGoalEnabled, goalTargetDate }
        : dk
      ));
      setCardStatus("✅ Goal saved");
    } catch (err) {
      setCardStatus("❌ Failed to save goal");
    } finally {
      setGoalSaving(false);
    }
  }

  async function handleSaveNewDeckGoal() {
    if (!newDeckGoalDeck) return;
    setNewDeckGoalSaving(true);
    try {
      let goalTargetDate: string | null = null;
      if (newDeckGoalEnabled) {
        const m = parseInt(newDeckGoalMonth, 10);
        const d = parseInt(newDeckGoalDay, 10);
        const y = parseInt(newDeckGoalYear, 10);
        if (!m || !d || !y || y < 2024 || m > 12 || d > 31) {
          setStatus("❌ Enter a valid date (MM / DD / YYYY)");
          setNewDeckGoalSaving(false);
          return;
        }
        goalTargetDate = new Date(Date.UTC(y, m - 1, d)).toISOString();
      }
      await api.patch(`/decks/${newDeckGoalDeck._id}/goal`, {
        ...(selectedChildId ? { targetChildId: selectedChildId } : {}),
        goalEnabled: newDeckGoalEnabled,
        goalTargetDate,
      });
      setDecks((prev: any[]) => prev.map((dk) => dk._id === newDeckGoalDeck._id
        ? { ...dk, goalEnabled: newDeckGoalEnabled, goalTargetDate }
        : dk
      ));
      if (newDeckGoalEnabled) {
        try {
          const res = await api.get(`/decks/${newDeckGoalDeck._id}/goal-progress`, { params: selectedChildId ? { targetChildId: selectedChildId } : {} });
          if (res.data?.ok) setGoalProgressMap((prev) => ({ ...prev, [newDeckGoalDeck._id]: res.data }));
        } catch {}
      }
    } catch (err) {
      setStatus("❌ Failed to save goal");
    } finally {
      setNewDeckGoalSaving(false);
      setNewDeckGoalDeck(null);
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

  function openAIPreviewModal(cards: AIPreviewCard[], deckName: string, ct: CardType) {
    // Cloze-only decks have no front/back to map — save directly
    const hasNonCloze = cards.some((c) => c.type !== "cloze");
    setAiPreviewCards(cards);
    setAiPreviewDeckName(deckName);
    setAiPreviewCardType(ct);
    setAiPreviewFrontIndices([0]);
    setAiPreviewBackIndices([1]);
    if (hasNonCloze) {
      setAiPreviewModalVisible(true);
    } else {
      // All cloze — skip mapping and save immediately
      handleConfirmAIPreview(cards, deckName, ct);
    }
  }

  async function handleGenerate() {
    if (!prompt.trim()) return;

    const state = useRefocusStore.getState();
    const currentMaxDecks = state.limits?.maxDecks ?? 2;
    if (decks.length >= currentMaxDecks) {
      setStatus("⚠️ Deck limit reached");
      return;
    }

    setAiPreviewing(true);
    setStatus("Generating preview...");

    try {
      const preview = await previewAIDeck(prompt.trim(), cardType);
      setPrompt("");
      openAIPreviewModal(preview.cards, deckNameInput.trim() || preview.deckName, cardType);
      setDeckNameInput("");
      setStatus("");
    } catch (err) {
      console.error(err);
      setStatus("❌ Failed to generate");
    } finally {
      setAiPreviewing(false);
    }
  }

  async function handleAIFileUpload() {
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (result.canceled) return;

    const file = result.assets[0];
    const state = useRefocusStore.getState();
    const currentMaxDecks = state.limits?.maxDecks ?? 2;
    if (decks.length >= currentMaxDecks) {
      setStatus("⚠️ Deck limit reached");
      return;
    }

    setAiPreviewing(true);
    setStatus("Reading file...");

    try {
      const preview = await previewAIDeckFromFile(file, cardType);
      openAIPreviewModal(preview.cards, deckNameInput.trim() || preview.deckName, cardType);
      setDeckNameInput("");
      setStatus("");
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.error || err.message || "Failed to read file";
      setStatus(`❌ ${msg}`);
    } finally {
      setAiPreviewing(false);
    }
  }

  async function handleConfirmAIPreview(
    cards?: AIPreviewCard[],
    deckName?: string,
    ct?: CardType,
  ) {
    const finalCards = cards ?? aiPreviewCards;
    const finalName = deckName ?? aiPreviewDeckName;
    const finalType = ct ?? aiPreviewCardType;

    // Apply front/back swap if user remapped
    const swapped = aiPreviewFrontIndices[0] === 1;
    const processedCards = swapped
      ? finalCards.map((c) =>
          c.type === "cloze" ? c : { ...c, front: c.back, back: c.front }
        )
      : finalCards;

    setAiPreviewModalVisible(false);
    setLoading(true);
    setStatus("Creating deck...");

    try {
      const result = await confirmAIDeck(processedCards, finalName, finalType, selectedChildId ?? undefined);
      await refreshUserContext();
      await loadDecks();
      setStatus("✅ Deck created");
      const deckId = result?.deck?._id || result?._id;
      if (deckId) {
        setNewDeckGoalEnabled(false);
        setNewDeckGoalMonth(""); setNewDeckGoalDay(""); setNewDeckGoalYear("");
        setNewDeckGoalDeck({ _id: deckId, name: finalName });
      }
    } catch (err: any) {
      console.error(err);
      setStatus("❌ Failed to create deck");
    } finally {
      setLoading(false);
      setAiPreviewCards([]);
      setAiPreviewDeckName("");
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
              await api.delete(`/decks/${deckId}`, { data: selectedChildId ? { targetChildId: selectedChildId } : undefined });
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
      // Use server-suggested indices (auto-detected from field content) when available,
      // otherwise fall back to simple positional defaults.
      setFrontFieldIndices(
        preview.suggestedFrontFieldIndices?.length
          ? preview.suggestedFrontFieldIndices
          : [0]
      );
      setBackFieldIndices(
        preview.suggestedBackFieldIndices?.length
          ? preview.suggestedBackFieldIndices
          : [Math.min(1, fields.length - 1)]
      );
      setAudioFieldIndex(preview.suggestedAudioFieldIndex ?? null);
      const rawName = preview.deckName ?? "";
      setImportDeckName(rawName && rawName !== "Default" ? rawName : "");
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
      const result = selectedChildId
        ? await importAnkiDeckForChild(pendingFile, frontFieldIndices, backFieldIndices, audioFieldIndex, importDeckName.trim() || undefined, selectedChildId)
        : await importAnkiDeck(pendingFile, frontFieldIndices, backFieldIndices, audioFieldIndex, importDeckName.trim() || undefined);
      await refreshUserContext();
      await loadDecks();
      setStatus("✅ Deck imported");
      const deckId = result?.deck?._id || result?.deckId || result?._id;
      const deckName = importDeckName.trim() || result?.deck?.name || result?.deckName || result?.name || "Imported Deck";
      if (deckId) {
        setNewDeckGoalEnabled(false);
        setNewDeckGoalMonth(""); setNewDeckGoalDay(""); setNewDeckGoalYear("");
        setNewDeckGoalDeck({ _id: deckId, name: deckName });
      }
    } catch (err: any) {
      console.error(err);
      setStatus("❌ Upload failed");
    } finally {
      setLoading(false);
      setPendingFile(null);
      setAnkiPreview(null);
    }
  }

  async function handleExcelUpload() {
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (result.canceled) return;

    const file = result.assets[0];
    const state = useRefocusStore.getState();
    const currentMaxDecks = state.limits?.maxDecks ?? 2;

    if (decks.length >= currentMaxDecks) {
      setStatus("⚠️ Deck limit reached");
      return;
    }

    setExcelPreviewing(true);
    setStatus("Reading spreadsheet...");

    try {
      const preview = await previewExcelDeck(file);
      const fields = preview.modelSchemas?.[0]?.fields ?? [];
      setExcelPendingFile(file);
      setExcelPreview(preview);
      setExcelFrontIndices([0]);
      setExcelBackIndices([Math.min(1, fields.length - 1)]);
      setExcelDeckName("");
      setExcelModalVisible(true);
      setStatus("");
    } catch (err) {
      console.error(err);
      setStatus("❌ Could not read spreadsheet");
    } finally {
      setExcelPreviewing(false);
    }
  }

  async function handleConfirmExcelImport() {
    if (!excelPendingFile) return;
    setExcelModalVisible(false);
    setLoading(true);
    setStatus("Importing...");

    try {
      const result = selectedChildId
        ? await importExcelDeckForChild(excelPendingFile, excelFrontIndices, excelBackIndices, excelDeckName.trim() || undefined, selectedChildId)
        : await importExcelDeck(excelPendingFile, excelFrontIndices, excelBackIndices, excelDeckName.trim() || undefined);
      await refreshUserContext();
      await loadDecks();
      setStatus("✅ Deck imported");
      const deckId = result?.deck?._id || result?.deckId || result?._id;
      const deckName = excelDeckName.trim() || result?.deck?.name || result?.deckName || result?.name || "Imported Deck";
      if (deckId) {
        setNewDeckGoalEnabled(false);
        setNewDeckGoalMonth(""); setNewDeckGoalDay(""); setNewDeckGoalYear("");
        setNewDeckGoalDeck({ _id: deckId, name: deckName });
      }
    } catch (err: any) {
      console.error(err);
      setStatus("❌ Upload failed");
    } finally {
      setLoading(false);
      setExcelPendingFile(null);
      setExcelPreview(null);
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

    // Initialize goal form from deck data
    setEditGoalEnabled(deck.goalEnabled ?? false);
    const parts = parseDateParts(deck.goalTargetDate);
    setEditGoalMonth(parts.month);
    setEditGoalDay(parts.day);
    setEditGoalYear(parts.year);

    try {
      const res = await api.get(`/cards/${deck._id}`, { params: selectedChildId ? { targetChildId: selectedChildId } : {} });
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
        ...(selectedChildId ? { targetChildId: selectedChildId } : {}),
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

      {role === "parent" && children.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12, marginBottom: 4 }}>
          <Pressable
            onPress={() => setSelectedChildIndex(0)}
            style={{
              paddingVertical: 10, paddingHorizontal: 16, marginRight: 8,
              backgroundColor: selectedChildIndex === 0 ? "#D86732" : "#1b2540",
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "white", fontWeight: "700" }}>My Decks</Text>
          </Pressable>
          {children.map((child, i) => (
            <Pressable
              key={child.userId}
              onPress={() => setSelectedChildIndex(i + 1)}
              style={{
                paddingVertical: 10, paddingHorizontal: 16, marginRight: 8,
                backgroundColor: selectedChildIndex === i + 1 ? "#D86732" : "#1b2540",
                borderRadius: 12,
              }}
            >
              <Text style={{ color: "white", fontWeight: "700" }}>{child.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

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
              {displayDeckCount} / {formatLimit(maxDecks)}
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
              {displayCardCount} / {formatLimit(maxCards)}
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

      {/* HOMEWORK HUB */}
      <Pressable
        onPress={() => router.push("/homework-hub")}
        style={{
          marginTop: 20,
          backgroundColor: "#161b22",
          borderWidth: 1,
          borderColor: "#D86732",
          borderRadius: 18,
          padding: 18,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
        }}
      >
        <Text style={{ fontSize: 32 }}>📚</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#D86732", fontWeight: "800", fontSize: 16 }}>
            Homework Hub
          </Text>
          <Text style={{ color: "#A9BDDB", fontSize: 13, marginTop: 3, lineHeight: 18 }}>
            Upload a homework assignment, answer the questions, and get a smart study session for anything you miss.
          </Text>
        </View>
        <Text style={{ color: "#D86732", fontSize: 20 }}>→</Text>
      </Pressable>

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
          value={deckNameInput}
          onChangeText={setDeckNameInput}
          placeholder="Deck name (optional)"
          placeholderTextColor="#777"
          style={{
            borderWidth: 1,
            borderColor: "#2a2e36",
            backgroundColor: "#0f172a",
            color: "white",
            padding: 12,
            borderRadius: 12,
            marginBottom: 10,
          }}
        />

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

        <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
          <Pressable
            onPress={handleGenerate}
            disabled={aiPreviewing}
            style={{
              flex: 1,
              backgroundColor: "#D86732",
              padding: 16,
              borderRadius: 14,
              alignItems: "center",
            }}
          >
            {aiPreviewing
              ? <ActivityIndicator size="small" color="#111" />
              : <Text style={{ fontWeight: "800", color: "#111" }}>Generate from Text</Text>
            }
          </Pressable>

          <Pressable
            onPress={handleAIFileUpload}
            disabled={aiPreviewing}
            style={{
              flex: 1,
              backgroundColor: "#1b2540",
              padding: 16,
              borderRadius: 14,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#2a2e36",
            }}
          >
            {aiPreviewing
              ? <ActivityIndicator size="small" color="#A9BDDB" />
              : <Text style={{ fontWeight: "700", color: "#A9BDDB" }}>Upload File</Text>
            }
          </Pressable>
        </View>

        <Text style={{ color: "#555", fontSize: 11, marginTop: 8 }}>
          Supports PDF, DOCX, DOC, XLSX, XLS
        </Text>
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
          Import from Anki (.apkg) or a spreadsheet (.xlsx, .csv). Choose your columns for the front and back of each card.
        </Text>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
          <Pressable
            onPress={handleUpload}
            style={{
              flex: 1,
              backgroundColor: "#1b2540",
              padding: 14,
              borderRadius: 14,
              alignItems: "center",
            }}
          >
            {previewing
              ? <ActivityIndicator size="small" color="#A9BDDB" />
              : <Text style={{ color: "white", fontWeight: "700" }}>Upload .apkg</Text>
            }
          </Pressable>

          <Pressable
            onPress={handleExcelUpload}
            style={{
              flex: 1,
              backgroundColor: "#1b2540",
              padding: 14,
              borderRadius: 14,
              alignItems: "center",
            }}
          >
            {excelPreviewing
              ? <ActivityIndicator size="small" color="#A9BDDB" />
              : <Text style={{ color: "white", fontWeight: "700" }}>Upload .xlsx</Text>
            }
          </Pressable>
        </View>
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
                  {(() => {
                    const gp = goalProgressMap[deck._id];
                    if (!gp?.goalEnabled) return null;
                    const pct = gp.masteryPct ?? 0;
                    const days = gp.daysRemaining;
                    const barColor = isSingleSelected ? "#111" : "#4ade80";
                    const trackColor = isSingleSelected ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.1)";
                    return (
                      <View style={{ marginTop: 8 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                          <Text style={{ color: isSingleSelected ? "#2a2a2a" : "#4ade80", fontSize: 11, fontWeight: "700" }}>
                            {pct}% exam-ready
                          </Text>
                          {days !== null && (
                            <Text style={{ color: isSingleSelected ? "#2a2a2a" : "#A9BDDB", fontSize: 11 }}>
                              {days === 0 ? "Test today!" : `${days}d left`}
                            </Text>
                          )}
                        </View>
                        <View style={{ height: 4, backgroundColor: trackColor, borderRadius: 2, overflow: "hidden" }}>
                          <View style={{ height: 4, width: `${Math.min(pct, 100)}%`, backgroundColor: barColor, borderRadius: 2 }} />
                        </View>
                      </View>
                    );
                  })()}
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
      {(loading || previewing || aiPreviewing) && <ActivityIndicator style={{ marginTop: 20 }} />}

      {!!status && (
        <Text style={{ marginTop: 20, color: "#A9BDDB" }}>
          {status}
        </Text>
      )}

      {/* AI PREVIEW / FIELD MAPPING MODAL */}
      <Modal
        visible={aiPreviewModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setAiPreviewModalVisible(false); setAiPreviewCards([]); }}
      >
        <AIPreviewModalContent
          cards={aiPreviewCards}
          deckName={aiPreviewDeckName}
          frontIndices={aiPreviewFrontIndices}
          backIndices={aiPreviewBackIndices}
          onFrontToggle={(i) => setAiPreviewFrontIndices([i])}
          onBackToggle={(i) => setAiPreviewBackIndices([i])}
          onDeckNameChange={setAiPreviewDeckName}
          onConfirm={() => handleConfirmAIPreview()}
          onCancel={() => { setAiPreviewModalVisible(false); setAiPreviewCards([]); }}
        />
      </Modal>

      {/* FIELD MAPPING MODAL (import) */}
      <Modal
        visible={fieldModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setFieldModalVisible(false); setPendingFile(null); setAnkiPreview(null); }}
      >
        <AnkiFieldModal
          title="Map Card Fields"
          subtitle={ankiPreview ? `${ankiPreview.totalNotes} notes` : ""}
          fields={ankiPreview?.modelSchemas?.[0]?.fields ?? []}
          sample={ankiPreview?.samples?.[0] ?? []}
          frontIndices={frontFieldIndices}
          backIndices={backFieldIndices}
          audioIndex={audioFieldIndex}
          onFrontToggle={(i) => setFrontFieldIndices(toggleIndex(frontFieldIndices, i))}
          onBackToggle={(i) => setBackFieldIndices(toggleIndex(backFieldIndices, i))}
          onAudioToggle={(i) => setAudioFieldIndex(audioFieldIndex === i ? null : i)}
          deckName={importDeckName}
          onDeckNameChange={setImportDeckName}
          onConfirm={handleConfirmImport}
          confirmLabel="Import Deck"
          onCancel={() => { setFieldModalVisible(false); setPendingFile(null); setAnkiPreview(null); }}
        />
      </Modal>

      {/* EXCEL FIELD MAPPING MODAL (import) */}
      <Modal
        visible={excelModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => { setExcelModalVisible(false); setExcelPendingFile(null); setExcelPreview(null); }}
      >
        <AnkiFieldModal
          title="Map Spreadsheet Columns"
          subtitle={excelPreview ? `${excelPreview.totalNotes} rows` : ""}
          fields={excelPreview?.modelSchemas?.[0]?.fields ?? []}
          sample={excelPreview?.samples?.[0] ?? []}
          frontIndices={excelFrontIndices}
          backIndices={excelBackIndices}
          audioIndex={null}
          onFrontToggle={(i) => setExcelFrontIndices(toggleIndex(excelFrontIndices, i))}
          onBackToggle={(i) => setExcelBackIndices(toggleIndex(excelBackIndices, i))}
          onAudioToggle={() => {}}
          deckName={excelDeckName}
          onDeckNameChange={setExcelDeckName}
          onConfirm={handleConfirmExcelImport}
          confirmLabel="Import Deck"
          onCancel={() => { setExcelModalVisible(false); setExcelPendingFile(null); setExcelPreview(null); }}
          showAudio={false}
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

      {/* STUDY GOAL SETUP MODAL (shown after create/import) */}
      <Modal
        visible={!!newDeckGoalDeck}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setNewDeckGoalDeck(null)}
      >
        <View style={{ flex: 1, backgroundColor: "#0e1424" }}>
          <View style={{ padding: 24, paddingTop: 56, flex: 1 }}>
            {/* Step indicator */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 20 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#4ade80", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#111", fontSize: 11, fontWeight: "800" }}>✓</Text>
                </View>
                <Text style={{ color: "#4ade80", fontSize: 12, fontWeight: "700" }}>Deck Imported</Text>
              </View>
              <View style={{ height: 1, width: 20, backgroundColor: "#2a2e36" }} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#D86732", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#111", fontSize: 11, fontWeight: "800" }}>2</Text>
                </View>
                <Text style={{ color: "#D86732", fontSize: 12, fontWeight: "700" }}>Study Goal</Text>
              </View>
            </View>

            {/* Header */}
            <Text style={{ color: "white", fontSize: 22, fontWeight: "800", marginBottom: 8 }}>
              Set a Study Goal
            </Text>
            <Text style={{ color: "#A9BDDB", fontSize: 14, lineHeight: 21, marginBottom: 24 }}>
              "{newDeckGoalDeck?.name}" was added to your library. Add a goal to activate Smart Blocking.
            </Text>

            {/* Smart Blocking explanation */}
            <View style={{ backgroundColor: "#161b22", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "rgba(74,222,128,0.2)", marginBottom: 24 }}>
              <Text style={{ color: "#4ade80", fontWeight: "700", fontSize: 13, marginBottom: 8 }}>
                How this connects to Smart Blocking
              </Text>
              <Text style={{ color: "#A9BDDB", fontSize: 13, lineHeight: 20 }}>
                Smart Blocking tracks how close you are to exam-ready on this deck and uses that to set your daily card requirement — the minimum you need to review before apps get unblocked.{"\n\n"}Set a target date and it calculates your daily pace automatically. The closer your exam, the higher the floor. When you're on track, it eases off.
              </Text>
            </View>

            {/* Toggle */}
            <View style={{ backgroundColor: "#161b22", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: newDeckGoalEnabled ? "rgba(74,222,128,0.3)" : "#2a2e36", marginBottom: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>Track Exam Readiness</Text>
                  <Text style={{ color: "#A9BDDB", fontSize: 12, marginTop: 3 }}>
                    Pace your daily cards based on a target date.
                  </Text>
                </View>
                <Switch
                  value={newDeckGoalEnabled}
                  onValueChange={setNewDeckGoalEnabled}
                  trackColor={{ false: "#2a2e36", true: "#4ade80" }}
                  thumbColor={newDeckGoalEnabled ? "#fff" : "#A9BDDB"}
                />
              </View>

              {newDeckGoalEnabled && (
                <View style={{ marginTop: 16 }}>
                  <Text style={{ color: "#A9BDDB", fontSize: 12, marginBottom: 8 }}>Target Date</Text>
                  <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                    <TextInput
                      value={newDeckGoalMonth}
                      onChangeText={(t) => setNewDeckGoalMonth(t.replace(/\D/g, "").slice(0, 2))}
                      placeholder="MM"
                      placeholderTextColor="#555"
                      keyboardType="number-pad"
                      maxLength={2}
                      style={{ flex: 1, backgroundColor: "#0f172a", color: "white", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#2a2e36", textAlign: "center", fontSize: 16 }}
                    />
                    <Text style={{ color: "#555", fontSize: 18 }}>/</Text>
                    <TextInput
                      value={newDeckGoalDay}
                      onChangeText={(t) => setNewDeckGoalDay(t.replace(/\D/g, "").slice(0, 2))}
                      placeholder="DD"
                      placeholderTextColor="#555"
                      keyboardType="number-pad"
                      maxLength={2}
                      style={{ flex: 1, backgroundColor: "#0f172a", color: "white", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#2a2e36", textAlign: "center", fontSize: 16 }}
                    />
                    <Text style={{ color: "#555", fontSize: 18 }}>/</Text>
                    <TextInput
                      value={newDeckGoalYear}
                      onChangeText={(t) => setNewDeckGoalYear(t.replace(/\D/g, "").slice(0, 4))}
                      placeholder="YYYY"
                      placeholderTextColor="#555"
                      keyboardType="number-pad"
                      maxLength={4}
                      style={{ flex: 2, backgroundColor: "#0f172a", color: "white", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#2a2e36", textAlign: "center", fontSize: 16 }}
                    />
                  </View>
                </View>
              )}
            </View>

            <Text style={{ color: "#4a5568", fontSize: 12, lineHeight: 18, marginBottom: 24 }}>
              You can always update or remove this goal from the deck's edit screen.
            </Text>
          </View>

          {/* Footer buttons */}
          <View style={{ padding: 24, paddingBottom: 40, gap: 10 }}>
            <Pressable
              onPress={handleSaveNewDeckGoal}
              disabled={newDeckGoalSaving}
              style={{ backgroundColor: newDeckGoalEnabled ? "#4ade80" : "#D86732", borderRadius: 12, padding: 16, alignItems: "center" }}
            >
              <Text style={{ color: "#111", fontWeight: "700", fontSize: 16 }}>
                {newDeckGoalSaving ? "Saving..." : newDeckGoalEnabled ? "Set Goal & Continue" : "Continue Without Goal"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setNewDeckGoalDeck(null)}
              style={{ padding: 14, alignItems: "center" }}
            >
              <Text style={{ color: "#4a5568", fontSize: 15 }}>Skip for now</Text>
            </Pressable>
          </View>
        </View>
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
              {displayCardCount} / {formatLimit(maxCards)} total used
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
                  {(card.frontMedia ?? []).filter((m: any) => m.type === "image").map((m: any, mi: number) => (
                    <Image key={mi} source={{ uri: m.url }} style={{ width: "100%", height: 140, borderRadius: 8, marginBottom: 8 }} resizeMode="contain" />
                  ))}
                  {!!card.front && (
                    <Text style={{ color: "white", fontWeight: "700" }}>
                      {card.front}
                    </Text>
                  )}
                  {(card.backMedia ?? []).filter((m: any) => m.type === "image").map((m: any, mi: number) => (
                    <Image key={mi} source={{ uri: m.url }} style={{ width: "100%", height: 140, borderRadius: 8, marginTop: 8 }} resizeMode="contain" />
                  ))}
                  {!!card.back && (
                    <Text style={{ color: "#A9BDDB", marginTop: 4, fontSize: 13 }}>
                      {card.back}
                    </Text>
                  )}
                </View>
              ))
            )}

            {/* STUDY GOAL */}
            <Text style={{ color: "#D86732", fontWeight: "700", marginTop: 28, marginBottom: 12 }}>
              Study Goal
            </Text>
            <View style={{ backgroundColor: "#161b22", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: editGoalEnabled ? "rgba(74,222,128,0.3)" : "#2a2e36" }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>Track Exam Readiness</Text>
                  <Text style={{ color: "#A9BDDB", fontSize: 12, marginTop: 3 }}>
                    Set a target date and the app will pace your daily study requirements.
                  </Text>
                </View>
                <Switch
                  value={editGoalEnabled}
                  onValueChange={(v) => setEditGoalEnabled(v)}
                  trackColor={{ false: "#2a2e36", true: "#4ade80" }}
                  thumbColor={editGoalEnabled ? "#fff" : "#A9BDDB"}
                />
              </View>

              {editGoalEnabled && (
                <View style={{ marginTop: 16 }}>
                  <Text style={{ color: "#A9BDDB", fontSize: 12, marginBottom: 8 }}>Target Date</Text>
                  <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                    <TextInput
                      value={editGoalMonth}
                      onChangeText={(t) => setEditGoalMonth(t.replace(/\D/g, "").slice(0, 2))}
                      placeholder="MM"
                      placeholderTextColor="#555"
                      keyboardType="number-pad"
                      maxLength={2}
                      style={{ flex: 1, backgroundColor: "#0f172a", color: "white", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#2a2e36", textAlign: "center", fontSize: 16 }}
                    />
                    <Text style={{ color: "#555", fontSize: 18 }}>/</Text>
                    <TextInput
                      value={editGoalDay}
                      onChangeText={(t) => setEditGoalDay(t.replace(/\D/g, "").slice(0, 2))}
                      placeholder="DD"
                      placeholderTextColor="#555"
                      keyboardType="number-pad"
                      maxLength={2}
                      style={{ flex: 1, backgroundColor: "#0f172a", color: "white", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#2a2e36", textAlign: "center", fontSize: 16 }}
                    />
                    <Text style={{ color: "#555", fontSize: 18 }}>/</Text>
                    <TextInput
                      value={editGoalYear}
                      onChangeText={(t) => setEditGoalYear(t.replace(/\D/g, "").slice(0, 4))}
                      placeholder="YYYY"
                      placeholderTextColor="#555"
                      keyboardType="number-pad"
                      maxLength={4}
                      style={{ flex: 2, backgroundColor: "#0f172a", color: "white", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#2a2e36", textAlign: "center", fontSize: 16 }}
                    />
                  </View>

                  {/* Progress summary if goal data loaded */}
                  {(() => {
                    const gp = goalProgressMap[editingDeck?._id];
                    if (!gp?.goalEnabled) return null;
                    const pct = gp.masteryPct ?? 0;
                    const examReady = gp.examReadyCards ?? 0;
                    const mastered = gp.masteredCards ?? 0;
                    const total = gp.totalCards ?? 0;
                    const days = gp.daysRemaining;
                    const daily = gp.dailyCardsNeeded;
                    return (
                      <View style={{ marginTop: 16 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                          <Text style={{ color: "#4ade80", fontWeight: "700", fontSize: 13 }}>{pct}% Exam-Ready</Text>
                          {days !== null && (
                            <Text style={{ color: "#A9BDDB", fontSize: 13 }}>
                              {days === 0 ? "Test today!" : `${days} day${days !== 1 ? "s" : ""} left`}
                            </Text>
                          )}
                        </View>
                        {/* Segmented bar */}
                        <View style={{ height: 8, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden", flexDirection: "row" }}>
                          {mastered > 0 && total > 0 && (
                            <View style={{ width: `${(mastered / total) * 100}%`, backgroundColor: "#22c55e", height: 8 }} />
                          )}
                          {(examReady - mastered) > 0 && total > 0 && (
                            <View style={{ width: `${((examReady - mastered) / total) * 100}%`, backgroundColor: "#4ade80", height: 8 }} />
                          )}
                        </View>
                        {/* Legend */}
                        <View style={{ flexDirection: "row", gap: 14, marginTop: 8 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: "#22c55e" }} />
                            <Text style={{ color: "#A9BDDB", fontSize: 11 }}>Mastered ({mastered})</Text>
                          </View>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: "#4ade80" }} />
                            <Text style={{ color: "#A9BDDB", fontSize: 11 }}>Exam-ready ({examReady - mastered})</Text>
                          </View>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.08)" }} />
                            <Text style={{ color: "#A9BDDB", fontSize: 11 }}>Learning ({total - examReady})</Text>
                          </View>
                        </View>
                        {daily !== null && daily > 0 && (
                          <Text style={{ color: "#A9BDDB", fontSize: 12, marginTop: 10 }}>
                            ~{daily} card{daily !== 1 ? "s" : ""} need to become exam-ready per day to hit your goal.
                          </Text>
                        )}
                      </View>
                    );
                  })()}
                </View>
              )}

              <Pressable
                onPress={handleSaveGoal}
                disabled={goalSaving}
                style={{ marginTop: 16, backgroundColor: editGoalEnabled ? "#4ade80" : "#2a2e36", borderRadius: 10, padding: 12, alignItems: "center" }}
              >
                {goalSaving
                  ? <ActivityIndicator color="#111" size="small" />
                  : <Text style={{ color: editGoalEnabled ? "#111" : "#A9BDDB", fontWeight: "700" }}>
                      {editGoalEnabled ? "Save Goal" : "Remove Goal"}
                    </Text>
                }
              </Pressable>
            </View>

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

            {maxCards < 999000 && displayCardCount >= maxCards ? (
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
                  You've used {displayCardCount} of {formatLimit(maxCards)} cards.{" "}
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