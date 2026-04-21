import { useEffect, useState } from "react";
import { ScrollView, Text, View, StyleSheet } from "react-native";

import { getAnalyticsDashboard } from "../../services/analyticsService";
import { useRefocusStore } from "../../store/useRefocusStore";
import MetricCard from "../../components/MetricCard";
import SimpleBar from "../../components/SimpleBar";
import { LucidTheme } from "../../constants/lucidTheme";

export default function AnalyticsScreen() {
  const [dashboard, setDashboard] = useState<any>(null);

  const { context } = useRefocusStore();
  const role = context?.role || "solo"; // 🔥 ROLE DETECTION

  useEffect(() => {
    getAnalyticsDashboard().then((res) =>
      setDashboard(res.dashboard)
    );
  }, []);

  if (!dashboard) {
    return (
      <View style={styles.center}>
        <Text style={styles.loading}>Loading analytics...</Text>
      </View>
    );
  }

  const maxCards = Math.max(
    ...(dashboard.dailySeries || []).map(
      (d: any) => d.cardsReviewed
    ),
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
            ? "Child Analytics"
            : role === "child"
            ? "Your Progress"
            : "Your Analytics"}
        </Text>

        <Text style={styles.subtitle}>
          {role === "parent"
            ? "Monitor behavior and learning patterns"
            : "Track your focus and growth"}
        </Text>
      </View>

      {/* =========================
         🔥 OVERVIEW
      ========================= */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Overview</Text>

        <View style={styles.row}>
          <MetricCard
            label="🔥 Current Streak"
            value={dashboard.currentStreak || 0}
          />
          <MetricCard
            label="🏆 Longest"
            value={dashboard.longestStreak || 0}
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
            value={dashboard.today?.cardsReviewed || 0}
          />
          <MetricCard
            label="Study"
            value={`${dashboard.today?.studyMinutes || 0}m`}
          />
        </View>

        <View style={styles.row}>
          <MetricCard
            label="Wasted"
            value={`${dashboard.today?.wastedMinutes || 0}m`}
          />
          <MetricCard
            label="Earned"
            value={`${dashboard.today?.unlockMinutesEarned || 0}m`}
          />
        </View>
      </View>

      {/* =========================
         🔥 ROLE-SPECIFIC INSIGHTS
      ========================= */}

      {/* 🔵 SOLO / CHILD */}
      {role !== "parent" && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Behavior</Text>

          <MetricCard
            label="Conversion Rate"
            value={`${Math.round(
              (dashboard.behavior?.conversionRate || 0) * 100
            )}%`}
          />

          <Text style={styles.helper}>
            How often you turn scrolling into learning
          </Text>
        </View>
      )}

      {/* 🟣 PARENT VIEW */}
      {role === "parent" && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Child Behavior</Text>

          <MetricCard
            label="Focus Efficiency"
            value={`${Math.round(
              (dashboard.behavior?.conversionRate || 0) * 100
            )}%`}
          />

          <MetricCard
            label="Screen Waste"
            value={`${dashboard.today?.wastedMinutes || 0}m`}
          />

          <Text style={styles.helper}>
            Measures how effectively your child converts screen time into learning
          </Text>
        </View>
      )}

      {/* =========================
         🔥 TREND GRAPH
      ========================= */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          7-Day Activity
        </Text>

        {(dashboard.dailySeries || []).length === 0 ? (
          <Text style={styles.empty}>
            No data yet. Start a session to track progress.
          </Text>
        ) : (
          dashboard.dailySeries.map((day: any) => (
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