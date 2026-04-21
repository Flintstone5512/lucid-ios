import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "enforcementMode";

export async function saveMode(mode: string) {
  await AsyncStorage.setItem(KEY, mode);
}

export async function loadMode() {
  return await AsyncStorage.getItem(KEY);
}