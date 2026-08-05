import { router } from "expo-router";
import { useEffect, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  hasOverlayPermission,
  hasUsageAccess,
  isAccessibilityEnabled,
  requestAndroidAccessibilityAccess,
  requestAndroidOverlayAccess,
  requestAndroidUsageAccess,
} from "../../services/nativePermissions";

type PermStatus = {
  accessibility: boolean;
  overlay: boolean;
  usage: boolean;
};

export default function AndroidPermissionsSetupScreen() {
  const [status, setStatus] = useState<PermStatus>({
    accessibility: false,
    overlay: false,
    usage: false,
  });
  const [checking, setChecking] = useState(false);

  async function checkAll() {
    setChecking(true);
    try {
      const [a, o, u] = await Promise.all([
        isAccessibilityEnabled(),
        hasOverlayPermission(),
        hasUsageAccess(),
      ]);

      const next: PermStatus = {
        accessibility: Boolean(a?.enabled),
        overlay: Boolean(o?.granted),
        usage: Boolean(u?.granted),
      };

      setStatus(next);

      if (next.accessibility && next.overlay && next.usage) {
        router.replace("/(tabs)");
      }
    } catch (err) {
      console.log("Permission check failed:", err);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    checkAll();
  }, []);

  // Re-check automatically when user returns from Android settings
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") checkAll();
    });
    return () => sub.remove();
  }, []);

  async function openNext() {
    if (!status.accessibility) {
      await requestAndroidAccessibilityAccess();
    } else if (!status.overlay) {
      await requestAndroidOverlayAccess();
    } else if (!status.usage) {
      await requestAndroidUsageAccess();
    }
  }

  const allGranted = status.accessibility && status.overlay && status.usage;

  const nextLabel = !status.accessibility
    ? "Enable Accessibility Service"
    : !status.overlay
    ? "Allow Display Over Apps"
    : "Enable Usage Access";

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Set Up Blocking</Text>
        <Text style={styles.subtitle}>
          ScrollTax needs 3 permissions to detect and block distracting apps on
          Android.
        </Text>

        <View style={styles.permList}>
          <PermRow
            step={1}
            label="Accessibility Service"
            description="Detects when a blocked app opens"
            granted={status.accessibility}
          />
          <PermRow
            step={2}
            label="Display Over Other Apps"
            description="Shows the blocking overlay screen"
            granted={status.overlay}
          />
          <PermRow
            step={3}
            label="Usage Access"
            description="Identifies which app is in the foreground"
            granted={status.usage}
          />
        </View>

        {!allGranted ? (
          <Pressable style={styles.primaryBtn} onPress={openNext}>
            <Text style={styles.primaryBtnText}>{nextLabel}</Text>
          </Pressable>
        ) : (
          <View style={styles.doneContainer}>
            <Text style={styles.doneText}>All permissions granted!</Text>
          </View>
        )}

        <Pressable
          style={styles.secondaryBtn}
          onPress={checkAll}
          disabled={checking}
        >
          <Text style={styles.secondaryBtnText}>
            {checking ? "Checking..." : "I enabled it — check again"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function PermRow({
  step,
  label,
  description,
  granted,
}: {
  step: number;
  label: string;
  description: string;
  granted: boolean;
}) {
  return (
    <View style={[styles.row, granted && styles.rowGranted]}>
      <View style={[styles.stepBadge, granted && styles.stepBadgeGranted]}>
        <Text style={styles.stepText}>{granted ? "✓" : step}</Text>
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDesc}>{description}</Text>
      </View>
      <Text style={styles.rowStatus}>{granted ? "On" : "Off"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0F1A",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    color: "#A9BDDB",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 36,
  },
  permList: {
    gap: 12,
    marginBottom: 32,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#141B2D",
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: "#1E2A40",
  },
  rowGranted: {
    borderColor: "#2A4A2A",
    backgroundColor: "#111D11",
  },
  stepBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#D86732",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeGranted: {
    backgroundColor: "#2E7D32",
  },
  stepText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  rowDesc: {
    color: "#A9BDDB",
    fontSize: 12,
    marginTop: 2,
  },
  rowStatus: {
    color: "#A9BDDB",
    fontSize: 13,
    fontWeight: "600",
  },
  primaryBtn: {
    backgroundColor: "#D86732",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  doneContainer: {
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  doneText: {
    color: "#4CAF50",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "#A9BDDB",
    fontSize: 14,
    fontWeight: "600",
  },
});
