import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";

import { joinWithCode } from "../../services/linkService";

export default function JoinScreen() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    if (!code || !name) {
      alert("Enter code and name");
      return;
    }

    setLoading(true);

    try {
      const res = await joinWithCode(code, name);

      if (!res.ok) {
        alert(res.error || "Invalid code");
        return;
      }

      alert("Connected to parent 🎉");

      // 🔥 go to app (will route as child automatically)
      router.replace("/");
    } catch (err) {
      console.log(err);
      alert("Failed to join");
    }

    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join Parent</Text>

      <Text style={styles.subtitle}>
        Enter the code from your parent
      </Text>

      <TextInput
        placeholder="6-digit code"
        placeholderTextColor="#888"
        value={code}
        onChangeText={setCode}
        style={styles.input}
      />

      <TextInput
        placeholder="Your name"
        placeholderTextColor="#888"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      <Pressable style={styles.button} onPress={handleJoin}>
        <Text style={styles.buttonText}>
          {loading ? "Joining..." : "Join"}
        </Text>
      </Pressable>

      {/* SKIP OPTION */}
      <Pressable onPress={() => router.replace("/(tabs)")}>
        <Text style={styles.skip}>Skip for now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0e1424",
    padding: 24,
    justifyContent: "center",
  },

  title: {
    color: "white",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 10,
  },

  subtitle: {
    color: "#A9BDDB",
    marginBottom: 20,
  },

  input: {
    backgroundColor: "#151820",
    borderRadius: 12,
    padding: 14,
    color: "white",
    marginBottom: 12,
  },

  button: {
    backgroundColor: "#F8C373",
    padding: 16,
    borderRadius: 14,
    marginTop: 10,
  },

  buttonText: {
    textAlign: "center",
    fontWeight: "800",
    color: "#111",
  },

  skip: {
    color: "#A9BDDB",
    textAlign: "center",
    marginTop: 20,
  },
});