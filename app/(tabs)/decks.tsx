import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";

import { generateDeck, importAnkiDeck } from "../../services/aiDeckService";
import { useRefocusStore } from "../../store/useRefocusStore";
import { saveSelectedDeck } from "../../services/deckStorage";
import { showPaywall } from "../../services/paywallService";
import api from "../../services/api";
import UpgradeButton from "../../components/UpgradeButton";
import { refreshUserContext } from "../../services/contextService";

export default function DecksScreen() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [decks, setDecks] = useState<any[]>([]);

  const { selectedDeckId, setSelectedDeck } = useRefocusStore();
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

  const shouldShowAdsUpgrade =
    plan === "free" &&
    adMode !== "ad_supported" &&
    displayDeckCount >= Math.max(1, maxDecks - 1);

  useEffect(() => {
    loadDecks();
  }, []);

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
      await generateDeck(prompt.trim());
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

  async function handleUpload() {
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (result.canceled) return;

    const file = result.assets[0];
    const state = useRefocusStore.getState();
    const currentMaxDecks = state.limits?.maxDecks ?? 2;
    const liveDeckCount = decks.length;

    if (liveDeckCount >= currentMaxDecks) {
      setStatus("⚠️ Deck limit reached");
      return;
    }

    setLoading(true);
    setStatus("Uploading...");

    try {
      await importAnkiDeck(file);
      await refreshUserContext();
      await loadDecks();

      setStatus("✅ Deck imported");
    } catch (err) {
      console.error(err);
      setStatus("❌ Upload failed");
    } finally {
      setLoading(false);
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

        <Pressable
          onPress={handleGenerate}
          style={{
            backgroundColor: "#D86732",
            padding: 16,
            borderRadius: 14,
            marginTop: 12,
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

          return (
            <Pressable
              key={deck._id}
              onPress={() => selectDeck(deck._id)}
              style={{
                backgroundColor:
                  selectedDeckId === deck._id ? "#D86732" : "#1b2540",
                padding: 14,
                borderRadius: 12,
                marginTop: 10,
              }}
            >
              <Text
                style={{
                  color: selectedDeckId === deck._id ? "#111" : "#fff",
                  fontWeight: "700",
                  fontSize: 15,
                }}
              >
                {deck.name}
              </Text>

              <Text
                style={{
                  color: selectedDeckId === deck._id ? "#2a2a2a" : "#A9BDDB",
                  marginTop: 6,
                  fontSize: 12,
                }}
              >
                {deckCardCount} cards
              </Text>
            </Pressable>
          );
        })
      )}

      {/* STATUS */}
      {loading && <ActivityIndicator style={{ marginTop: 20 }} />}

      {!!status && (
        <Text style={{ marginTop: 20, color: "#A9BDDB" }}>
          {status}
        </Text>
      )}
    </ScrollView>
  );
}