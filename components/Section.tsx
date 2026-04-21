import { View, Text } from "react-native";
import { LucidTheme } from "../constants/lucidTheme";

export default function Section({ title, children }: any) {
  return (
    <View style={{ marginBottom: 24 }}>
      
      <Text
        style={{
          fontSize: 18,
          fontWeight: "800",
          marginBottom: 12,
          color: LucidTheme.accent, // 🔥 orange section headers
        }}
      >
        {title}
      </Text>

      <View
        style={{
          backgroundColor: LucidTheme.card,
          borderRadius: 16,
          padding: 16,
        }}
      >
        {children}
      </View>

    </View>
  );
}