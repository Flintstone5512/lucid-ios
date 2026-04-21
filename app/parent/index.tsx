import { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
} from "react-native";

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

export default function ParentDashboard() {
  const [data, setData] = useState<any>(null);
  const [code, setCode] = useState("");
  const [focusMode, setFocusMode] = useState("soft");

  const { context, limits } = useRefocusStore();

  const children = context?.account?.children || [];
  const maxChildren = limits?.maxChildren ?? 0;
  const plan = context?.settings?.billing?.plan;

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await getParentDashboard();
      setData(res);
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
        <Text style={styles.sectionTitle}>Global Focus Mode</Text>

        <Text style={styles.helper}>
          Controls how strict enforcement is across all children
        </Text>

        <View style={styles.rowWrap}>
          {["off", "soft", "strict"].map((mode) => (
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

      <Text style={styles.label}>Focus Mode</Text>

      <View style={styles.rowWrap}>
        {["off", "soft", "strict"].map((m) => (
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
});