import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  onboardingComplete: "onboardingComplete",
  hasSeenIntro: "hasSeenIntro",
};

export async function setOnboardingComplete(value: boolean) {
  await AsyncStorage.setItem(KEYS.onboardingComplete, JSON.stringify(value));
}

export async function getOnboardingComplete() {
  const raw = await AsyncStorage.getItem(KEYS.onboardingComplete);
  return raw ? JSON.parse(raw) : false;
}

export async function setHasSeenIntro(value: boolean) {
  await AsyncStorage.setItem(KEYS.hasSeenIntro, JSON.stringify(value));
}

export async function getHasSeenIntro(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEYS.hasSeenIntro);
  return raw ? JSON.parse(raw) : false;
}