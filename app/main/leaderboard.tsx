import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { getLeaderboard } from "../../services/leaderboardService";

export default function LeaderboardScreen() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    getLeaderboard().then(setData);
  }, []);

  if (!data) return <Text style={{ padding: 24 }}>Loading...</Text>;

  const entries = data.leaderboard?.entries || [];

  return (
    <ScrollView contentContainerStyle={{ padding: 24 }}>
      <Text style={{ fontSize: 28, fontWeight: "800", marginBottom: 20 }}>
        Leaderboard
      </Text>
      
      {entries.map((e: any, i: number) => (
  <View
    key={i}
    style={{
      padding: 16,
      borderRadius: 12,
      backgroundColor: "#111",
      marginBottom: 10,
    }}
  >
    {/* NAME + RANK */}
    <Text style={{ color: "#fff", fontWeight: "700" }}>
      #{i + 1} {e.displayName}
    </Text>

    {/* 🔥 NEW: XP */}
    <Text style={{ color: "#ccc" }}>
      ⚡ XP: {e.xp || 0}
    </Text>

    {/* EXISTING */}
    <Text style={{ color: "#ccc" }}>
      Score: {Math.round(e.score)}
    </Text>

    <Text style={{ color: "#ccc" }}>
      Cards: {e.cardsReviewed} | Streak: {e.currentStreak}
    </Text>
  </View>
))}
    </ScrollView>
  );
}