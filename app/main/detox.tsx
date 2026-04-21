import { useEffect, useState } from "react";
import { View, Text, Switch, ScrollView, Pressable, TextInput } from "react-native";
import { getDetox, updateDetox, useEmergencyBypass } from "../../services/detoxService";
import MetricCard from "../../components/MetricCard";

export default function DetoxScreen() {
  const [detox, setDetox] = useState<any>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await getDetox();
    setDetox(res.detox);
  }

  async function toggleEnabled(enabled: boolean) {
    const res = await updateDetox({ enabled });
    setDetox(res.detox);
  }

  async function setMode(mode: string) {
    const res = await updateDetox({ mode });
    setDetox(res.detox);
  }

  async function doBypass() {
    await useEmergencyBypass(10);
    await load();
  }

  if (!detox) return <Text style={{ padding: 24 }}>Loading...</Text>;

  return (
    <ScrollView contentContainerStyle={{ padding: 24 }}>
      <Text style={{ fontSize: 30, fontWeight: "800", marginBottom: 20 }}>
        Dopamine Detox
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <Text style={{ fontSize: 18 }}>Enabled</Text>
        <Switch value={detox.enabled} onValueChange={toggleEnabled} />
      </View>

      <MetricCard label="Mode" value={detox.mode} />
      <MetricCard
        label="Emergency Bypasses Left"
        value={Math.max(0, detox.emergencyBypassesPerWeek - detox.bypassesUsedThisWeek)}
      />

      <Text style={{ fontSize: 20, fontWeight: "700", marginTop: 16, marginBottom: 12 }}>
        Choose Mode
      </Text>

      {["light", "standard", "hardcore"].map((mode) => (
        <Pressable
          key={mode}
          onPress={() => setMode(mode)}
          style={{
            padding: 14,
            borderRadius: 12,
            backgroundColor: detox.mode === mode ? "#111" : "#eee",
            marginBottom: 10,
          }}
        >
          <Text style={{ color: detox.mode === mode ? "#fff" : "#111", fontWeight: "700" }}>
            {mode}
          </Text>
        </Pressable>
      ))}

      <Pressable
        onPress={doBypass}
        style={{
          marginTop: 20,
          padding: 16,
          borderRadius: 12,
          backgroundColor: "#b00020",
        }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
          Use Emergency Bypass
        </Text>
      </Pressable>
    </ScrollView>
  );
}