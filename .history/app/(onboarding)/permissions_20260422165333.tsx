import { router } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import OnboardingContainer from "../../components/onboarding/OnboardingContainer";
import { useOnboarding } from "../../context/OnboardingContext";
import {
  hasOverlayPermission,
  hasUsageAccess,
  isAccessibilityEnabled,
  requestAndroidAccessibilityAccess,
  requestAndroidOverlayAccess,
  requestAndroidUsageAccess,
  requestIOSAuthorization,
} from "../../services/nativeBridge";

import { useFocusEffect } from "@react-navigation/native";
import React from "react";

export default function PermissionsScreen() {
  const { state, setPermissions } = useOnboarding();

  /* -----------------------------
     iOS
  ----------------------------- */

  async function enableIOS() {
    const res = await requestIOSAuthorization();
    if (res.ok) {
      setPermissions({ iosAuthorized: true });
    }
  }

  /* -----------------------------
     Android (OPEN SETTINGS ONLY)
  ----------------------------- */

async function enableAndroid() {
  await requestAndroidUsageAccess();
  await requestAndroidOverlayAccess();
  await requestAndroidAccessibilityAccess();
}

  /* -----------------------------
     🔥 CRITICAL: CHECK ON RETURN
  ----------------------------- */

  useFocusEffect(
    React.useCallback(() => {
      async function checkPermissions() {
        const usage = await hasUsageAccess();
        const overlay = await hasOverlayPermission();
        const accessibility = await isAccessibilityEnabled();

        setPermissions({
          androidUsageAccess: usage?.granted || false,
          androidOverlayAccess: overlay?.granted || false,
          androidAccessibilityAccess: accessibility?.enabled || false,
        });
      }

      checkPermissions();
    }, [])
  );

  /* -----------------------------
     NEXT STEP
  ----------------------------- */

  const allEnabled =
    Platform.OS === "ios"
      ? state.permissions.iosAuthorized
      : state.permissions.androidUsageAccess &&
        state.permissions.androidOverlayAccess &&
        state.permissions.androidAccessibilityAccess;

  function handleNext() {
    if (!allEnabled) return;

    router.push("/(onboarding)/first-session"); // ✅ FIXED
  }

  return (
    <OnboardingContainer
      step={5}
      totalSteps={8}
      title="Enable control"
      subtitle="This is what lets the app interrupt doom scrolling in real life."
    >
      {Platform.OS === "ios" ? (
        <View>
          <Text style={styles.platformLabel}>iOS</Text>
          <Text style={styles.helpText}>Request Screen Time access</Text>

          <Pressable style={styles.permissionBtn} onPress={enableIOS}>
            <Text style={styles.permissionBtnText}>
              {state.permissions.iosAuthorized
                ? "Enabled"
                : "Enable Screen Time Access"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View>
          <Text style={styles.platformLabel}>Android</Text>
          <Text style={styles.helpText}>
            Enable usage access, overlay, and accessibility.
          </Text>

          <Pressable style={styles.permissionBtn} onPress={enableAndroid}>
            <Text style={styles.permissionBtnText}>
              Enable Android Permissions
            </Text>
          </Pressable>

          <Text style={styles.status}>
            Usage Access: {state.permissions.androidUsageAccess ? "✓" : "—"}
          </Text>
          <Text style={styles.status}>
            Overlay: {state.permissions.androidOverlayAccess ? "✓" : "—"}
          </Text>
          <Text style={styles.status}>
            Accessibility: {state.permissions.androidAccessibilityAccess ? "✓" : "—"}
          </Text>
        </View>
      )}

      <View style={styles.bottom}>
        <Pressable
          disabled={!allEnabled}
          style={[styles.nextButton, !allEnabled && { opacity: 0.4 }]}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>Continue</Text>
        </Pressable>
      </View>
    </OnboardingContainer>
  );
}

const styles = StyleSheet.create({
  platformLabel: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
  },
  helpText: {
    color: "#B9BDC7",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  permissionBtn: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  permissionBtnText: {
    color: "#0B0B0F",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  status: {
    color: "#D4D7DD",
    fontSize: 15,
    marginBottom: 8,
  },
  bottom: {
    flex: 1,
    justifyContent: "flex-end",
  },
  nextButton: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  nextButtonText: {
    color: "#0B0B0F",
    fontSize: 16,
    fontWeight: "800",
  },
});