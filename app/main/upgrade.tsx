import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Linking } from "react-native";
import { createCheckout } from "../../services/billingService";

type BillingCycle = "weekly" | "monthly" | "yearly";

const PRICE_IDS: Record<string, Record<BillingCycle, string>> = {
  pro: {
    weekly: "price_REPLACE_WITH_WEEKLY_PRO_ID",
    monthly: "price_1TIeAeHkkQTXprx1Zh68bstn",
    yearly: "price_1TIeAeHkkQTXprx1BMSZQzj7",
  },
  family_pro: {
    weekly: "price_REPLACE_WITH_WEEKLY_FAMILY_PRO_ID",
    monthly: "price_1TIg3THkkQTXprx1qsGiBtrq",
    yearly: "price_1TIg3uHkkQTXprx1w5Vj16gu",
  },
};

const PRICES: Record<string, Record<BillingCycle, string>> = {
  pro: {
    weekly: "$5.99/wk",
    monthly: "$19.99/mo",
    yearly: "$8/mo",
  },
  family_pro: {
    weekly: "$7.99/wk",
    monthly: "$25/mo",
    yearly: "$20/mo",
  },
};

const CYCLE_LABELS: Record<BillingCycle, string> = {
  weekly: "Most flexible",
  monthly: "Best for flexibility",
  yearly: "Save 60%",
};

export default function UpgradeScreen() {
  const [billing, setBilling] = useState<BillingCycle>("yearly");
  const [loading, setLoading] = useState<string | null>(null);

  async function handleUpgrade(planKey: string) {
    try {
      setLoading(planKey);
      const priceId = PRICE_IDS[planKey][billing];
      const res = await createCheckout(priceId);
      if (res?.url) {
        await Linking.openURL(res.url);
      }
    } catch (err) {
      console.error("Upgrade error:", err);
    } finally {
      setLoading(null);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Upgrade Lucid</Text>

      {/* TRIAL BANNER */}
      <View style={styles.trialBanner}>
        <Text style={styles.trialBannerTitle}>14-day free trial included</Text>
        <Text style={styles.trialBannerSub}>
          Ads are shown during your trial. Once your paid plan starts, ads are
          removed permanently.
        </Text>
      </View>

      {/* BILLING TOGGLE */}
      <View style={styles.toggleWrap}>
        {(["weekly", "monthly", "yearly"] as BillingCycle[]).map((cycle) => (
          <Pressable
            key={cycle}
            style={[styles.toggleBtn, billing === cycle && styles.toggleBtnActive]}
            onPress={() => setBilling(cycle)}
          >
            <Text
              style={[
                styles.toggleBtnText,
                billing === cycle && styles.toggleBtnTextActive,
              ]}
            >
              {cycle.charAt(0).toUpperCase() + cycle.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.cycleLabel}>{CYCLE_LABELS[billing]}</Text>

      {/* PRO CARD */}
      <View style={[styles.card, styles.cardFeatured]}>
        <View style={styles.trialBadge}>
          <Text style={styles.trialBadgeText}>14-day free trial</Text>
        </View>
        <Text style={styles.planName}>Pro</Text>
        <Text style={styles.planPrice}>{PRICES.pro[billing]}</Text>
        <Text style={styles.planDesc}>
          Unlimited decks, AI generation, ad-free after trial
        </Text>
        {["Unlimited decks + AI", "Progress tracking + streaks", "Cross-device sync", "Ad-free when billing starts"].map((f) => (
          <Text key={f} style={styles.feature}>✓ {f}</Text>
        ))}
        <Text style={styles.trialNote}>
          Ads shown during 14-day trial. Removed when billing starts.
        </Text>
        <Pressable
          style={[styles.btn, styles.btnPrimary]}
          onPress={() => handleUpgrade("pro")}
          disabled={loading === "pro"}
        >
          <Text style={styles.btnText}>
            {loading === "pro" ? "Loading…" : "Start Free Trial"}
          </Text>
        </Pressable>
      </View>

      {/* FAMILY PRO CARD */}
      <View style={styles.card}>
        <View style={styles.trialBadge}>
          <Text style={styles.trialBadgeText}>14-day free trial</Text>
        </View>
        <Text style={styles.planName}>Family Pro</Text>
        <Text style={styles.planPrice}>{PRICES.family_pro[billing]}</Text>
        <Text style={styles.planDesc}>
          Control your children's learning, up to 4 kids
        </Text>
        {["Up to 4 children", "Advanced tracking", "Custom learning control", "Ad-free when billing starts"].map((f) => (
          <Text key={f} style={styles.feature}>✓ {f}</Text>
        ))}
        <Text style={styles.trialNote}>
          Ads shown during 14-day trial. Removed when billing starts.
        </Text>
        <Pressable
          style={[styles.btn, styles.btnSecondary]}
          onPress={() => handleUpgrade("family_pro")}
          disabled={loading === "family_pro"}
        >
          <Text style={[styles.btnText, styles.btnTextSecondary]}>
            {loading === "family_pro" ? "Loading…" : "Start Free Trial"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0e1424",
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    color: "white",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 16,
  },
  trialBanner: {
    backgroundColor: "#1a3a5c",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#2a6496",
  },
  trialBannerTitle: {
    color: "#60b4ff",
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 4,
  },
  trialBannerSub: {
    color: "#A9BDDB",
    fontSize: 13,
    lineHeight: 18,
  },
  toggleWrap: {
    flexDirection: "row",
    backgroundColor: "#1b2540",
    borderRadius: 10,
    padding: 4,
    marginBottom: 8,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: "#2563EB",
  },
  toggleBtnText: {
    color: "#A9BDDB",
    fontWeight: "600",
    fontSize: 13,
  },
  toggleBtnTextActive: {
    color: "white",
  },
  cycleLabel: {
    color: "#60b4ff",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#1b2540",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardFeatured: {
    borderWidth: 1.5,
    borderColor: "#2563EB",
  },
  trialBadge: {
    backgroundColor: "#1a3a5c",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  trialBadgeText: {
    color: "#60b4ff",
    fontSize: 11,
    fontWeight: "700",
  },
  planName: {
    color: "white",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  planPrice: {
    color: "#60b4ff",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 6,
  },
  planDesc: {
    color: "#A9BDDB",
    fontSize: 13,
    marginBottom: 12,
  },
  feature: {
    color: "#A9BDDB",
    fontSize: 13,
    marginBottom: 4,
  },
  trialNote: {
    color: "#6b7fa3",
    fontSize: 11,
    marginTop: 10,
    marginBottom: 12,
    fontStyle: "italic",
  },
  btn: {
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnPrimary: {
    backgroundColor: "#2563EB",
  },
  btnSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "#2563EB",
  },
  btnText: {
    color: "white",
    fontWeight: "700",
    fontSize: 15,
  },
  btnTextSecondary: {
    color: "#60b4ff",
  },
});
