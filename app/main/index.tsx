import { View, Text, Pressable } from "react-native";

export default function HomeScreen({ navigation }: any) {
  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center" }}>
      <Text style={{ fontSize: 32, fontWeight: "800", marginBottom: 24 }}>
        Lucid
      </Text>

      <Pressable
        onPress={() => navigation.navigate("streak")}
        style={{ padding: 16, backgroundColor: "#111", borderRadius: 12, marginBottom: 12 }}
      >
        <Text style={{ color: "#fff", textAlign: "center" }}>Streak</Text>
      </Pressable>

      <Pressable
        onPress={() => navigation.navigate("detox")}
        style={{ padding: 16, backgroundColor: "#111", borderRadius: 12, marginBottom: 12 }}
      >
        <Text style={{ color: "#fff", textAlign: "center" }}>Detox Mode</Text>
      </Pressable>

      <Pressable
        onPress={() => navigation.navigate("analytics")}
        style={{ padding: 16, backgroundColor: "#111", borderRadius: 12 }}
      >
        <Text style={{ color: "#fff", textAlign: "center" }}>Analytics</Text>
      </Pressable>
    </View>
  );
}