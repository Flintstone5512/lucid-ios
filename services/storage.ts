import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  onboardingComplete: "onboardingComplete",
};

export async function setOnboardingComplete(value: boolean) {
  await AsyncStorage.setItem(KEYS.onboardingComplete, JSON.stringify(value));
}

export async function getOnboardingComplete() {
  const raw = await AsyncStorage.getItem(KEYS.onboardingComplete);
  return raw ? JSON.parse(raw) : false;
}