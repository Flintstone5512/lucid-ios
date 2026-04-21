import { View, Text, TextInput } from "react-native";

export default function SettingRow({ label, value, onChange }: any) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: "#fff" }}>{label}</Text>
      <TextInput
  value={String(value)}
  onChangeText={onChange}
  placeholder="Enter value..."
  placeholderTextColor="#6B7280"
  style={{
    color: "#fff", // 🔥 CRITICAL FIX
    backgroundColor: "#0f172a", // 🔥 gives contrast
    borderWidth: 1,
    borderColor: "rgba(169,189,219,0.2)", // softer border
    padding: 12,
    borderRadius: 10,
    marginTop: 6,
  }}
/>
    </View>
  );
}