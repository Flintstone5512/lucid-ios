import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

export default function Splash() {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    async function start() {
      // animate in
      opacity.value = withTiming(1, { duration: 600 });
      scale.value = withTiming(1, { duration: 600 });

      // simulate load / preload
      setTimeout(async () => {
        await SplashScreen.hideAsync(); // hide native splash

        router.replace("/dashboard"); // go to app
      }, 1200);
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
        <Text style={styles.logo}>LUCID</Text>
      </Animated.View>

      <Text style={styles.tagline}>
        Turn scrolling into learning
      </Text>
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
    letterSpacing: 2,
  },
  tagline: {
    color: "#A9BDDB",
    marginTop: 12,
  },
});