import { useState } from "react";
import {
  ScrollView,
  Text,
  Pressable,
  View,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { LucidTheme } from "../../constants/lucidTheme";
import { HELP_SECTIONS } from "../../constants/helpContent";

export default function HelpScreen() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function toggle(key: string) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
      </View>

      <View style={styles.headerCard}>
        <Text style={styles.title}>Help & Support</Text>
        <Text style={styles.subtitle}>
          Find answers to common questions about every feature.
        </Text>
      </View>

      {/* SECTIONS */}
      {HELP_SECTIONS.map((section) => (
        <View key={section.id} style={styles.card}>
          <Text style={styles.sectionTitle}>
            {section.icon}  {section.title}
          </Text>

          {section.items.map((item, index) => {
            const key = `${section.id}-${index}`;
            const isOpen = !!expanded[key];

            return (
              <View key={key}>
                {index > 0 && <View style={styles.divider} />}
                <Pressable
                  onPress={() => toggle(key)}
                  style={styles.questionRow}
                >
                  <Text style={styles.question}>{item.question}</Text>
                  <Text style={styles.chevron}>{isOpen ? "▲" : "▼"}</Text>
                </Pressable>

                {isOpen && (
                  <Text style={styles.answer}>{item.answer}</Text>
                )}
              </View>
            );
          })}
        </View>
      ))}

      {/* CONTACT */}
      <View style={[styles.card, styles.contactCard]}>
        <Text style={styles.sectionTitle}>Still need help?</Text>
        <Text style={styles.contactText}>
          Email us at{" "}
          <Text style={styles.contactEmail}>support@lucidapp.io</Text>
          {"\n"}We typically respond within 24 hours.
        </Text>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LucidTheme.bg,
  },

  content: {
    padding: 24,
  },

  headerRow: {
    marginBottom: 12,
  },

  backBtn: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },

  backText: {
    color: LucidTheme.sub,
    fontSize: 15,
    fontWeight: "600",
  },

  headerCard: {
    backgroundColor: LucidTheme.card,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },

  title: {
    color: LucidTheme.text,
    fontSize: 26,
    fontWeight: "800",
  },

  subtitle: {
    color: LucidTheme.sub,
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },

  card: {
    backgroundColor: LucidTheme.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  sectionTitle: {
    color: LucidTheme.accent,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },

  divider: {
    height: 1,
    backgroundColor: "#2A3550",
    marginVertical: 2,
  },

  questionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 12,
    gap: 12,
  },

  question: {
    color: LucidTheme.text,
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
    lineHeight: 20,
  },

  chevron: {
    color: LucidTheme.sub,
    fontSize: 10,
    marginTop: 4,
  },

  answer: {
    color: LucidTheme.sub,
    fontSize: 13,
    lineHeight: 20,
    paddingBottom: 12,
  },

  contactCard: {
    borderWidth: 1,
    borderColor: LucidTheme.accent,
    marginTop: 4,
  },

  contactText: {
    color: LucidTheme.sub,
    fontSize: 13,
    lineHeight: 20,
  },

  contactEmail: {
    color: LucidTheme.accent,
    fontWeight: "700",
  },

  bottomSpacer: {
    height: 40,
  },
});
