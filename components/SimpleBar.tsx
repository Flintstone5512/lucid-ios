import { View, Text } from "react-native";

export default function SimpleBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ marginBottom: 6 }}>{label}</Text>
      <View style={{ height: 12, backgroundColor: "#ddd", borderRadius: 999 }}>
        <View
          style={{
            width: `${pct}%`,
            height: 12,
            borderRadius: 999,
            backgroundColor: "#111",
          }}
        />
      </View>
      <Text style={{ marginTop: 4 }}>{value}</Text>
    </View>
  );
}