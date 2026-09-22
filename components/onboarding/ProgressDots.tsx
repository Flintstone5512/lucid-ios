import { View, StyleSheet } from "react-native";

export default function ProgressDots({
  step,
  totalSteps,
  accentColor = "#ff8a3d",
}: {
  step: number;
  totalSteps: number;
  accentColor?: string;
}) {
  return (
    <View style={styles.row}>
      {Array.from({ length: totalSteps }).map((_, index) => {
        const active = index + 1 <= step;
        return (
          <View
            key={index}
            style={[
              styles.dot,
              { backgroundColor: active ? accentColor : "#1E2025" },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    height: 3,
    borderRadius: 999,
    flex: 1,
  },
});