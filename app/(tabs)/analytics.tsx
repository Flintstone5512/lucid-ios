import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
  Pressable,
  RefreshControl,
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
  const [parentDashboard, setParentDashboard] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const { context } = useRefocusStore();
  const role = context?.role || "solo";

  useFocusEffect(
    useCallback(() => {
      load();
    }, [role])
  );

  async function load() {
    setLoadError(false);
    try {
      const res = await getAnalyticsDashboard();
      console.log("[ANALYTICS] raw response:", JSON.stringify(res).slice(0, 500));

      // Resolve the dashboard object from whichever shape the API returns:
      //   { dashboard: {...} }  — original expected shape
      //   { data: {...} }       — common wrapper shape
      //   { analytics: {...} }  — alternate key
      //   flat object           — top-level fields directly
      const dashboardData =
        res?.dashboard ??
        res?.data?.dashboard ??
        res?.analytics ??
        res?.data ??
        res;

      console.log("[ANALYTICS] resolved dashboardData keys:", Object.keys(dashboardData || {}));

      if (role === "parent") {
        setChildren(res?.children || res?.data?.children || []);
        setParentDashboard(dashboardData);
      } else {
        setDashboard(dashboardData);
      }
    } catch (err: any) {
      console.error("[ANALYTICS] load failed:", err?.message, err?.response?.status, err?.response?.data);
      setLoadError(true);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  /* =========================
     🔥 RESOLVE TABS + DASHBOARD
  ========================= */

  // Build unified tab list: parent's own entry first (if self-blocking), then children
  const tabs = role === "parent"
    ? [
        ...(parentDashboard ? [{ name: "My Stats", dashboard: parentDashboard, isSelf: true }] : []),
        ...children.map((c) => ({ name: c.name, dashboard: c.dashboard, isSelf: false, childId: c.childId })),
      ]
    : [];

  const selectedTab = role === "parent" ? tabs[selectedTabIndex] : null;

  const data = role === "parent" ? (selectedTab?.dashboard ?? null) : dashboard;
// 🔥 EMPTY STATE (PARENT — NO CHILDREN, NO SELF DATA)
if (role === "parent" && tabs.length === 0) {
  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#D86732" />}
    >

      {/* =========================
         🔥 HEADER
      ========================= */}
      <View style={styles.headerCard}>
        <Text style={styles.title}>Child Analytics</Text>
        <Text style={styles.subtitle}>
          Track focus, learning, and screen habits
        </Text>
      </View>

      {/* =========================
         🔥 MOCK PREVIEW
      ========================= */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Preview</Text>

        <View style={styles.row}>
          <MetricCard label="🔥 Streak" value="—" />
          <MetricCard label="⏱ Study" value="—" />
        </View>

        <View style={styles.row}>
          <MetricCard label="📱 Wasted" value="—" />
          <MetricCard label="⚡ Earned" value="—" />
        </View>

        <Text style={styles.helper}>
          See how your child converts screen time into learning
        </Text>
      </View>

      {/* =========================
         🔥 SAMPLE TREND (FAKE DATA)
      ========================= */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>7-Day Preview</Text>

        <SimpleBar label="Mon" value={3} max={10} />
        <SimpleBar label="Tue" value={5} max={10} />
        <SimpleBar label="Wed" value={2} max={10} />
        <SimpleBar label="Thu" value={6} max={10} />
        <SimpleBar label="Fri" value={4} max={10} />

        <Text style={styles.helper}>
          This is what your child’s progress will look like
        </Text>
      </View>

      {/* =========================
         🔥 EXPLANATION
      ========================= */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>What you'll unlock</Text>

        <Text style={styles.helper}>
          • Daily screen time insights{"\n"}
          • Learning streak tracking{"\n"}
          • Focus efficiency score{"\n"}
          • Behavior trends over time
        </Text>
      </View>

      {/* =========================
         🔥 CTA
      ========================= */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Get Started</Text>

        <Text style={styles.helper}>
          Connect your child’s device to begin tracking their activity
        </Text>

        <Text style={{ color: "#D86732", marginTop: 10 }}>
          Most parents connect their first child in under 30 seconds
        </Text>

        <Pressable
          onPress={() => router.push("/parent")}
          style={{
            marginTop: 16,
            backgroundColor: "#D86732",
            padding: 16,
            borderRadius: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ fontWeight: "800", color: "#111" }}>
            Add Your First Child
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
  if (loadError) {
    return (
      <View style={styles.center}>
        <Text style={[styles.loading, { marginBottom: 16 }]}>Failed to load analytics.</Text>
        <Pressable onPress={load} style={{ backgroundColor: "#D86732", padding: 14, borderRadius: 12 }}>
          <Text style={{ color: "#111", fontWeight: "800" }}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  if (!data) {
    return (
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#D86732" />}
      >
        {role === "parent" && tabs.length > 1 && (
          <ScrollView horizontal style={styles.childSelector}>
            {tabs.map((tab, i) => (
              <Pressable
                key={tab.isSelf ? "__self__" : tab.childId}
                onPress={() => setSelectedTabIndex(i)}
                style={[styles.childTab, i === selectedTabIndex && styles.childTabActive]}
              >
                <Text style={styles.childText}>{tab.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
        <View style={[styles.center, { flex: 0, paddingVertical: 60 }]}>
          <Text style={styles.loading}>
            {role === "parent" && selectedTab
              ? `No data yet for ${selectedTab.name}`
              : "Loading analytics..."}
          </Text>
          {role === "parent" && selectedTab && (
            <Text style={[styles.helper, { textAlign: "center", marginTop: 8 }]}>
              {selectedTab.name} hasn't completed a study session yet
            </Text>
          )}
        </View>
      </ScrollView>
    );
  }

  const maxCards = Math.max(
    ...(data.dailySeries || []).map((d: any) => d.cardsReviewed),
    1
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#D86732" />}
    >

      {/* =========================
         🔥 HEADER
      ========================= */}
      <View style={styles.headerCard}>
        <Text style={styles.title}>
          {role === "parent"
            ? selectedTab?.isSelf
              ? "My Analytics"
              : selectedTab?.name || "Child Analytics"
            : "Your Analytics"}
        </Text>

        <Text style={styles.subtitle}>
          {role === "parent"
            ? selectedTab?.isSelf
              ? "Your own flashcard sessions and focus stats"
              : "Monitor behavior and learning patterns"
            : "Track your focus and growth"}
        </Text>
      </View>

      {/* =========================
         🔥 TAB SELECTOR
      ========================= */}
      {role === "parent" && tabs.length > 1 && (
        <ScrollView horizontal style={styles.childSelector}>
          {tabs.map((tab, i) => (
            <Pressable
              key={tab.isSelf ? "__self__" : tab.childId}
              onPress={() => setSelectedTabIndex(i)}
              style={[
                styles.childTab,
                i === selectedTabIndex && styles.childTabActive,
              ]}
            >
              <Text style={styles.childText}>{tab.name}</Text>
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
            label="📚 Cards"
            value={data.today?.cardsReviewed ?? 0}
          />
          <MetricCard
            label="🎯 Study"
            value={
              (data.today?.studyMinutes ?? 0) < 1
                ? `${Math.round((data.today?.studyMinutes ?? 0) * 60)}s`
                : `${Math.round(data.today?.studyMinutes ?? 0)}m`
            }
          />
        </View>

        <View style={styles.row}>
          <MetricCard
            label="📱 Wasted"
            value={`${Math.round(data.today?.wastedMinutes ?? 0)}m`}
          />
          <MetricCard
            label="⚡ Earned"
            value={`${Math.round(data.today?.unlockMinutesEarned ?? 0)}m`}
          />
        </View>
      </View>

      {/* =========================
         🔥 BEHAVIOR
      ========================= */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          {role === "parent" && !selectedTab?.isSelf ? "Child Behavior" : "Behavior"}
        </Text>

        {(() => {
          const rate = Math.min(data.behavior?.conversionRate ?? 0, 1);
          const pct = Math.round(rate * 100);
          const color = pct >= 70 ? "#4CAF50" : pct >= 40 ? "#D86732" : "#F44336";
          return (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                <Text style={{ color: "white", fontSize: 36, fontWeight: "900", marginRight: 10 }}>
                  {pct}%
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#A9BDDB", fontSize: 11, marginBottom: 6 }}>Focus Efficiency</Text>
                  <View style={{ height: 8, backgroundColor: "#111d36", borderRadius: 99 }}>
                    <View style={{ height: 8, width: `${pct}%`, backgroundColor: color, borderRadius: 99, minWidth: pct > 0 ? 4 : 0 }} />
                  </View>
                </View>
              </View>
              <Text style={styles.helper}>
                {pct === 0
                  ? "Complete study sessions to build your efficiency score"
                  : role === "parent" && !selectedTab?.isSelf
                  ? "How effectively your child converts screen time into learning"
                  : "How often you turn scrolling into learning"}
              </Text>
            </>
          );
        })()}
      </View>

      {/* =========================
         🔥 TRENDS
      ========================= */}
      {data.trends && <TrendsCard trends={data.trends} />}

      {/* =========================
         🔥 7-DAY ACTIVITY
      ========================= */}
      <View style={styles.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <Text style={styles.sectionTitle}>7-Day Activity</Text>
          <Text style={{ color: "#A9BDDB", fontSize: 11 }}>cards reviewed</Text>
        </View>

        {(data.dailySeries || []).length === 0 ? (
          <Text style={styles.empty}>
            No data yet. Start a session to track progress.
          </Text>
        ) : (
          <View style={{ flexDirection: "row", gap: 6, alignItems: "flex-end", marginTop: 8 }}>
            {data.dailySeries.map((day: any) => (
              <SimpleBar
                key={day.dateKey}
                label={day.dateKey}
                value={day.cardsReviewed}
                max={maxCards}
              />
            ))}
          </View>
        )}

        {(data.dailySeries || []).length > 0 && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
            <Text style={{ color: "#A9BDDB", fontSize: 11 }}>
              Peak: <Text style={{ color: "white", fontWeight: "700" }}>{maxCards} cards</Text>
            </Text>
            <Text style={{ color: "#A9BDDB", fontSize: 11 }}>
              Total:{" "}
              <Text style={{ color: "white", fontWeight: "700" }}>
                {(data.dailySeries || []).reduce((s: number, d: any) => s + (d.cardsReviewed || 0), 0)} cards
              </Text>
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

/* =========================
   🔥 TRENDS CARD
========================= */

function directionIcon(direction: string, field: "wasted" | "good") {
  if (direction === "same") return { icon: "→", color: "#A9BDDB" };
  const isGood =
    field === "wasted"
      ? direction === "down"   // less wasted = good
      : direction === "up";    // more cards/study = good
  return {
    icon: direction === "up" ? "↑" : "↓",
    color: isGood ? "#4CAF50" : "#F44336",
  };
}

function TrendRow({
  label,
  dayDelta,
  weekDelta,
  unit = "",
  field = "good",
}: {
  label: string;
  dayDelta: any;
  weekDelta: any;
  unit?: string;
  field?: "wasted" | "good";
}) {
  const day = directionIcon(dayDelta?.direction || "same", field);
  const week = directionIcon(weekDelta?.direction || "same", field);
  const dayChange = Math.abs(dayDelta?.change || 0);
  const weekChange = Math.abs(weekDelta?.change || 0);

  const fmt = (v: number) => unit === "m" ? fmtMin(v) : `${Math.round(v)}`;

  return (
    <View style={trendStyles.row}>
      <Text style={trendStyles.label}>{label}</Text>
      <View style={trendStyles.cols}>
        <View style={trendStyles.col}>
          <Text style={[trendStyles.arrow, { color: day.color }]}>
            {day.icon}
          </Text>
          <Text style={trendStyles.change}>
            {fmt(dayChange)} vs yesterday
          </Text>
        </View>
        <View style={trendStyles.col}>
          <Text style={[trendStyles.arrow, { color: week.color }]}>
            {week.icon}
          </Text>
          <Text style={trendStyles.change}>
            {fmt(weekChange)} vs last week
          </Text>
        </View>
      </View>
    </View>
  );
}

function fmtMin(m: number): string {
  const rounded = Math.round(m * 10) / 10;
  return rounded < 1 ? `${Math.round(m * 60)}s` : `${rounded}m`;
}

function TrendsCard({ trends }: { trends: any }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Trends</Text>

      <View style={trendStyles.avgRow}>
        <Text style={trendStyles.avgLabel}>7-day avg:</Text>
        <Text style={trendStyles.avgValue}>
          {Math.round(trends.weeklyAvg?.cardsReviewed ?? 0)} cards
        </Text>
        <Text style={trendStyles.avgDivider}>·</Text>
        <Text style={trendStyles.avgValue}>
          {fmtMin(trends.weeklyAvg?.studyMinutes ?? 0)} study
        </Text>
        <Text style={trendStyles.avgDivider}>·</Text>
        <Text style={trendStyles.avgValue}>
          {fmtMin(trends.weeklyAvg?.wastedMinutes ?? 0)} wasted
        </Text>
      </View>

      <TrendRow
        label="Cards reviewed"
        dayDelta={trends.dayOverDay?.cardsReviewed}
        weekDelta={trends.weekOverWeek?.cardsReviewed}
        field="good"
      />
      <TrendRow
        label="Study time"
        dayDelta={trends.dayOverDay?.studyMinutes}
        weekDelta={trends.weekOverWeek?.studyMinutes}
        unit="m"
        field="good"
      />
      <TrendRow
        label="Wasted time"
        dayDelta={trends.dayOverDay?.wastedMinutes}
        weekDelta={trends.weekOverWeek?.wastedMinutes}
        unit="m"
        field="wasted"
      />
    </View>
  );
}

const trendStyles = StyleSheet.create({
  avgRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 14,
    backgroundColor: "#111d36",
    borderRadius: 10,
    padding: 10,
  },
  avgLabel: {
    color: "#A9BDDB",
    fontSize: 12,
    marginRight: 2,
  },
  avgValue: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  avgDivider: {
    color: "#A9BDDB",
    fontSize: 12,
  },
  row: {
    marginBottom: 12,
  },
  label: {
    color: "#A9BDDB",
    fontSize: 12,
    marginBottom: 4,
    fontWeight: "600",
  },
  cols: {
    flexDirection: "row",
    gap: 12,
  },
  col: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#111d36",
    borderRadius: 8,
    padding: 8,
  },
  arrow: {
    fontSize: 16,
    fontWeight: "800",
  },
  change: {
    color: "white",
    fontSize: 11,
    flexShrink: 1,
  },
});

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