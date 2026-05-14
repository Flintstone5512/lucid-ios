import { router } from "expo-router";
import { useEffect, useState } from "react";
import { NativeModules } from "react-native";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  applyShield,
  presentAppPicker,
  requestIOSAuthorization,
} from "../../services/nativeBridge";
import { LucidTheme } from "../../constants/lucidTheme";

export default function IOSScreenTimeSetupScreen() {
  const [loading, setLoading] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [appsSelected, setAppsSelected] = useState(false);

  useEffect(() => {
    const relevant = Object.keys(NativeModules).filter(k =>
      k.toLowerCase().includes("screen") ||
      k.toLowerCase().includes("shield") ||
      k.toLowerCase().includes("family") ||
      k.toLowerCase().includes("lucid") ||
      k.toLowerCase().includes("activity")
    );
    console.log("Loaded native modules:", relevant);
    console.log("ScreenTimeAuthorizationModule:", NativeModules.ScreenTimeAuthorizationModule);
    console.log("LucidScreenTimeModule:", NativeModules.LucidScreenTimeModule);
  }, []);

  async function runAuthorization() {
    try {
      setLoading(true);
      const result = await requestIOSAuthorization();
      if (!result.ok) {
        const reason = result.error ?? result.status ?? "Unknown error";
        console.log("Screen Time auth failed:", reason);
        Alert.alert(
          "Screen Time Access Required",
          `Could not request permission automatically.\n\nReason: ${reason}\n\nOpen Settings to enable it manually.`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openURL("App-Prefs:SCREEN_TIME") },
          ]
        );
        return;
      }
      setAuthorized(true);
    } catch (err: any) {
      Alert.alert("Authorization failed", err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function chooseApps() {
    try {
      setLoading(true);
      await presentAppPicker();
      setAppsSelected(true);
    } catch (err: any) {
      Alert.alert("Picker failed", err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function finish() {
    try {
      await applyShield();
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not apply block. Try again.");
    }
  }

  if (Platform.OS !== "ios") return null;

  const canFinish = authorized && appsSelected;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.badge}>SETUP</Text>
          <Text style={styles.title}>Enable App Blocking</Text>
          <Text style={styles.subtitle}>
            Complete these steps so Lucid can block distracting apps until you earn your scroll time.
          </Text>
        </View>

        {/* Steps */}
        <View style={styles.steps}>

          {/* Step 1 */}
          <View style={styles.card}>
            <View style={styles.stepRow}>
              <View style={[styles.stepBadge, authorized && styles.stepBadgeDone]}>
                <Text style={styles.stepNum}>{authorized ? "✓" : "1"}</Text>
              </View>
              <View style={styles.stepText}>
                <Text style={styles.stepTitle}>Allow Screen Time Access</Text>
                <Text style={styles.stepDesc}>
                  Grants Lucid permission to manage app restrictions on your device.
                </Text>
              </View>
            </View>
            <Pressable
              style={[styles.btn, authorized && styles.btnDone, loading && styles.btnDisabled]}
              onPress={runAuthorization}
              disabled={loading || authorized}
            >
              <Text style={[styles.btnText, authorized && styles.btnTextDone]}>
                {authorized ? "Access Granted" : "Grant Access"}
              </Text>
            </Pressable>
          </View>

          {/* Step 2 */}
          <View style={[styles.card, !authorized && styles.cardLocked]}>
            <View style={styles.stepRow}>
              <View style={[styles.stepBadge, appsSelected && styles.stepBadgeDone]}>
                <Text style={styles.stepNum}>{appsSelected ? "✓" : "2"}</Text>
              </View>
              <View style={styles.stepText}>
                <Text style={styles.stepTitle}>Choose Apps to Block</Text>
                <Text style={styles.stepDesc}>
                  Select TikTok, Instagram, and any other apps you want Lucid to protect.
                </Text>
              </View>
            </View>
            <Pressable
              style={[styles.btn, appsSelected && styles.btnDone, (!authorized || loading) && styles.btnDisabled]}
              onPress={chooseApps}
              disabled={!authorized || loading || appsSelected}
            >
              <Text style={[styles.btnText, appsSelected && styles.btnTextDone]}>
                {appsSelected ? "Apps Selected" : "Choose Apps"}
              </Text>
            </Pressable>
          </View>

        </View>

        {/* Footer CTA */}
        <View style={styles.footer}>
          <Pressable
            style={[styles.finishBtn, !canFinish && styles.finishBtnDisabled]}
            onPress={finish}
            disabled={!canFinish}
          >
            <Text style={styles.finishBtnText}>
              {canFinish ? "Activate Blocking" : "Complete steps above"}
            </Text>
          </Pressable>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: LucidTheme.bg,
  },
  container: {
    flex: 1,
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  badge: {
    color: LucidTheme.accent,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    color: LucidTheme.text,
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 10,
  },
  subtitle: {
    color: LucidTheme.sub,
    fontSize: 15,
    lineHeight: 22,
  },
  steps: {
    flex: 1,
    gap: 16,
  },
  card: {
    backgroundColor: LucidTheme.card,
    borderRadius: 16,
    padding: 18,
    gap: 14,
  },
  cardLocked: {
    opacity: 0.5,
  },
  stepRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0e1424",
    borderWidth: 2,
    borderColor: LucidTheme.sub,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeDone: {
    borderColor: LucidTheme.accent,
    backgroundColor: LucidTheme.accent,
  },
  stepNum: {
    color: LucidTheme.text,
    fontWeight: "800",
    fontSize: 13,
  },
  stepText: {
    flex: 1,
  },
  stepTitle: {
    color: LucidTheme.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  stepDesc: {
    color: LucidTheme.sub,
    fontSize: 13,
    lineHeight: 19,
  },
  btn: {
    backgroundColor: LucidTheme.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnDone: {
    backgroundColor: "#1e3a1e",
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    color: LucidTheme.text,
    fontWeight: "800",
    fontSize: 15,
  },
  btnTextDone: {
    color: "#4CAF50",
  },
  footer: {
    paddingTop: 24,
  },
  finishBtn: {
    backgroundColor: LucidTheme.accent,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  finishBtnDisabled: {
    backgroundColor: LucidTheme.card,
  },
  finishBtnText: {
    color: LucidTheme.text,
    fontSize: 16,
    fontWeight: "800",
  },
});
