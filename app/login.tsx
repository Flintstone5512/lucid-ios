import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { setAuthToken } from "../services/api";
import { getIOSAuthorizationStatus } from "../services/nativeBridge";
import { signInWithGoogle, signInWithApple, isAppleSignInAvailable } from "../services/socialAuth";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function afterLogin(token: string) {
    await setAuthToken(token);

    if (Platform.OS === "ios") {
      try {
        const authStatus = await getIOSAuthorizationStatus();
        if (authStatus?.status !== "approved") {
          router.replace("/screens/IOSScreenTimeSetupScreen");
          return;
        }
      } catch {
        // Fall through if check fails
      }
    }

    router.replace("/splash");
  }

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true);
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

      await afterLogin(data.token);
    } catch (err) {
      console.error(err);
      alert("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    try {
      const token = await signInWithGoogle();
      await afterLogin(token);
    } catch (err: any) {
      if (err.message !== "Google sign-in cancelled") {
        alert(err.message || "Google sign-in failed");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAppleLogin() {
    setLoading(true);
    try {
      const token = await signInWithApple();
      await afterLogin(token);
    } catch (err: any) {
      if (err.code !== "ERR_REQUEST_CANCELED") {
        alert(err.message || "Apple sign-in failed");
      }
    } finally {
      setLoading(false);
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
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor="#94A3B8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialRow}>
          <Pressable
            style={styles.socialButton}
            onPress={handleGoogleLogin}
            disabled={loading}
          >
            <Text style={styles.socialIcon}>G</Text>
            <Text style={styles.socialText}>Google</Text>
          </Pressable>

          {isAppleSignInAvailable && (
            <Pressable
              style={styles.socialButton}
              onPress={handleAppleLogin}
              disabled={loading}
            >
              <Text style={styles.socialIcon}></Text>
              <Text style={styles.socialText}>Apple</Text>
            </Pressable>
          )}
        </View>

        <Pressable onPress={() => router.push("/signup")} disabled={loading}>
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
    backgroundColor: "#1E3A8A",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    gap: 10,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#2A2E36",
  },

  dividerText: {
    color: "#64748B",
    fontSize: 12,
  },

  socialRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },

  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B0F1A",
    borderRadius: 12,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "#2A2E36",
    gap: 8,
  },

  socialIcon: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  socialText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  link: {
    color: "#F97316",
    textAlign: "center",
    marginTop: 4,
    fontWeight: "600",
  },
});
