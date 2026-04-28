import { router } from "expo-router";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
import React, { useEffect } from "react";

export default function PermissionsScreen() {
  const { state, setPermissions } = useOnboarding();

  /* -----------------------------
     PERMISSION CHECK (GLOBAL)
  ----------------------------- */

  async function checkPermissions() {
    const usage = await hasUsageAccess();
    const overlay = await hasOverlayPermission();
    const accessibility = await isAccessibilityEnabled();

    console.log("USAGE:", usage);
    console.log("OVERLAY:", overlay);
    console.log("ACCESS:", accessibility);

    setPermissions({
      androidUsageAccess: usage?.granted === true,
      androidOverlayAccess: overlay?.granted === true,
      androidAccessibilityAccess: accessibility?.enabled === true,
    });
  }

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
     ANDROID PERMISSION HANDLERS
  ----------------------------- */

  async function enableAccessibility() {
    Alert.alert(
      "Turn ON Lucid",
      "1. Find 'Lucid'\n2. Tap it\n3. Turn it ON\n4. Come back here",
      [
        {
          text: "Open Settings",
          onPress: async () => {
            await requestAndroidAccessibilityAccess();

            setTimeout(() => {
              checkPermissions();
            }, 1500);
          },
        },
      ]
    );
  }

  async function enableOverlay() {
    Alert.alert(
      "Allow Display Over Other Apps",
      "1. Find 'Lucid'\n2. Enable 'Allow display over other apps'",
      [
        {
          text: "Open Settings",
          onPress: async () => {
            await requestAndroidOverlayAccess();

            setTimeout(() => {
              checkPermissions();
            }, 1500);
          },
        },
      ]
    );
  }

  async function enableUsage() {
    Alert.alert(
      "Allow Usage Access",
      "1. Find 'Lucid'\n2. Turn ON usage access",
      [
        {
          text: "Open Settings",
          onPress: async () => {
            await requestAndroidUsageAccess();

            setTimeout(() => {
              checkPermissions();
            }, 1500);
          },
        },
      ]
    );
  }

  /* -----------------------------
     CHECK ON SCREEN FOCUS
  ----------------------------- */

  useFocusEffect(
    React.useCallback(() => {
      checkPermissions();

      const timeout = setTimeout(() => {
        checkPermissions();
      }, 1200);

      return () => clearTimeout(timeout);
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
    router.push("/(onboarding)/first-session");
  }

  /* -----------------------------
     🔥 AUTO-ADVANCE (optional but powerful)
  ----------------------------- */

  useEffect(() => {
    if (allEnabled) {
      setTimeout(() => {
        router.push("/(onboarding)/first-session");
      }, 800);
    }
  }, [allEnabled]);

  /* -----------------------------
     STATUS COMPONENT
  ----------------------------- */

  function Status({ label, enabled }) {
    return (
      <Text
        style={[
          styles.status,
          { color: enabled ? "#4CAF50" : "#FF6B6B" },
        ]}
      >
        {label}: {enabled ? "Enabled ✓" : "Not Enabled"}
      </Text>
    );
  }

  /* -----------------------------
     UI
  ----------------------------- */

  return (
    <OnboardingContainer
      step={5}
      totalSteps={8}
      title="Enable control"
      subtitle="This is what lets Lucid block TikTok, Instagram, and more."
    >
      {Platform.OS === "ios" ? (
        <View>
          <Text style={styles.platformLabel}>iOS</Text>
          <Text style={styles.helpText}>
            Enable Screen Time access to control apps.
          </Text>

          <Pressable style={styles.permissionBtn} onPress={enableIOS}>
            <Text style={styles.permissionBtnText}>
              {state.permissions.iosAuthorized
                ? "Enabled ✓"
                : "Enable Screen Time Access"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View>
          <Text style={styles.platformLabel}>Android</Text>

          <Text style={styles.helpText}>
            You must enable all 3 permissions for Lucid to work.
          </Text>

          <Text style={styles.warning}>
            ⚠️ Required to block TikTok, Instagram, YouTube, Facebook
          </Text>

          {/* ACCESSIBILITY */}
          <Pressable style={styles.permissionBtn} onPress={enableAccessibility}>
            <Text style={styles.permissionBtnText}>
              Enable Accessibility
            </Text>
          </Pressable>

          <Status
            label="Accessibility"
            enabled={state.permissions.androidAccessibilityAccess}
          />

          {/* OVERLAY */}
          <Pressable style={styles.permissionBtn} onPress={enableOverlay}>
            <Text style={styles.permissionBtnText}>
              Enable Overlay Permission
            </Text>
          </Pressable>

          <Status
            label="Overlay"
            enabled={state.permissions.androidOverlayAccess}
          />

          {/* USAGE */}
          <Pressable style={styles.permissionBtn} onPress={enableUsage}>
            <Text style={styles.permissionBtnText}>
              Enable Usage Access
            </Text>
          </Pressable>

          <Status
            label="Usage Access"
            enabled={state.permissions.androidUsageAccess}
          />

          {/* 🔄 MANUAL REFRESH */}
          <Pressable
            style={{ marginTop: 10 }}
            onPress={checkPermissions}
          >
            <Text style={{ color: "#4DA6FF", textAlign: "center" }}>
              🔄 Refresh Permissions
            </Text>
          </Pressable>
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

/* -----------------------------
   STYLES
----------------------------- */

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
    marginBottom: 12,
  },
  warning: {
    color: "#FF6B6B",
    fontSize: 14,
    marginBottom: 16,
  },
  permissionBtn: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  permissionBtnText: {
    color: "#0B0B0F",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  status: {
    fontSize: 14,
    marginBottom: 12,
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