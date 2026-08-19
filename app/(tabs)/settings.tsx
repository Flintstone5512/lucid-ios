import { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  Pressable,
  View,
  StyleSheet,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSettings, updateSettings } from "../../services/settingsService";
import SettingRow from "../../components/SettingRow";
import { useRefocusStore } from "../../store/useRefocusStore";
import UpgradeButton from "../../components/UpgradeButton";
import { refreshUserContext } from "../../services/contextService";
import api from "../../services/api";
import { LucidTheme } from "../../constants/lucidTheme";
import { router } from "expo-router";
import { clearAuthToken } from "../../services/api";
import { syncEnforcementSettings } from "../../services/nativeBridge";
import { syncEnforcementDecision } from "../../services/enforcementSync";
import { syncSettings as syncScreenTimeSettings, applyShield, clearShield, setDailyLimit } from "../../modules/screen-time";
import { startMonitoringBlockedApps, scheduleBlockNotification } from "../../services/nativeBridge";
import { cancelGuiltNotifications, scheduleGuiltNotifications } from "../../services/motivationalNotificationService";
import { Platform } from "react-native";

export default function SettingsScreen() {
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);

  const { plan, adMode, context } = useRefocusStore();
  const [adModeLoading, setAdModeLoading] = useState(false);
  const role = context?.role || "solo";

  useEffect(() => {
    load();
    AsyncStorage.getItem("lucid_tts_enabled")
      .then((val) => { if (val === "true") setTtsEnabled(true); })
      .catch(() => {});
  }, []);

  async function toggleTts() {
    const next = !ttsEnabled;
    setTtsEnabled(next);
    AsyncStorage.setItem("lucid_tts_enabled", String(next)).catch(() => {});
  }

  async function load() {
    try {
      const res = await getSettings();
      setSettings(res.settings);
    } catch (err) {
      console.log("Settings load error:", err);
    }
  }

  /* =========================
     SAVE (NON-ENFORCEMENT ONLY)
  ========================= */
  async function save() {
    try {
      setSaving(true);

      const payload: any = {
        timerPolicy: {
          cardsRequired: Number(settings.timerPolicy?.cardsRequired),
          unlockMinutes: Number(settings.timerPolicy?.unlockMinutes),
          maxUnlockPerDay: Number(settings.timerPolicy?.maxUnlockPerDay),
        },
        cardPolicy: {
          dailyNewCards: Number(settings.cardPolicy?.dailyNewCards),
          maxReviewsPerDay: Number(settings.cardPolicy?.maxReviewsPerDay),
          difficulty: settings.cardPolicy?.difficulty,
        },
        schedulingPolicy: {
          reminderEnabled: Boolean(settings.schedulingPolicy?.reminderEnabled),
          reminderMinutesBefore: Number(
            settings.schedulingPolicy?.reminderMinutesBefore
          ),
          preferredStudyTimes:
            settings.schedulingPolicy?.preferredStudyTimes || [],
        },
        socialPolicy: {
          dailyLimitMinutes: Number(settings.socialPolicy?.dailyLimitMinutes),
          sessionLimitMinutes: Number(settings.socialPolicy?.sessionLimitMinutes),
          cooldownMinutes: Number(settings.socialPolicy?.cooldownMinutes),
        },
      };

      await updateSettings(payload);
      await refreshUserContext();

      // Sync shield display settings to App Group for iOS extensions
      if (Platform.OS === "ios") {
        const unlockMinutes = Number(payload.timerPolicy.unlockMinutes);

        syncScreenTimeSettings(
          Number(payload.timerPolicy.cardsRequired),
          unlockMinutes,
          settings.focusMode || "soft"
        ).catch(() => {});

        // The DeviceActivity threshold and the JS-side backup notification are
        // both driven by unlockMinutes — the same value the user sets in the
        // timer policy. This keeps blocking/unblocking in sync with what the
        // settings screen shows: study → unlock for N minutes → re-block after N.
        if (unlockMinutes > 0) {
          setDailyLimit(unlockMinutes)
            .then(() => startMonitoringBlockedApps(unlockMinutes))
            .then(() => scheduleBlockNotification(unlockMinutes))
            .catch(() => {});
        }
      }

      alert("Settings saved");
    } catch (err) {
      console.log("Save failed:", err);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <View style={styles.center}>
        <Text style={styles.loading}>Loading settings...</Text>
      </View>
    );
  }

  if (role === "child") {
    return (
      <View style={styles.center}>
        <Text style={styles.loading}>
          Settings are managed by your parent.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerCard}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>
          {role === "parent"
            ? "Configure family-level defaults"
            : "Customize your focus system"}
        </Text>
      </View>

      {/* PLAN */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Plan</Text>

        <Text style={styles.planText}>
          Current Plan: {settings.billing?.plan}
        </Text>

        {plan === "free" && (
          <UpgradeButton label="Upgrade → Unlimited Access" />
        )}

        {plan === "free" && adMode !== "ad_supported" && (
          <>
            <Text style={styles.subLabel}>More Decks</Text>
            <Pressable
              onPress={async () => {
                try {
                  setAdModeLoading(true);
                  await api.post("/ad-mode/enable-ad-mode");
                  await refreshUserContext();
                } catch (err) {
                  console.error("Failed to enable ad mode", err);
                } finally {
                  setAdModeLoading(false);
                }
              }}
              style={[styles.secondaryBtn, adModeLoading && { opacity: 0.5 }]}
              disabled={adModeLoading}
            >
              <Text style={styles.secondaryBtnText}>
                {adModeLoading ? "Enabling..." : "Enable Ads for More Decks"}
              </Text>
            </Pressable>
          </>
        )}
      </View>

      {/* REFER A FRIEND */}
      <Pressable
        style={styles.referralCard}
        onPress={() => router.push("/screens/ReferralScreen")}
      >
        <View style={styles.referralLeft}>
          <Text style={styles.referralIcon}>🎁</Text>
          <View>
            <Text style={styles.referralTitle}>Refer a Friend</Text>
            <Text style={styles.referralSub}>Give a month. Get a month.</Text>
          </View>
        </View>
        <Text style={styles.referralArrow}>→</Text>
      </Pressable>

      {/* iOS: re-select blocked apps */}
      {Platform.OS === "ios" && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Blocked Apps</Text>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => router.push("/screens/IOSScreenTimeSetupScreen")}
          >
            <Text style={styles.secondaryBtnText}>Re-select Blocked Apps</Text>
          </Pressable>
        </View>
      )}

      {/* BLOCKING TOGGLE (🔥 CORE FIX) */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Blocking</Text>

        <Pressable
          disabled={saving}
          onPress={async () => {
            const prev = settings.screenLockPolicy?.enabled;
            const next = !prev;

            const updated = {
              ...settings,
              screenLockPolicy: {
                enabled: next,
              },
            };

            setSettings(updated);

            try {
              setSaving(true);

              await updateSettings({
                screenLockPolicy: updated.screenLockPolicy,
              });

              await syncEnforcementDecision();

              await syncEnforcementSettings({
                role,
                enforcementMode: settings.enforcementMode || "self",
                focusMode:
                  role === "parent"
                    ? settings.parentFocusMode || "soft"
                    : settings.focusMode || "soft",
              });

              if (Platform.OS === "ios") {
                if (next) {
                  await applyShield().catch(() => {});
                } else {
                  await clearShield().catch(() => {});
                }
              }

              // Schedule guilt nudges when blocking is turned off,
              // cancel them immediately when it is turned back on.
              if (next) {
                cancelGuiltNotifications().catch(() => {});
              } else {
                scheduleGuiltNotifications().catch(() => {});
              }

            } catch (err) {
              console.log("Toggle failed:", err);

              setSettings({
                ...settings,
                screenLockPolicy: {
                  enabled: prev,
                },
              });
            } finally {
              setSaving(false);
            }
          }}
          style={[
            styles.bigToggle,
            settings.screenLockPolicy?.enabled
              ? styles.toggleOn
              : styles.toggleOff,
          ]}
        >
          <Text style={styles.toggleText}>
            {settings.screenLockPolicy?.enabled
              ? "🟢 Blocking ON"
              : "🔴 Blocking OFF"}
          </Text>
        </Pressable>
      </View>

      {/* INTENSITY */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Blocking Intensity</Text>

        <View style={styles.rowWrap}>
          {["soft", "strict"].map((mode) => (
            <Pressable
              key={mode}
              onPress={async () => {
                const updated = { ...settings, focusMode: mode };

                setSettings(updated);

                await updateSettings({ focusMode: mode });

                await syncEnforcementDecision();
              }}
              style={[
                styles.modeBtn,
                settings.focusMode === mode && styles.modeActive,
              ]}
            >
              <Text style={styles.modeText}>
                {mode.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* TIMER */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Timer Policy</Text>

        <SettingRow
          label="Cards Required"
          value={settings.timerPolicy?.cardsRequired}
          onChange={(v: string) =>
            setSettings({
              ...settings,
              timerPolicy: {
                ...settings.timerPolicy,
                cardsRequired: Number(v),
              },
            })
          }
        />

        <SettingRow
          label="Unlock Minutes"
          value={settings.timerPolicy?.unlockMinutes}
          onChange={(v: string) =>
            setSettings({
              ...settings,
              timerPolicy: {
                ...settings.timerPolicy,
                unlockMinutes: Number(v),
              },
            })
          }
        />
      </View>

      {/* CARD LIMITS */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Card Limits</Text>

        <SettingRow
          label="New Cards per Day"
          value={settings.cardPolicy?.dailyNewCards}
          onChange={(v: string) =>
            setSettings({
              ...settings,
              cardPolicy: {
                ...settings.cardPolicy,
                dailyNewCards: Number(v),
              },
            })
          }
        />

        <SettingRow
          label="Max Reviews per Day"
          value={settings.cardPolicy?.maxReviewsPerDay}
          onChange={(v: string) =>
            setSettings({
              ...settings,
              cardPolicy: {
                ...settings.cardPolicy,
                maxReviewsPerDay: Number(v),
              },
            })
          }
        />
      </View>

      {/* READ ALOUD (TTS) */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Read Aloud</Text>
        <Text style={{ color: "#A9BDDB", marginBottom: 12, fontSize: 13 }}>
          Speak flashcard text using text-to-speech. Automatically skipped on cards that already have audio.
        </Text>
        <Pressable
          onPress={toggleTts}
          style={[
            styles.bigToggle,
            ttsEnabled ? styles.toggleOn : styles.toggleOff,
          ]}
        >
          <Text style={styles.toggleText}>
            {ttsEnabled ? "🔊 Read Aloud ON" : "🔇 Read Aloud OFF"}
          </Text>
        </Pressable>
      </View>

      {/* SAVE */}
      <Pressable onPress={save} style={styles.saveBtn}>
        <Text style={styles.saveText}>
          {saving ? "Saving..." : "Save Settings"}
        </Text>
      </Pressable>

      {/* ACCOUNT */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account</Text>

        <Pressable
          onPress={async () => {
            await clearAuthToken();
            router.replace("/login");
          }}
          style={styles.logoutBtn}
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LucidTheme.bg,
    padding: 24,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: LucidTheme.bg,
  },

  loading: {
    color: "#A9BDDB",
  },

  headerCard: {
    backgroundColor: "#1b2540",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },

  title: {
    color: "white",
    fontSize: 26,
    fontWeight: "800",
  },

  subtitle: {
    color: "#A9BDDB",
    marginTop: 6,
  },

  card: {
    backgroundColor: "#1b2540",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },

  sectionTitle: {
    color: "#D86732",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10,
  },

  planText: {
    color: "white",
  },

  subLabel: {
    color: "#F8C373",
    marginTop: 16,
    fontWeight: "700",
  },

  secondaryBtn: {
    backgroundColor: "#151820",
    padding: 14,
    borderRadius: 12,
    marginTop: 10,
  },

  secondaryBtnText: {
    color: "white",
    textAlign: "center",
    fontWeight: "700",
  },

  rowWrap: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },

  modeBtn: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#151820",
  },

  modeActive: {
    backgroundColor: "#D86732",
  },

  modeText: {
    color: "#fff",
    fontWeight: "700",
  },

  bigToggle: {
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },

  toggleOn: {
    backgroundColor: "#1DB954",
  },

  toggleOff: {
    backgroundColor: "#FF4D4D",
  },

  toggleText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },

  saveBtn: {
    marginTop: 10,
    marginBottom: 30,
    padding: 18,
    backgroundColor: "#D86732",
    borderRadius: 14,
    alignItems: "center",
  },

  saveText: {
    color: "#fff",
    fontWeight: "800",
  },

  logoutBtn: {
    backgroundColor: "#2A2E36",
    padding: 14,
    borderRadius: 12,
  },

  logoutText: {
    color: "#FF6B6B",
    textAlign: "center",
    fontWeight: "700",
  },

  referralCard: {
    backgroundColor: "#1b2540",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#D86732",
  },

  referralLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  referralIcon: {
    fontSize: 28,
  },

  referralTitle: {
    color: "white",
    fontWeight: "800",
    fontSize: 16,
  },

  referralSub: {
    color: "#D86732",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },

  referralArrow: {
    color: "#A9BDDB",
    fontSize: 18,
  },
});