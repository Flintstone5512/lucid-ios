import { useEffect } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    View,
} from "react-native";

import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { bootstrapAuthToken, getContext } from "../services/api";
import { getOnboardingComplete } from "../services/storage";

// 🔥 prevent flicker
SplashScreen.preventAutoHideAsync();

export default function Splash() {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    async function start() {
      try {
        /* =========================
           🔥 ANIMATION START
        ========================= */
        opacity.value = withTiming(1, { duration: 600 });
        scale.value = withTiming(1.05, { duration: 800 }, () => {
          scale.value = withTiming(1);
        });

        /* =========================
           🔐 AUTH CHECK
        ========================= */
        const token = await bootstrapAuthToken();

        if (!token) {
          await SplashScreen.hideAsync();
          router.replace("/login");
          return;
        }

        /* =========================
           🧠 ONBOARDING CHECK
        ========================= */
        const done = await getOnboardingComplete();

        if (!done) {
          await SplashScreen.hideAsync();
          router.replace("/(onboarding)");
          return;
        }

        /* =========================
           👤 ROLE CHECK
        ========================= */
        const ctx = await getContext();
        const role = ctx?.context?.role;

        console.log("User role:", role);

        /* =========================
           🚀 FINAL NAVIGATION
        ========================= */
        await SplashScreen.hideAsync();

        if (role === "parent") {
          router.replace("/(tabs)");
        } else {
          router.replace("/(tabs)");
        }

      } catch (err) {
        console.log("Splash init error:", err);
        await SplashScreen.hideAsync();
        router.replace("/login");
      }
    }

    start();
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={animatedStyle}>
        <Text style={styles.logo}>Lucid</Text>
      </Animated.View>

      {/* 🔥 LOADING INDICATOR */}
      <ActivityIndicator color="#D86732" style={{ marginTop: 20 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0e1424",
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    color: "#D86732",
    fontSize: 42,
    fontWeight: "900",
  },
});