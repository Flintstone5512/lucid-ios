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
};

export default function OnboardingContainer({
  step,
  totalSteps,
  title,
  subtitle,
  children,
}: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <ProgressDots step={step} totalSteps={totalSteps} />
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
  title: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "800",
    marginTop: 24,
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