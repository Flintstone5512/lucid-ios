import { Pressable, Text, StyleSheet } from "react-native";
import { openUpgrade } from "../services/paywallService";

export default function UpgradeButton({ label = "Upgrade" }) {
  return (
    <Pressable style={styles.button} onPress={openUpgrade}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#F8C373", // 🔥 orange
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
  },
  text: {
    color: "#0B0B0F",
    fontWeight: "800",
    fontSize: 15,
  },
});