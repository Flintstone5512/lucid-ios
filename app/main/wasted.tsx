import { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import api from "../../services/api";

export default function WastedScreen({ navigation }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/usage/wasted-screen").then((res) => {
      setData(res.data);
    });
  }, []);

  if (!data) return <Text>Loading...</Text>;

  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Text style={{ fontSize: 32, fontWeight: "bold" }}>
        {data.screen.title}
      </Text>

      <Text style={{ marginVertical: 20 }}>
        {data.screen.subtitle}
      </Text>

      <Pressable
        onPress={() => navigation.navigate("session")}
        style={{
          padding: 16,
          backgroundColor: "black",
          borderRadius: 10,
        }}
      >
        <Text style={{ color: "white", textAlign: "center" }}>
          {data.screen.cta}
        </Text>
      </Pressable>
    </View>
  );
}