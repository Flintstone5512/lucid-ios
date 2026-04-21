import { View, Text, Pressable, StyleSheet } from "react-native";
import { createCheckout } from "../../services/billingService";

export default function UpgradeScreen() {
  async function handleUpgrade(priceId: string) {
    try {
      const res = await createCheckout(priceId);

      // 🔥 open Stripe checkout
      window.open(res.url);
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upgrade Lucid</Text>

      {/* SOLO */}
      <Pressable
        style={styles.card}
        onPress={() => handleUpgrade("STRIPE_PRO_MONTHLY")}
      >
        <Text style={styles.plan}>Pro</Text>
        <Text style={styles.desc}>Unlimited decks + AI</Text>
      </Pressable>

      {/* FAMILY */}
      <Pressable
        style={styles.card}
        onPress={() => handleUpgrade("STRIPE_FAMILY_PRO_MONTHLY")}
      >
        <Text style={styles.plan}>Family</Text>
        <Text style={styles.desc}>Control your children</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0e1424",
    padding: 24,
  },
  title: {
    color: "white",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#1b2540",
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
  },
  plan: {
    color: "white",
    fontSize: 18,
    fontWeight: "800",
  },
  desc: {
    color: "#A9BDDB",
  },
});