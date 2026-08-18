import { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  Pressable,
  View,
  StyleSheet,
  Share,
  Alert,
  ActivityIndicator,
  Clipboard,
} from "react-native";
import { router } from "expo-router";
import { LucidTheme } from "../../constants/lucidTheme";
import {
  getReferralStats,
  claimReferralReward,
  ReferralStats,
  ReferralEntry,
  PendingReferralReward,
} from "../../services/referralService";

const MILESTONES = [
  {
    key: "friend",
    count: 1,
    icon: "👤",
    title: "FRIEND",
    reward: "1 month free",
    color: "#4A9EFF",
  },
  {
    key: "ambassador",
    count: 5,
    icon: "🚀",
    title: "AMBASSADOR",
    reward: "6 months free",
    color: "#F8C373",
  },
  {
    key: "legend",
    count: 25,
    icon: "👑",
    title: "LUCID LEGEND",
    reward: "Pro free for life",
    color: "#D86732",
  },
];

const STATUS_LABELS: Record<ReferralEntry["status"], string> = {
  signed_up: "Signed Up",
  trial: "On Trial",
  converted: "Paying",
  churned: "Churned",
};

const STATUS_COLORS: Record<ReferralEntry["status"], string> = {
  signed_up: "#6B7280",
  trial: "#F8C373",
  converted: "#1DB954",
  churned: "#FF4D4D",
};

export default function ReferralScreen() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await getReferralStats();
      setStats(data);
    } catch {
      Alert.alert("Error", "Could not load referral info. Try again later.");
    } finally {
      setLoading(false);
    }
  }

  async function handleShare() {
    if (!stats) return;
    try {
      await Share.share({
        message: `Here's a free month of Lucid — the app I use with my kids to make screen time educational. Use my link: ${stats.shareUrl}`,
        url: stats.shareUrl,
      });
    } catch {
      // user cancelled or share failed — no-op
    }
  }

  function copyCode() {
    if (!stats) return;
    Clipboard.setString(stats.code);
    Alert.alert("Copied!", `Code ${stats.code} copied to clipboard.`);
  }

  function promptClaim(reward: PendingReferralReward) {
    Alert.alert(
      "Choose Your Reward",
      `${reward.friendEmail} is now a paying member.\n\nPick your referral reward:`,
      [
        {
          text: "1 Month Lucid Pro FREE",
          onPress: () => claim(reward.id, "subscription"),
        },
        {
          text: "$10 Family Reward Credit",
          onPress: () => claim(reward.id, "wallet_credit"),
        },
        { text: "Decide Later", style: "cancel" },
      ]
    );
  }

  async function claim(rewardId: string, rewardType: "subscription" | "wallet_credit") {
    try {
      setClaiming(rewardId);
      await claimReferralReward(rewardId, rewardType);
      await load();
      Alert.alert(
        "Reward Claimed!",
        rewardType === "subscription"
          ? "One free month has been added to your account."
          : "$10 has been added to your Family Reward Wallet."
      );
    } catch {
      Alert.alert("Error", "Could not claim reward. Try again.");
    } finally {
      setClaiming(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#D86732" />
      </View>
    );
  }

  if (!stats) return null;

  const converted = stats.totalConverted;

  const currentMilestoneIndex = [...MILESTONES]
    .reverse()
    .findIndex((m) => converted >= m.count);
  const activeMilestone =
    currentMilestoneIndex >= 0
      ? MILESTONES[MILESTONES.length - 1 - currentMilestoneIndex]
      : null;

  const nextMilestone = MILESTONES.find((m) => converted < m.count);
  const progressToNext = nextMilestone
    ? Math.min(converted / nextMilestone.count, 1)
    : 1;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      {/* HEADER */}
      <View style={styles.headerCard}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Refer a Friend</Text>
        <Text style={styles.tagline}>Give a month. Get a month.</Text>
        <Text style={styles.subTagline}>
          Your friend gets 1 month of Lucid Pro free. When they become a paying
          member, you get 1 month free too.
        </Text>
      </View>

      {/* SHARE CARD */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Your Referral Code</Text>
        <Pressable onPress={copyCode} style={styles.codeBox}>
          <Text style={styles.codeText}>{stats.code}</Text>
          <Text style={styles.copyHint}>tap to copy</Text>
        </Pressable>
        <Pressable onPress={handleShare} style={styles.shareBtn}>
          <Text style={styles.shareBtnText}>Share Free Month</Text>
        </Pressable>
        <Text style={styles.shareNote}>
          They get a 30-day Pro trial. You earn your reward when they become a
          paying member.
        </Text>
      </View>

      {/* MILESTONES */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Your Progress</Text>
        <Text style={styles.convertedCount}>
          {converted} paying{" "}
          {converted === 1 ? "referral" : "referrals"}
        </Text>

        {nextMilestone && (
          <View style={styles.progressBarWrap}>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progressToNext * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.progressLabel}>
              {converted}/{nextMilestone.count} to{" "}
              {nextMilestone.title}
            </Text>
          </View>
        )}

        <View style={styles.milestonesRow}>
          {MILESTONES.map((m) => {
            const reached = converted >= m.count;
            return (
              <View
                key={m.key}
                style={[
                  styles.milestoneCard,
                  reached && { borderColor: m.color, borderWidth: 2 },
                ]}
              >
                <Text style={styles.milestoneIcon}>{m.icon}</Text>
                <Text style={[styles.milestoneName, reached && { color: m.color }]}>
                  {m.title}
                </Text>
                <Text style={styles.milestoneCount}>{m.count} referral{m.count > 1 ? "s" : ""}</Text>
                <Text style={styles.milestoneReward}>{m.reward}</Text>
                {reached && <Text style={[styles.reachedBadge, { color: m.color }]}>REACHED</Text>}
              </View>
            );
          })}
        </View>
      </View>

      {/* PENDING REWARDS */}
      {stats.pendingRewards.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Claim Your Rewards</Text>
          {stats.pendingRewards.map((r) => (
            <View key={r.id} style={styles.pendingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingEmail}>{r.friendEmail}</Text>
                <Text style={styles.pendingHint}>just became a paying member</Text>
              </View>
              <Pressable
                onPress={() => promptClaim(r)}
                disabled={claiming === r.id}
                style={[styles.claimBtn, claiming === r.id && { opacity: 0.5 }]}
              >
                <Text style={styles.claimBtnText}>
                  {claiming === r.id ? "..." : "Claim"}
                </Text>
              </Pressable>
            </View>
          ))}
          <Text style={styles.rewardChoiceNote}>
            Choose: 1 month free for you, or $10 added to your child's Reward
            Wallet.
          </Text>
        </View>
      )}

      {/* REFERRALS LIST */}
      {stats.referrals.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Referred Friends ({stats.totalReferred})
          </Text>
          {stats.referrals.map((r) => (
            <View key={r.id} style={styles.referralRow}>
              <Text style={styles.referralEmail} numberOfLines={1}>
                {r.friendEmail}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: STATUS_COLORS[r.status] + "33" },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: STATUS_COLORS[r.status] },
                  ]}
                >
                  {STATUS_LABELS[r.status]}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {stats.referrals.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>📨</Text>
          <Text style={styles.emptyText}>No referrals yet</Text>
          <Text style={styles.emptySubtext}>
            Share your code and give a friend a free month.
          </Text>
        </View>
      )}
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
  },

  headerCard: {
    backgroundColor: "#1b2540",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },

  backBtn: {
    marginBottom: 12,
  },

  backText: {
    color: "#A9BDDB",
    fontSize: 14,
  },

  title: {
    color: "white",
    fontSize: 26,
    fontWeight: "800",
  },

  tagline: {
    color: "#D86732",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 6,
  },

  subTagline: {
    color: "#A9BDDB",
    marginTop: 8,
    lineHeight: 20,
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
    marginBottom: 12,
  },

  codeBox: {
    backgroundColor: "#0B1220",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#D86732",
  },

  codeText: {
    color: "white",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 4,
  },

  copyHint: {
    color: "#A9BDDB",
    fontSize: 11,
    marginTop: 4,
  },

  shareBtn: {
    backgroundColor: "#D86732",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },

  shareBtnText: {
    color: "white",
    fontWeight: "800",
    fontSize: 16,
  },

  shareNote: {
    color: "#A9BDDB",
    fontSize: 12,
    marginTop: 10,
    textAlign: "center",
    lineHeight: 18,
  },

  convertedCount: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },

  progressBarWrap: {
    marginBottom: 16,
  },

  progressBarBg: {
    height: 8,
    backgroundColor: "#0B1220",
    borderRadius: 4,
    overflow: "hidden",
  },

  progressBarFill: {
    height: 8,
    backgroundColor: "#D86732",
    borderRadius: 4,
  },

  progressLabel: {
    color: "#A9BDDB",
    fontSize: 12,
    marginTop: 6,
  },

  milestonesRow: {
    flexDirection: "row",
    gap: 8,
  },

  milestoneCard: {
    flex: 1,
    backgroundColor: "#0B1220",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },

  milestoneIcon: {
    fontSize: 22,
    marginBottom: 4,
  },

  milestoneName: {
    color: "#A9BDDB",
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },

  milestoneCount: {
    color: "#6B7280",
    fontSize: 10,
    marginTop: 2,
    textAlign: "center",
  },

  milestoneReward: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
    textAlign: "center",
  },

  reachedBadge: {
    fontSize: 9,
    fontWeight: "800",
    marginTop: 4,
  },

  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0B1220",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },

  pendingEmail: {
    color: "white",
    fontWeight: "700",
    fontSize: 14,
  },

  pendingHint: {
    color: "#1DB954",
    fontSize: 11,
    marginTop: 2,
  },

  claimBtn: {
    backgroundColor: "#D86732",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  claimBtnText: {
    color: "white",
    fontWeight: "800",
    fontSize: 13,
  },

  rewardChoiceNote: {
    color: "#A9BDDB",
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },

  referralRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#0B1220",
  },

  referralEmail: {
    color: "white",
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },

  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },

  emptyCard: {
    backgroundColor: "#1b2540",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    marginBottom: 20,
  },

  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },

  emptyText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },

  emptySubtext: {
    color: "#A9BDDB",
    marginTop: 6,
    textAlign: "center",
    lineHeight: 20,
  },
});
