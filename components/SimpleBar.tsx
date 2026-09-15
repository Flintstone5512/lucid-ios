import { View, Text, StyleSheet } from "react-native";

const DAY_ABBR: Record<string, string> = {
  Mon: "M", Tue: "T", Wed: "W", Thu: "T", Fri: "F", Sat: "S", Sun: "S",
};

function shortDay(label: string): string {
  // label is either "Mon"/"Tue"/etc or a "YYYY-MM-DD" dateKey
  if (label.length === 10 && label[4] === "-") {
    const d = new Date(label + "T00:00:00Z");
    return ["Su", "M", "T", "W", "Th", "F", "Sa"][d.getUTCDay()];
  }
  return DAY_ABBR[label] ?? label.slice(0, 2);
}

export default function SimpleBar({
  label,
  value,
  max,
  accent = "#D86732",
}: {
  label: string;
  value: number;
  max: number;
  accent?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const isZero = value === 0;
  const barColor = isZero ? "#1b2540" : accent;
  const height = 8 + Math.round((pct / 100) * 48); // 8–56px tall bar

  return (
    <View style={styles.col}>
      <Text style={styles.value}>{isZero ? "" : value}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { height, backgroundColor: barColor }]} />
      </View>
      <Text style={styles.label}>{shortDay(label)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  col: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  track: {
    width: "70%",
    height: 64,
    backgroundColor: "#111d36",
    borderRadius: 8,
    justifyContent: "flex-end",
    alignItems: "stretch",
    overflow: "hidden",
  },
  fill: {
    borderRadius: 8,
    minHeight: 4,
  },
  value: {
    color: "#A9BDDB",
    fontSize: 10,
    fontWeight: "700",
    height: 14,
  },
  label: {
    color: "#A9BDDB",
    fontSize: 11,
    fontWeight: "700",
  },
});
