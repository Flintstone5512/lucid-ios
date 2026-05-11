import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import MetricCard from "../../components/MetricCard";
import SimpleBar from "../../components/SimpleBar";
import { LucidTheme } from "../../constants/lucidTheme";
import { getAnalyticsDashboard } from "../../services/analyticsService";
import { useRefocusStore } from "../../store/useRefocusStore";

export default function AnalyticsScreen() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);

  const { context } = useRefocusStore();
  const role = context?.role || "solo";

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await getAnalyticsDashboard();

    if (role === "parent") {
      setChildren(res.children || []);
    } else {
      setDashboard(res.dashboard);
    }
  }

  /* =========================
     🔥 RESOLVE DASHBOARD
  ========================= */

  const selectedChild =
    role === "parent" ? children[selectedChildIndex] : null;

  const data =
    role === "parent"
      ? selectedChild?.dashboard
      : dashboard;

  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={styles.loading}>Loading analytics...</Text>
      </View>
    );
  }

  const maxCards = Math.max(
    ...(data.dailySeries || []).map((d: any) => d.cardsReviewed),
    1
  );

  return (
    <ScrollView style={styles.container}>
      
      {/* =========================
         🔥 HEADER
      ========================= */}
      <View style={styles.headerCard}>
        <Text style={styles.title}>
          {role === "parent"
            ? selectedChild?.name || "Child Analytics"
            : "Your Analytics"}
        </Text>

        <Text style={styles.subtitle}>
          {role === "parent"
            ? "Monitor behavior and learning patterns"
            : "Track your focus and growth"}
        </Text>
      </View>

      {/* =========================
         🔥 CHILD SELECTOR
      ========================= */}
      {role === "parent" && children.length > 0 && (
        <ScrollView horizontal style={styles.childSelector}>
          {children.map((child, i) => (
            <Pressable
              key={child.childId}
              onPress={() => setSelectedChildIndex(i)}
              style={[
                styles.childTab,
                i === selectedChildIndex && styles.childTabActive,
              ]}
            >
              <Text style={styles.childText}>{child.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* =========================
         🔥 OVERVIEW
      ========================= */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Overview</Text>

        <View style={styles.row}>
          <MetricCard
            label="🔥 Current Streak"
            value={data.currentStreak || 0}
          />
          <MetricCard
            label="🏆 Longest"
            value={data.longestStreak || 0}
          />
        </View>
      </View>

      {/* =========================
         🔥 TODAY
      ========================= */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Today</Text>

        <View style={styles.row}>
          <MetricCard
            label="Cards"
            value={data.today?.cardsReviewed || 0}
          />
          <MetricCard
            label="Study"
            value={`${data.today?.studyMinutes || 0}m`}
          />
        </View>

        <View style={styles.row}>
          <MetricCard
            label="Wasted"
            value={`${data.today?.wastedMinutes || 0}m`}
          />
          <MetricCard
            label="Earned"
            value={`${data.today?.unlockMinutesEarned || 0}m`}
          />
        </View>
      </View>

      {/* =========================
         🔥 BEHAVIOR
      ========================= */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          {role === "parent" ? "Child Behavior" : "Behavior"}
        </Text>

        <MetricCard
          label="Focus Efficiency"
          value={`${Math.round(
            (data.behavior?.conversionRate || 0) * 100
          )}%`}
        />

        <Text style={styles.helper}>
          {role === "parent"
            ? "How effectively your child converts screen time into learning"
            : "How often you turn scrolling into learning"}
        </Text>
      </View>

      {/* =========================
         🔥 TREND
      ========================= */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>7-Day Activity</Text>

        {(data.dailySeries || []).length === 0 ? (
          <Text style={styles.empty}>
            No data yet. Start a session to track progress.
          </Text>
        ) : (
          data.dailySeries.map((day: any) => (
            <SimpleBar
              key={day.dateKey}
              label={day.dateKey}
              value={day.cardsReviewed}
              max={maxCards}
            />
          ))
        )}
      </View>
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

  childSelector: {
    marginBottom: 12,
  },

  childTab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
    backgroundColor: "#1b2540",
    borderRadius: 12,
  },

  childTabActive: {
    backgroundColor: "#D86732",
  },

  childText: {
    color: "white",
    fontWeight: "700",
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

  row: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },

  helper: {
    color: "#A9BDDB",
    marginTop: 10,
    fontSize: 12,
  },

  empty: {
    color: "#A9BDDB",
    textAlign: "center",
    marginTop: 10,
  },
});