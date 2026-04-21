import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "selectedDeckId";

export async function saveSelectedDeck(deckId: string) {
  await AsyncStorage.setItem(KEY, deckId);
}

export async function loadSelectedDeck() {
  return await AsyncStorage.getItem(KEY);
}