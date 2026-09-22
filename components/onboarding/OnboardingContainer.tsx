import { ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet } from "react-native";
import ProgressDots from "./ProgressDots";

type Props = {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  accentColor?: string;
  icon?: string;
};

export default function OnboardingContainer({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  accentColor,
  icon,
}: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      {accentColor && (
        <>
          <View style={[styles.glowTop, { backgroundColor: accentColor }]} />
          <View style={[styles.glowBottom, { backgroundColor: accentColor }]} />
        </>
      )}
      <View style={styles.container}>
        <ProgressDots step={step} totalSteps={totalSteps} />
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        <Text style={[styles.title, accentColor ? { color: accentColor } : null]}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <View style={styles.content}>{children}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0B0B0F",
    overflow: "hidden",
  },
  glowTop: {
    position: "absolute",
    top: -100,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.13,
  },
  glowBottom: {
    position: "absolute",
    bottom: -120,
    left: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    opacity: 0.08,
  },
  container: {
    flex: 1,
    padding: 24,
  },
  icon: {
    fontSize: 48,
    marginTop: 16,
    marginBottom: 4,
  },
  title: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "800",
    marginTop: 16,
    marginBottom: 12,
  },
  subtitle: {
    color: "#B9BDC7",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  content: {
    flex: 1,
  },
});