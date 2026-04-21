import { Alert, Linking } from "react-native";

export function openUpgrade() {
  // 🔥 send to your website pricing page
  Linking.openURL("https://startlucid.com/pricing");
}

export function showPaywall(message: string) {
  Alert.alert(
    "Upgrade Required",
    message,
    [
      { text: "Cancel", style: "cancel" },
      { text: "Upgrade", onPress: openUpgrade },
    ]
  );
}