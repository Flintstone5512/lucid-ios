import { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  Pressable,
  View,
  StyleSheet,
} from "react-native";

import { getSettings, updateSettings } from "../../services/settingsService";
import SettingRow from "../../components/SettingRow";
import { useRefocusStore } from "../../store/useRefocusStore";
import UpgradeButton from "../../components/UpgradeButton";
import { refreshUserContext } from "../../services/contextService";
import api from "../../services/api";
import { LucidTheme } from "../../constants/lucidTheme";

export default function SettingsScreen() {
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const { plan, context } = useRefocusStore();
  const role = context?.role || "solo";

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await getSettings();
      setSettings(res.settings);
    } catch (err) {
      console.log("Settings load error:", err);
    }
  }

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
        screenLockPolicy: {
          enabled: Boolean(settings.screenLockPolicy?.enabled),
          strictMode: Boolean(settings.screenLockPolicy?.strictMode),
        },
        socialPolicy: {
          dailyLimitMinutes: Number(settings.socialPolicy?.dailyLimitMinutes),
          sessionLimitMinutes: Number(settings.socialPolicy?.sessionLimitMinutes),
          cooldownMinutes: Number(settings.socialPolicy?.cooldownMinutes),
        },
      };

      if (role === "solo") {
        payload.focusMode = settings.focusMode;
      }

      console.log("Saving settings payload:", payload);

      await updateSettings(payload);
      await refreshUserContext();

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
      <View style={styles.headerCard}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>
          {role === "parent"
            ? "Configure family-level defaults and account options"
            : "Customize your focus and learning system"}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Plan</Text>

        <Text style={styles.planText}>
          Current Plan: {settings.billing?.plan}
        </Text>

        {plan === "free" && (
          <UpgradeButton label="Upgrade → Unlimited Access" />
        )}

        <Text style={styles.subLabel}>More Decks</Text>

        <Pressable
          onPress={async () => {
            await api.post("/ad-mode/enable-ad-mode");
            await refreshUserContext();
          }}
          style={styles.secondaryBtn}
        >
          <Text style={styles.secondaryBtnText}>
            Enable Ads for More Decks
          </Text>
        </Pressable>
      </View>

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

        <SettingRow
          label="Max Unlock Per Day"
          value={settings.timerPolicy?.maxUnlockPerDay}
          onChange={(v: string) =>
            setSettings({
              ...settings,
              timerPolicy: {
                ...settings.timerPolicy,
                maxUnlockPerDay: Number(v),
              },
            })
          }
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Card Policy</Text>

        <SettingRow
          label="Daily New Cards"
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
          label="Max Reviews Per Day"
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

        <View style={styles.rowWrap}>
          {["easy", "medium", "hard"].map((difficulty) => (
            <Pressable
              key={difficulty}
              onPress={() =>
                setSettings({
                  ...settings,
                  cardPolicy: {
                    ...settings.cardPolicy,
                    difficulty,
                  },
                })
              }
              style={[
                styles.modeBtn,
                settings.cardPolicy?.difficulty === difficulty &&
                  styles.modeActive,
              ]}
            >
              <Text style={styles.modeText}>
                {difficulty.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {role === "solo" && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Focus Mode</Text>

          <Text style={styles.helper}>
            Controls how aggressively Lucid interrupts scrolling
          </Text>

          <View style={styles.rowWrap}>
            {["off", "soft", "strict"].map((mode) => (
              <Pressable
                key={mode}
                onPress={() =>
                  setSettings({
                    ...settings,
                    focusMode: mode,
                  })
                }
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
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Scheduling Policy</Text>

        <View style={styles.rowWrap}>
          {[true, false].map((enabled) => (
            <Pressable
              key={String(enabled)}
              onPress={() =>
                setSettings({
                  ...settings,
                  schedulingPolicy: {
                    ...settings.schedulingPolicy,
                    reminderEnabled: enabled,
                  },
                })
              }
              style={[
                styles.modeBtn,
                settings.schedulingPolicy?.reminderEnabled === enabled &&
                  styles.modeActive,
              ]}
            >
              <Text style={styles.modeText}>
                {enabled ? "REMINDERS ON" : "REMINDERS OFF"}
              </Text>
            </Pressable>
          ))}
        </View>

        <SettingRow
          label="Reminder Minutes Before"
          value={settings.schedulingPolicy?.reminderMinutesBefore}
          onChange={(v: string) =>
            setSettings({
              ...settings,
              schedulingPolicy: {
                ...settings.schedulingPolicy,
                reminderMinutesBefore: Number(v),
              },
            })
          }
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Screen Lock Policy</Text>

        <View style={styles.rowWrap}>
          {[true, false].map((enabled) => (
            <Pressable
              key={`screen-lock-${String(enabled)}`}
              onPress={() =>
                setSettings({
                  ...settings,
                  screenLockPolicy: {
                    ...settings.screenLockPolicy,
                    enabled,
                  },
                })
              }
              style={[
                styles.modeBtn,
                settings.screenLockPolicy?.enabled === enabled &&
                  styles.modeActive,
              ]}
            >
              <Text style={styles.modeText}>
                {enabled ? "LOCK ON" : "LOCK OFF"}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.rowWrap}>
          {[true, false].map((strictMode) => (
            <Pressable
              key={`strict-${String(strictMode)}`}
              onPress={() =>
                setSettings({
                  ...settings,
                  screenLockPolicy: {
                    ...settings.screenLockPolicy,
                    strictMode,
                  },
                })
              }
              style={[
                styles.modeBtn,
                settings.screenLockPolicy?.strictMode === strictMode &&
                  styles.modeActive,
              ]}
            >
              <Text style={styles.modeText}>
                {strictMode ? "STRICT LOCK" : "STANDARD LOCK"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Social Policy</Text>

        <SettingRow
          label="Daily Limit Minutes"
          value={settings.socialPolicy?.dailyLimitMinutes}
          onChange={(v: string) =>
            setSettings({
              ...settings,
              socialPolicy: {
                ...settings.socialPolicy,
                dailyLimitMinutes: Number(v),
              },
            })
          }
        />

        <SettingRow
          label="Session Limit Minutes"
          value={settings.socialPolicy?.sessionLimitMinutes}
          onChange={(v: string) =>
            setSettings({
              ...settings,
              socialPolicy: {
                ...settings.socialPolicy,
                sessionLimitMinutes: Number(v),
              },
            })
          }
        />

        <SettingRow
          label="Cooldown Minutes"
          value={settings.socialPolicy?.cooldownMinutes}
          onChange={(v: string) =>
            setSettings({
              ...settings,
              socialPolicy: {
                ...settings.socialPolicy,
                cooldownMinutes: Number(v),
              },
            })
          }
        />
      </View>

      <Pressable onPress={save} style={styles.saveBtn}>
        <Text style={styles.saveText}>
          {saving ? "Saving..." : "Save Settings"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

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
    padding: 24,
  },

  loading: {
    color: "#A9BDDB",
    textAlign: "center",
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

  helper: {
    color: "#A9BDDB",
    marginBottom: 10,
  },

  subLabel: {
    color: "#F8C373",
    marginTop: 16,
    fontWeight: "700",
  },

  planText: {
    color: "white",
    marginBottom: 10,
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
    flexWrap: "wrap",
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
});