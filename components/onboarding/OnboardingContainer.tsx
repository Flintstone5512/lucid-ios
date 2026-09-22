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
};

export default function OnboardingContainer({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  accentColor = "#ff8a3d",
}: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <ProgressDots step={step} totalSteps={totalSteps} accentColor={accentColor} />
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
        <Text style={styles.title}>{title}</Text>
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
  },
  container: {
    flex: 1,
    padding: 24,
  },
  accentBar: {
    width: 32,
    height: 3,
    borderRadius: 2,
    marginTop: 28,
    marginBottom: 16,
  },
  title: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 10,
    lineHeight: 38,
  },
  subtitle: {
    color: "#6B7280",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
    letterSpacing: 0.1,
  },
  content: {
    flex: 1,
  },
});