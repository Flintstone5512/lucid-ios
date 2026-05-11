import { useState } from "react";
import { Alert, Button, Platform, Text, View } from "react-native";
import {
    applyIOSShield,
    clearIOSShield,
    presentIOSAppPicker,
    requestIOSScreenTimeAuthorization,
} from "../../services/iosScreenTime";

export default function IOSScreenTimeSetupScreen() {
  const [loading, setLoading] = useState(false);

  async function runAuthorization() {
    try {
      setLoading(true);
      const result = await requestIOSScreenTimeAuthorization();

      if (result.status !== "approved") {
        Alert.alert("Permission needed", "Lucid needs Screen Time access to block selected apps.");
        return;
      }

      Alert.alert("Approved", "Screen Time access is enabled.");
    } catch (err: any) {
      Alert.alert("Authorization failed", err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function chooseApps() {
    try {
      setLoading(true);
      const result = await presentIOSAppPicker();
      Alert.alert("Saved", `Apps selected: ${result.applicationsCount}`);
    } catch (err: any) {
      Alert.alert("Picker failed", err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function testBlock() {
    try {
      await applyIOSShield();
      Alert.alert("Shield active", "Selected apps are now blocked.");
    } catch (err: any) {
      Alert.alert("Shield failed", err.message ?? "Something went wrong.");
    }
  }

  async function testUnblock() {
    try {
      await clearIOSShield();
      Alert.alert("Shield cleared", "Selected apps are now unblocked.");
    } catch (err: any) {
      Alert.alert("Clear failed", err.message ?? "Something went wrong.");
    }
  }

  if (Platform.OS !== "ios") {
    return (
      <View>
        <Text>This setup screen is only for iOS.</Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: "800" }}>
        Set Up Lucid Screen Time
      </Text>

      <Text>
        Choose the apps Lucid should protect. You’ll earn access by completing flashcards.
      </Text>

      <Button disabled={loading} title="1. Allow Screen Time Access" onPress={runAuthorization} />
      <Button disabled={loading} title="2. Choose Apps to Block" onPress={chooseApps} />
      <Button disabled={loading} title="3. Test Block Apps" onPress={testBlock} />
      <Button disabled={loading} title="Clear Block" onPress={testUnblock} />
    </View>
  );
}