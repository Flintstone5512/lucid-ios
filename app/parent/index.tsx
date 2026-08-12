import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  ScrollView,
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  Platform,
} from "react-native";

function timeAgoLabel(dateStr: string | null): string {
  if (!dateStr) return "never";
  const ms = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 1) return "less than an hour ago";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

import {
  getParentDashboard,
  updateChildRestrictions,
  generateLinkCode,
  updateParentFocusMode,
} from "../../services/parentService";

import { useRefocusStore } from "../../store/useRefocusStore";
import UpgradeButton from "../../components/UpgradeButton";
import MetricCard from "../../components/MetricCard";
import { LucidTheme } from "../../constants/lucidTheme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { applyShield, clearShield, hasSelection } from "../../modules/screen-time";
import {
  setAndroidParentSelfBlocking,
  getAndroidParentSelfBlockingStatus,
} from "../../services/nativeBridge";

const SELF_BLOCK_KEY = "parentSelfBlockingEnabled";
import { router, useFocusEffect } from "expo-router";

export default function ParentDashboard() {
  const [data, setData] = useState<any>(null);
  const [code, setCode] = useState("");
  const [focusMode, setFocusMode] = useState("soft");
  const [selfBlocking, setSelfBlocking] = useState(false);
  const [selfBlockLoading, setSelfBlockLoading] = useState(false);

  const { context, limits } = useRefocusStore();
  const alertedRef = useRef(false);

  const children = context?.account?.children || [];
  const maxChildren = limits?.maxChildren ?? 0;
  const plan = context?.settings?.billing?.plan;

  useEffect(() => {
    load();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === "ios") {
        // Read the stored preference, not the live shield state.
        // The shield may be temporarily cleared during an unlock window after a
        // session — that doesn't mean the user disabled self-blocking.
        AsyncStorage.getItem(SELF_BLOCK_KEY).then((val) => {
          setSelfBlocking(val === "true");
        }).catch(() => {});
      } else if (Platform.OS === "android") {
        getAndroidParentSelfBlockingStatus().then((res) => {
          setSelfBlocking(!!res?.enabled);
        }).catch(() => {});
      }
    }, [])
  );

  async function load() {
    try {
      const res = await getParentDashboard();
      setData(res);

      if (!alertedRef.current) {
        const inactive = (res.children || []).filter((c: any) => c.isAppActive === false);
        if (inactive.length > 0) {
          alertedRef.current = true;
          const names = inactive.map((c: any) => c.name || "Unnamed").join(", ");
          Alert.alert(
            "App May Have Been Uninstalled",
            `${names} hasn't opened Lucid in over 24 hours. They may have removed the app from their device.`,
            [{ text: "OK" }]
          );
        }
      }
    } catch (err) {
      console.log("Parent dashboard error:", err);
    }
  }

  async function handleGenerateCode() {
    const res = await generateLinkCode();
    setCode(res.code);
  }

  async function saveParentMode(mode: string) {
    await updateParentFocusMode(mode as any);
    setFocusMode(mode);
  }

  async function toggleSelfBlocking() {
    try {
      setSelfBlockLoading(true);
      if (selfBlocking) {
        await clearShield();
        await AsyncStorage.setItem(SELF_BLOCK_KEY, "false");
        setSelfBlocking(false);
      } else {
        // Check whether the user has ever selected apps to block.
        // Don't use getShieldStatus() here — the shield may be temporarily
        // cleared during an unlock window even when apps are selected, which
        // would give a false "no selection" result and send the user to setup.
        const selRes = await hasSelection().catch(() => null);
        if (selRes?.hasSelection) {
          await AsyncStorage.setItem(SELF_BLOCK_KEY, "true");
          // applyShield() skips silently when an unlock window is active — that
          // is fine; it will reapply on the next foreground once the window expires.
          await applyShield().catch(() => {});
          setSelfBlocking(true);
        } else {
          // No apps selected yet — send to setup so the user can pick them.
          router.push("/screens/IOSScreenTimeSetupScreen");
        }
      }
    } catch {
      // ignore
    } finally {
      setSelfBlockLoading(false);
    }
  }

  async function toggleAndroidSelfBlocking() {
    try {
      setSelfBlockLoading(true);
      const next = !selfBlocking;
      await setAndroidParentSelfBlocking(next);
      setSelfBlocking(next);
    } catch {
      // ignore
    } finally {
      setSelfBlockLoading(false);
    }
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={styles.loading}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      
      {/* =========================
         🔥 HEADER CARD
      ========================= */}
      <View style={styles.headerCard}>
        <Text style={styles.title}>Parent Control Center</Text>
        <Text style={styles.subtitle}>
          Manage screen time, learning, and behavior
        </Text>
      </View>

      {/* =========================
         🔥 INSIGHTS (TOP PRIORITY)
      ========================= */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Overview</Text>

        <View style={styles.row}>
          <MetricCard label="Children" value={children.length} />
          <MetricCard
            label="Active Today"
            value={
              data.children?.filter(
                (c: any) => c?.today?.wastedMinutes > 0
              ).length || 0
            }
          />
        </View>
      </View>

      {/* =========================
         🔥 CHILDREN
      ========================= */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Children</Text>

        {data.children?.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No children connected</Text>
            <Text style={styles.emptySubtitle}>
              Generate a code below and link your child's device
            </Text>
          </View>
        ) : (
          data.children.map((child: any) => (
            <ChildCard key={child.userId} child={child} reload={load} />
          ))
        )}
      </View>

      {/* =========================
         🔥 GLOBAL CONTROL
      ========================= */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Global Blocking Intensity</Text>

        <Text style={styles.helper}>
          Controls how aggressively Lucid interrupts scrolling for all children on this account
        </Text>

        <View style={styles.rowWrap}>
          {["soft", "strict"].map((mode) => (
            <Pressable
              key={mode}
              onPress={() => saveParentMode(mode)}
              style={[
                styles.modeBtn,
                focusMode === mode && styles.modeActive,
              ]}
            >
              <Text
                style={{
                  color: focusMode === mode ? "#111" : "#fff",
                  fontWeight: "800",
                }}
              >
                {mode.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* =========================
         🔥 iOS: BLOCK MY OWN DEVICE
      ========================= */}
      {Platform.OS === "ios" && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Block My Own Device</Text>
          <Text style={styles.helper}>
            As a parent, you can also block social apps on this device using the same system.
          </Text>

          <Pressable
            disabled={selfBlockLoading}
            onPress={toggleSelfBlocking}
            style={[
              styles.bigToggle,
              selfBlocking ? styles.toggleOn : styles.toggleOff,
              selfBlockLoading && { opacity: 0.5 },
            ]}
          >
            <Text style={styles.toggleText}>
              {selfBlockLoading
                ? "Updating..."
                : selfBlocking
                ? "🟢 Self-Blocking ON"
                : "🔴 Self-Blocking OFF"}
            </Text>
          </Pressable>

          <Pressable
            style={styles.secondaryBtn}
            onPress={() => router.push("/screens/IOSScreenTimeSetupScreen")}
          >
            <Text style={styles.secondaryBtnText}>Choose Apps to Block</Text>
          </Pressable>
        </View>
      )}

      {/* =========================
         🔥 ANDROID: BLOCK MY OWN DEVICE
      ========================= */}
      {Platform.OS === "android" && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Block My Own Device</Text>
          <Text style={styles.helper}>
            As a parent, you can also block social apps on this device. The
            accessibility service will intercept them just like it does for
            your children.
          </Text>

          <Pressable
            disabled={selfBlockLoading}
            onPress={toggleAndroidSelfBlocking}
            style={[
              styles.bigToggle,
              selfBlocking ? styles.toggleOn : styles.toggleOff,
              selfBlockLoading && { opacity: 0.5 },
            ]}
          >
            <Text style={styles.toggleText}>
              {selfBlockLoading
                ? "Updating..."
                : selfBlocking
                ? "🟢 Self-Blocking ON"
                : "🔴 Self-Blocking OFF"}
            </Text>
          </Pressable>
        </View>
      )}

      {/* =========================
         🔥 ADD CHILD
      ========================= */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Add Child</Text>

        <Text style={styles.helper}>
          Share this code with your child to connect their device
        </Text>

        <Pressable style={styles.primaryBtn} onPress={handleGenerateCode}>
          <Text style={styles.primaryBtnText}>Generate Link Code</Text>
        </Pressable>

        {!!code && (
          <View style={styles.codeBox}>
            <Text style={styles.code}>{code}</Text>
          </View>
        )}
      </View>

      {/* =========================
         🔥 UPGRADE
      ========================= */}
      {maxChildren > 0 && children.length >= maxChildren - 1 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Upgrade</Text>

          <Text style={styles.helper}>
            Add more children and unlock advanced controls
          </Text>

          <UpgradeButton label="Upgrade Family Plan" />
        </View>
      )}
    </ScrollView>
  );
}

/* =========================
   🔥 CHILD CARD
========================= */

function ChildCard({ child, reload }: any) {
  const [limit, setLimit] = useState(
    String(child.restrictions?.maxDailyMinutes || 60)
  );
  const [mode, setMode] = useState(child.focusMode || "soft");

  async function save() {
    await updateChildRestrictions({
      childId: child.userId,
      restrictions: {
        maxDailyMinutes: Number(limit),
      },
      focusMode: mode,
    });

    reload();
  }

  return (
    <View style={styles.childCard}>
      <Text style={styles.childName}>{child.name || "Unnamed Child"}</Text>

      {child.isAppActive === false && (
        <View style={styles.uninstalledBanner}>
          <Text style={styles.uninstalledTitle}>⚠️ App Not Detected</Text>
          <Text style={styles.uninstalledBody}>
            Last seen {timeAgoLabel(child.lastSeen)} — app may have been uninstalled.
          </Text>
        </View>
      )}

      <Text style={styles.meta}>
        🔥 Streak: {child.streak?.currentStreak || 0}
      </Text>

      <Text style={styles.meta}>
        📱 Usage: {child.today?.wastedMinutes || 0} min
      </Text>

      <Text
        style={{
          color: child.limitReached ? "#D86732" : "#F8C373",
          fontWeight: "800",
          marginTop: 6,
        }}
      >
        {child.limitReached ? "Limit reached" : "Within limit"}
      </Text>

      <Text style={styles.label}>Daily Limit (minutes)</Text>

      <TextInput
        value={limit}
        onChangeText={setLimit}
        keyboardType="numeric"
        style={styles.input}
      />

      <Text style={styles.label}>Blocking Intensity</Text>

      <View style={styles.rowWrap}>
        {["soft", "strict"].map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            style={[
              styles.modeBtn,
              mode === m && styles.modeActive,
            ]}
          >
            <Text style={{ color: mode === m ? "#111" : "#fff" }}>
              {m}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.primaryBtn} onPress={save}>
        <Text style={styles.primaryBtnText}>Save Changes</Text>
      </Pressable>
    </View>
  );
}

/* =========================
   🔥 STYLES
========================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LucidTheme.bg,
    padding: 24,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: LucidTheme.bg,
  },

  loading: {
    color: "#A9BDDB",
  },

  headerCard: {
    backgroundColor: "#1b2540",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },

  title: {
    color: "white",
    fontSize: 26,
    fontWeight: "800",
  },

  subtitle: {
    color: "#A9BDDB",
    marginTop: 6,
  },

  card: {
    backgroundColor: "#1b2540",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },

  childCard: {
    backgroundColor: "#0e1424",
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
  },

  sectionTitle: {
    color: "#D86732",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10,
  },

  helper: {
    color: "#A9BDDB",
    marginBottom: 10,
  },

  row: {
    flexDirection: "row",
    gap: 10,
  },

  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  childName: {
    color: "white",
    fontSize: 18,
    fontWeight: "800",
  },

  meta: {
    color: "#A9BDDB",
    marginTop: 4,
  },

  label: {
    color: "#A9BDDB",
    marginTop: 10,
    fontSize: 12,
  },

  input: {
    backgroundColor: "#151820",
    color: "white",
    padding: 10,
    borderRadius: 10,
    marginTop: 6,
  },

  primaryBtn: {
    backgroundColor: "#D86732",
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
  },

  primaryBtnText: {
    textAlign: "center",
    fontWeight: "800",
    color: "#111",
  },

  codeBox: {
    marginTop: 12,
    backgroundColor: "#0e1424",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },

  code: {
    color: "#D86732",
    fontSize: 22,
    fontWeight: "800",
  },

  emptyState: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#0e1424",
    alignItems: "center",
  },

  emptyTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "800",
  },

  emptySubtitle: {
    color: "#A9BDDB",
    marginTop: 6,
    textAlign: "center",
  },

  modeBtn: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#151820",
  },

  modeActive: {
    backgroundColor: "#D86732",
  },

  bigToggle: {
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 6,
    marginBottom: 8,
  },

  toggleOn: {
    backgroundColor: "#1DB954",
  },

  toggleOff: {
    backgroundColor: "#FF4D4D",
  },

  toggleText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },

  secondaryBtn: {
    backgroundColor: "#151820",
    padding: 14,
    borderRadius: 12,
    marginTop: 4,
  },

  secondaryBtnText: {
    color: "white",
    textAlign: "center",
    fontWeight: "700",
  },

  uninstalledBanner: {
    backgroundColor: "#3b0d0d",
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#ef4444",
  },

  uninstalledTitle: {
    color: "#fca5a5",
    fontWeight: "800",
    fontSize: 13,
    marginBottom: 2,
  },

  uninstalledBody: {
    color: "#fca5a5",
    fontSize: 12,
    lineHeight: 17,
  },
});