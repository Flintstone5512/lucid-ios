import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { setAuthToken } from "../services/api";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    try {
      const res = await fetch(
        "https://lucid-backend-production.up.railway.app/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.token) {
        alert(data.error || "Login failed");
        return;
      }

      await setAuthToken(data.token);
      router.replace("/(tabs)");
    } catch (err) {
      console.error(err);
      alert("Network error");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>LUCID</Text>

      <Text style={styles.title}>Turn scrolling into skill.</Text>
      <Text style={styles.subtitle}>
        Log in to start earning your time back.
      </Text>

      <View style={styles.form}>
        <TextInput
          placeholder="Email"
          placeholderTextColor="#94A3B8"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor="#94A3B8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

        <Pressable style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Login</Text>
        </Pressable>

        <Pressable onPress={() => router.push("/signup")}>
          <Text style={styles.link}>Create account</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0F1A",
    padding: 24,
    justifyContent: "center",
  },

  logo: {
    color: "#F97316",
    fontSize: 14,
    letterSpacing: 4,
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "800",
  },

  title: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },

  subtitle: {
    color: "#94A3B8",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 30,
  },

  form: {
    backgroundColor: "#121826",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#2A2E36",
  },

  input: {
    backgroundColor: "#0B0F1A",
    borderRadius: 12,
    padding: 14,
    color: "#fff",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#2A2E36",
  },

  button: {
    backgroundColor: "#1E3A8A", // 🔵 BLUE PRIMARY
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },

  link: {
    color: "#F97316", // 🟠 ORANGE ACCENT
    textAlign: "center",
    marginTop: 16,
    fontWeight: "600",
  },
});