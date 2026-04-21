import { View, StyleSheet } from "react-native";

export default function ProgressDots({
  step,
  totalSteps,
}: {
  step: number;
  totalSteps: number;
}) {
  return (
    <View style={styles.row}>
      {Array.from({ length: totalSteps }).map((_, index) => {
        const active = index + 1 <= step;
        return (
          <View
            key={index}
            style={[styles.dot, active ? styles.activeDot : styles.inactiveDot]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 999,
    flex: 1,
  },
  activeDot: {
    backgroundColor: "#fff",
  },
  inactiveDot: {
    backgroundColor: "#2A2E36",
  },
});