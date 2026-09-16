import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "selectedDeckId";
const SHUFFLE_MODE_KEY = "shuffleMode";
const SHUFFLE_DECK_IDS_KEY = "shuffleDeckIds";
const ROTATION_MODE_KEY = "rotationMode";
const ROTATION_INDEX_KEY = "rotationIndex";

export async function saveSelectedDeck(deckId: string) {
  await AsyncStorage.setItem(KEY, deckId);
}

export async function loadSelectedDeck() {
  return await AsyncStorage.getItem(KEY);
}

export async function saveShuffleMode(enabled: boolean) {
  await AsyncStorage.setItem(SHUFFLE_MODE_KEY, enabled ? "1" : "0");
}

export async function loadShuffleMode(): Promise<boolean> {
  const val = await AsyncStorage.getItem(SHUFFLE_MODE_KEY);
  return val === "1";
}

export async function saveShuffleDeckIds(ids: string[]) {
  await AsyncStorage.setItem(SHUFFLE_DECK_IDS_KEY, JSON.stringify(ids));
}

export async function loadShuffleDeckIds(): Promise<string[]> {
  const val = await AsyncStorage.getItem(SHUFFLE_DECK_IDS_KEY);
  if (!val) return [];
  try {
    return JSON.parse(val);
  } catch {
    return [];
  }
}

export async function saveRotationMode(enabled: boolean) {
  await AsyncStorage.setItem(ROTATION_MODE_KEY, enabled ? "1" : "0");
}

export async function loadRotationMode(): Promise<boolean> {
  const val = await AsyncStorage.getItem(ROTATION_MODE_KEY);
  return val === "1";
}

export async function saveRotationIndex(index: number) {
  await AsyncStorage.setItem(ROTATION_INDEX_KEY, String(index));
}

export async function loadRotationIndex(): Promise<number> {
  const val = await AsyncStorage.getItem(ROTATION_INDEX_KEY);
  return val ? parseInt(val, 10) : 0;
}