import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";

export default function SignupScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSignup() {
    try {
      const res = await fetch(
        "https://lucid-backend-production.up.railway.app/api/auth/signup",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.ok) {
        alert(data.error || "Signup failed");
        return;
      }

      router.replace("/login");
    } catch (err) {
      console.error(err);
      alert("Network error");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>LUCID</Text>

      <Text style={styles.title}>Create your system.</Text>
      <Text style={styles.subtitle}>
        Start controlling your attention.
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

        <Pressable style={styles.button} onPress={handleSignup}>
          <Text style={styles.buttonText}>Create Account</Text>
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
    backgroundColor: "#F97316", // 🟠 ORANGE PRIMARY FOR ACTION
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
});