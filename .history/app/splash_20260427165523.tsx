import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

// 🔥 PREVENT AUTO HIDE
SplashScreen.preventAutoHideAsync();

export default function Splash() {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    async function start() {
      // 🔥 ANIMATION IN
      opacity.value = withTiming(1, { duration: 600 });
      scale.value = withTiming(1.05, { duration: 800 }, () => {
        scale.value = withTiming(1);
      });

      // 🔥 PRELOAD REAL DATA
      await loadUser();
      await loadSettings();

      // 🔥 HIDE NATIVE SPLASH
      await SplashScreen.hideAsync();

      // 🔥 GO TO APP
      router.replace("/");
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

// 🔥 MOCK LOADERS (replace later)
async function loadUser() {
  return new Promise((res) => setTimeout(res, 400));
}

async function loadSettings() {
  return new Promise((res) => setTimeout(res, 400));
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