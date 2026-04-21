import { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { getStreak } from "../../services/streakService";
import MetricCard from "../../components/MetricCard";

export default function StreakScreen() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    getStreak().then(setData);
  }, []);

  if (!data) return <Text style={{ padding: 24 }}>Loading...</Text>;

  const { streak, recentEvents } = data;

  return (
    <ScrollView contentContainerStyle={{ padding: 24 }}>
      <Text style={{ fontSize: 30, fontWeight: "800", marginBottom: 20 }}>
        Streak
      </Text>

      <MetricCard label="Current Streak" value={streak.currentStreak} />
      <MetricCard label="Longest Streak" value={streak.longestStreak} />
      <MetricCard label="Freeze Count" value={streak.freezeCount} />
      <MetricCard label="Status" value={streak.atRisk ? "At Risk" : "Safe"} />
      <MetricCard label="XP" value={data?.xp || 0} />
      
      <Text style={{ fontSize: 22, fontWeight: "700", marginTop: 20, marginBottom: 12 }}>
        Recent Events
      </Text>

      {recentEvents.map((event: any) => (
        <View
          key={event._id}
          style={{
            padding: 14,
            borderWidth: 1,
            borderColor: "#ddd",
            borderRadius: 12,
            marginBottom: 10,
          }}
        >
          <Text style={{ fontWeight: "700" }}>{event.type}</Text>
          <Text>{event.dateKey}</Text>
        </View>
      ))}
    </ScrollView>
  );
}