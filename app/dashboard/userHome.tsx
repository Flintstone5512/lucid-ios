import { useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";

import { useRefocusStore } from "../../store/useRefocusStore";
import { getSharedState } from "../../services/api";
import MetricCard from "../../components/MetricCard";
import UpgradeButton from "../../components/UpgradeButton";
import { LucidTheme } from "../../constants/lucidTheme";

export default function UserDashboard() {
  const { setStatePatch, streak, usage } = useRefocusStore();
  const { plan } = useRefocusStore();

  useEffect(() => {
    async function load() {
      try {
        const state = await getSharedState();
        setStatePatch({
          ...state,
          context: state.context,
        });
      } catch (err) {
        console.log("Dashboard load error:", err);
      }
    }

    load();
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* =========================
         🔥 HEADER CARD
      ========================= */}
      <View style={styles.headerCard}>
        <Text style={styles.title}>Your Progress</Text>
        <Text style={styles.subtitle}>
          Earn your scroll. Build your focus.
        </Text>
      </View>

      {/* =========================
         🔥 CORE METRICS
      ========================= */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Today</Text>

        <View style={styles.row}>
          <MetricCard
            label="🔥 Streak"
            value={streak?.currentStreak || 0}
            onPress={() => router.push("/streak")}
          />

          <MetricCard
            label="⏱ Time Earned"
            value={`${usage?.minutes || 0}m`}
            onPress={() => router.push("/wasted")}
          />
          <MetricCard
  label="⚡ XP"
  value={usage?.xp || 0}
/>

<MetricCard
  label="🏆 Level"
  value={Math.floor((usage?.xp || 0) / 100)}
/>
        </View>
      </View>

      {/* =========================
         🔥 ACTION (PRIMARY CTA)
      ========================= */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Focus Session</Text>

        <Text style={styles.helper}>
          Complete cards to unlock your apps
        </Text>

        <Pressable
          onPress={() => router.push("/session")}
          style={styles.cta}
        >
          <Text style={styles.ctaText}>Start Session</Text>
        </Pressable>
      </View>

      {/* =========================
         🔥 FEATURES GRID
      ========================= */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Tools</Text>

        <View style={styles.row}>
          <MetricCard
            label="🏆 Leaderboard"
            value="View"
            onPress={() => router.push("/leaderboard")}
          />

          <MetricCard
            label="🧘 Detox Mode"
            value="Manage"
            onPress={() => router.push("/detox")}
          />
        </View>
      </View>

      {/* =========================
         🔥 SOCIAL PROOF / COMPETITION
      ========================= */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Top Performers</Text>

        <View style={styles.leaderboardCard}>
          <Text style={styles.leaderText}>🥇 Alex — 420 pts</Text>
          <Text style={styles.leaderText}>🥈 You — 180 pts</Text>
          <Text style={styles.leaderHint}>
            You're climbing. Keep going.
          </Text>
        </View>

        {plan === "free" && (
          <View style={{ marginTop: 12 }}>
            <UpgradeButton label="Unlock Full Leaderboard" />
          </View>
        )}
      </View>

      {/* =========================
         🔥 EMPTY STATE (FALLBACK UX)
      ========================= */}
      {!streak && !usage && (
        <View style={styles.card}>
          <Text style={styles.emptyTitle}>No activity yet</Text>
          <Text style={styles.emptySubtitle}>
            Start your first session to begin tracking progress
          </Text>
        </View>
      )}
    </ScrollView>
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

  cta: {
    backgroundColor: "#D86732",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
  },

  ctaText: {
    fontWeight: "800",
    fontSize: 16,
    color: "#0B0B0F",
  },

  leaderboardCard: {
    backgroundColor: "#0e1424",
    padding: 16,
    borderRadius: 14,
  },

  leaderText: {
    color: "#fff",
    marginBottom: 6,
    fontWeight: "700",
  },

  leaderHint: {
    color: "#A9BDDB",
    marginTop: 6,
    fontSize: 12,
  },

  emptyTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },

  emptySubtitle: {
    color: "#A9BDDB",
    marginTop: 6,
    textAlign: "center",
  },
});