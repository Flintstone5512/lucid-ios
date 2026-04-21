import { View, Text, Pressable } from "react-native";

type Props = {
  label: string;
  value: string | number;
  onPress?: () => void; // 👈 NEW
};

export default function MetricCard({ label, value, onPress }: Props) {
  const Container = onPress ? Pressable : View;

  return (
    <Container
      onPress={onPress}
      style={{
        padding: 16,
        borderRadius: 14,
        backgroundColor: "#1b2540", // 🔥 upgraded to Lucid theme
        marginBottom: 12,
      }}
    >
      <Text style={{ color: "#A9BDDB", fontSize: 14 }}>
        {label}
      </Text>

      <Text
        style={{
          color: "#fff",
          fontSize: 24,
          fontWeight: "700" as const,
          marginTop: 6,
        }}
      >
        {value}
      </Text>
    </Container>
  );
}