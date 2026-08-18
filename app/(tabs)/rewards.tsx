import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LucidTheme } from "../../constants/lucidTheme";
import { claimStreakMilestone, getRewardsBalance } from "../../services/rewardsService";
import { useRefocusStore } from "../../store/useRefocusStore";

// ─── Static config ─────────────────────────────────────────────────────────

const STREAK_MILESTONES = [
  { day: 7,   reward: "$2",   icon: "🔥", title: "Week Warrior",   xp: 500  },
  { day: 14,  reward: "$5",   icon: "⚡", title: "2-Week Grind",   xp: 1200 },
  { day: 30,  reward: "$10",  icon: "🌟", title: "Month Master",   xp: 3000 },
  { day: 60,  reward: "$25",  icon: "🏆", title: "Scholar",        xp: 7500 },
  { day: 90,  reward: "$50",  icon: "👑", title: "Elite Learner",  xp: 15000 },
  { day: 180, reward: "$100", icon: "💎", title: "Hall of Fame",   xp: 35000 },
  { day: 365, reward: "$250", icon: "🦁", title: "Lucid Legend",   xp: 100000 },
];

const MARKETPLACE_ITEMS = [
  { id: "gc_roblox_5",    title: "Roblox",       amount: "$5",  pointsCost: 5000,  icon: "🎮", category: "Gaming"         },
  { id: "gc_amazon_5",    title: "Amazon",       amount: "$5",  pointsCost: 5000,  icon: "📦", category: "Shopping"       },
  { id: "gc_appstore_5",  title: "App Store",    amount: "$5",  pointsCost: 5000,  icon: "📱", category: "Apps"           },
  { id: "gc_googleplay_5",title: "Google Play",  amount: "$5",  pointsCost: 5000,  icon: "🎯", category: "Gaming"         },
  { id: "gc_doordash_10", title: "DoorDash",     amount: "$10", pointsCost: 10000, icon: "🍔", category: "Food"           },
  { id: "gc_netflix_10",  title: "Netflix",      amount: "$10", pointsCost: 10000, icon: "🎬", category: "Entertainment"  },
  { id: "gc_amazon_10",   title: "Amazon",       amount: "$10", pointsCost: 10000, icon: "📦", category: "Shopping"       },
  { id: "gc_ps_25",       title: "PlayStation",  amount: "$25", pointsCost: 25000, icon: "🕹️", category: "Gaming"         },
  { id: "gc_amazon_25",   title: "Amazon",       amount: "$25", pointsCost: 25000, icon: "📦", category: "Shopping"       },
];

const XP_COIN_RATE = 100; // 100 XP = 1 coin

// ─── Streak Ladder ──────────────────────────────────────────────────────────

function StreakLadder({ currentStreak }: { currentStreak: number }) {
  return (
    <View style={styles.ladderWrap}>
      <Text style={styles.sectionTitle}>🔥 Your Streak Journey</Text>
      <Text style={styles.sectionSub}>
        Every qualified day moves you up. Complete today's learning to protect your streak.
      </Text>

      {STREAK_MILESTONES.map((m, i) => {
        const achieved = currentStreak >= m.day;
        const isNext = !achieved && (i === 0 || currentStreak >= STREAK_MILESTONES[i - 1].day);
        const daysLeft = m.day - currentStreak;

        return (
          <View key={m.day} style={[styles.ladderRow, isNext && styles.ladderRowNext]}>
            {/* Left: connector line */}
            <View style={styles.ladderLeft}>
              <View style={[styles.ladderDot, achieved && styles.ladderDotDone, isNext && styles.ladderDotNext]} />
              {i < STREAK_MILESTONES.length - 1 && (
                <View style={[styles.ladderLine, achieved && styles.ladderLineDone]} />
              )}
            </View>

            {/* Center: info */}
            <View style={styles.ladderCenter}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={[styles.ladderIcon, !achieved && !isNext && styles.ladderIconDim]}>
                  {achieved ? "✅" : m.icon}
                </Text>
                <View>
                  <Text style={[styles.ladderTitle, !achieved && !isNext && styles.ladderTitleDim]}>
                    Day {m.day} — {m.title}
                  </Text>
                  {isNext && daysLeft > 0 && (
                    <Text style={styles.ladderCountdown}>
                      {daysLeft} day{daysLeft !== 1 ? "s" : ""} away
                    </Text>
                  )}
                  {achieved && (
                    <Text style={styles.ladderDoneLabel}>Achieved ✓</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Right: reward badge */}
            <View style={[styles.ladderBadge, achieved && styles.ladderBadgeDone, isNext && styles.ladderBadgeNext]}>
              <Text style={[styles.ladderReward, isNext && styles.ladderRewardNext]}>{m.reward}</Text>
              <Text style={styles.ladderRewardLabel}>Reward</Text>
            </View>
          </View>
        );
      })}

      <View style={styles.ladderLegal}>
        <Text style={styles.ladderLegalText}>
          Rewards require completing a qualified streak day: scheduled reviews, minimum 10 cards,
          and passing accuracy. Streak Shields protect your progress for missed days.
        </Text>
      </View>
    </View>
  );
}

// ─── Marketplace Card ───────────────────────────────────────────────────────

function MarketplaceCard({
  item,
  coins,
  onRedeem,
}: {
  item: (typeof MARKETPLACE_ITEMS)[0];
  coins: number;
  onRedeem: (id: string) => void;
}) {
  const canAfford = coins >= item.pointsCost;

  return (
    <View style={[styles.marketCard, !canAfford && styles.marketCardLocked]}>
      <Text style={styles.marketIcon}>{item.icon}</Text>
      <Text style={styles.marketTitle}>{item.title}</Text>
      <Text style={styles.marketAmount}>{item.amount}</Text>
      <Text style={styles.marketCategory}>{item.category}</Text>
      <View style={styles.marketCostRow}>
        <Text style={[styles.marketCost, !canAfford && styles.marketCostDim]}>
          🪙 {item.pointsCost.toLocaleString()}
        </Text>
      </View>
      <Pressable
        style={[styles.marketBtn, !canAfford && styles.marketBtnLocked]}
        onPress={() => canAfford && onRedeem(item.id)}
      >
        <Text style={[styles.marketBtnText, !canAfford && styles.marketBtnTextLocked]}>
          {canAfford ? "Redeem" : "🔒 Locked"}
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Skip Pass ──────────────────────────────────────────────────────────────

function SkipPassSection({ skipPasses }: { skipPasses: number }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>🎟️ Skip Passes</Text>
      <Text style={styles.sectionSub}>
        Use a Skip Pass to bypass one Lucid session without breaking your streak.
        Earn passes through challenges or spend 1,500 coins.
      </Text>

      <View style={styles.skipPassRow}>
        <View style={styles.skipPassBadge}>
          <Text style={styles.skipPassCount}>{skipPasses}</Text>
          <Text style={styles.skipPassLabel}>Passes Available</Text>
        </View>
        <View style={{ flex: 1, paddingLeft: 16 }}>
          <Text style={styles.skipPassHint}>
            Skip Passes are rare. Save them for when you really need one.
          </Text>
          <View style={styles.skipPassEarnWays}>
            <Text style={styles.skipPassEarnItem}>✓ Perfect Week bonus</Text>
            <Text style={styles.skipPassEarnItem}>✓ Earn 1,500 coins</Text>
            <Text style={styles.skipPassEarnItem}>✓ Parent-granted pass</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Parent Bounties ────────────────────────────────────────────────────────

function ParentBountiesSection() {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>💰 Parent Bounties</Text>
      <Text style={styles.sectionSub}>
        Parents can create custom challenges with real-world rewards. Complete them
        to earn extra XP, coins, and special prizes.
      </Text>

      <View style={styles.bountyPlaceholder}>
        <Text style={styles.bountyPlaceholderIcon}>🎯</Text>
        <Text style={styles.bountyPlaceholderTitle}>No Active Bounties</Text>
        <Text style={styles.bountyPlaceholderSub}>
          Ask a parent to create a bounty in the Family Settings. They can set
          custom rewards for hitting specific learning goals.
        </Text>
      </View>

      <View style={styles.bountyExamples}>
        <Text style={styles.bountyExamplesTitle}>Examples from other families:</Text>
        {[
          { label: "Master Chapter 6 Math by Friday", reward: "$10", boost: "3×" },
          { label: "Complete homework deck every day this week", reward: "2hr gaming Saturday", boost: "2×" },
          { label: "100-card mastery milestone", reward: "$5 allowance", boost: "1×" },
        ].map((ex, i) => (
          <View key={i} style={styles.bountyExampleRow}>
            <View style={styles.bountyXPBadge}>
              <Text style={styles.bountyXPText}>{ex.boost} XP</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bountyExLabel}>{ex.label}</Text>
              <Text style={styles.bountyExReward}>🎁 {ex.reward}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function RewardsScreen() {
  const { usage, streak, coins, skipPasses, setCoins, setSkipPasses } = useRefocusStore();

  const [refreshing, setRefreshing] = useState(false);
  const xp = usage?.xp ?? 0;
  const level = Math.floor(xp / 100);
  const levelProgress = (xp % 100) / 100;
  const currentStreak = streak?.currentStreak ?? 0;

  // Find the next milestone the user is working toward
  const nextMilestone = STREAK_MILESTONES.find((m) => currentStreak < m.day);
  const prevMilestone = STREAK_MILESTONES.slice().reverse().find((m) => currentStreak >= m.day);

  // Progress within the current milestone window
  const ladderProgressPercent = (() => {
    if (!nextMilestone) return 100;
    const start = prevMilestone?.day ?? 0;
    const end = nextMilestone.day;
    return Math.min(100, ((currentStreak - start) / (end - start)) * 100);
  })();

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: ladderProgressPercent / 100,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [ladderProgressPercent]);

  async function loadRewardsData() {
    try {
      const balance = await getRewardsBalance();
      setCoins(balance.coins ?? 0);
      setSkipPasses(balance.skipPasses ?? 0);
    } catch {
      // Backend not yet wired — silently fall through
    }
  }

  useEffect(() => {
    loadRewardsData();
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await loadRewardsData();
    setRefreshing(false);
  }

  function handleRedeem(itemId: string) {
    const item = MARKETPLACE_ITEMS.find((i) => i.id === itemId);
    if (!item) return;
    Alert.alert(
      "Redeem Reward",
      `Spend ${item.pointsCost.toLocaleString()} coins for a ${item.amount} ${item.title} gift card?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Redeem",
          onPress: () => {
            Alert.alert("🎁 Reward Requested", "Your parent will receive a notification to approve your reward.");
          },
        },
      ],
    );
  }

  async function handleClaimMilestone(day: number) {
    try {
      await claimStreakMilestone(day);
      Alert.alert("🎉 Reward Claimed!", "Check with a parent to receive your reward.");
      loadRewardsData();
    } catch {
      Alert.alert("Not yet", "You haven't quite reached this milestone. Keep going!");
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 50 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ff8a3d" />}
    >
      {/* ── Balance Header ── */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerLabel}>Level {level}</Text>
            <Text style={styles.headerTitle}>⚡ {xp.toLocaleString()} XP</Text>
          </View>
          <View style={styles.coinBadge}>
            <Text style={styles.coinAmount}>🪙 {coins.toLocaleString()}</Text>
            <Text style={styles.coinLabel}>coins</Text>
          </View>
        </View>

        {/* XP level bar */}
        <View style={styles.xpBarTrack}>
          <Animated.View
            style={[
              styles.xpBarFill,
              { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) },
            ]}
          />
        </View>
        <Text style={styles.xpBarLabel}>
          Level {level} → {level + 1} · {xp % 100}/100 XP
        </Text>

        {/* Streak summary */}
        <View style={styles.streakSummaryRow}>
          <Text style={styles.streakSummaryLabel}>🔥 {currentStreak}-day streak</Text>
          {nextMilestone && (
            <Text style={styles.streakSummaryNext}>
              {nextMilestone.day - currentStreak}d until {nextMilestone.reward} reward
            </Text>
          )}
        </View>
      </View>

      {/* ── Streak Ladder ── */}
      <View style={styles.card}>
        <StreakLadder currentStreak={currentStreak} />
      </View>

      {/* ── Gift Card Marketplace ── */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🛍️ Gift Card Marketplace</Text>
        <Text style={styles.sectionSub}>
          Convert your coins into real gift cards. Earn coins by completing sessions, maintaining streaks,
          and hitting mastery milestones.
        </Text>

        <View style={styles.coinsNotice}>
          <Text style={styles.coinsNoticeText}>
            Your balance: <Text style={{ color: "#ff8a3d", fontWeight: "700" }}>🪙 {coins.toLocaleString()} coins</Text>
            {"\n"}
            <Text style={{ color: LucidTheme.sub, fontSize: 12 }}>
              Every {XP_COIN_RATE} XP you earn converts to 1 coin.
            </Text>
          </Text>
        </View>

        <View style={styles.marketGrid}>
          {MARKETPLACE_ITEMS.map((item) => (
            <MarketplaceCard key={item.id} item={item} coins={coins} onRedeem={handleRedeem} />
          ))}
        </View>

        <Text style={styles.marketFootnote}>
          Redemptions require parent approval. Gift cards are delivered digitally after approval.
        </Text>
      </View>

      {/* ── Skip Passes ── */}
      <SkipPassSection skipPasses={skipPasses} />

      {/* ── Parent Bounties ── */}
      <ParentBountiesSection />
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LucidTheme.bg,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // ── Header ──
  headerCard: {
    backgroundColor: "#1b2540",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  headerLabel: {
    color: LucidTheme.sub,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
  },
  coinBadge: {
    backgroundColor: "#0e1424",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ff8a3d33",
  },
  coinAmount: {
    color: "#ff8a3d",
    fontSize: 18,
    fontWeight: "800",
  },
  coinLabel: {
    color: LucidTheme.sub,
    fontSize: 11,
    marginTop: 2,
  },
  xpBarTrack: {
    height: 8,
    backgroundColor: "#0e1424",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 6,
  },
  xpBarFill: {
    height: "100%",
    backgroundColor: "#ff8a3d",
    borderRadius: 4,
  },
  xpBarLabel: {
    color: LucidTheme.sub,
    fontSize: 11,
    marginBottom: 14,
  },
  streakSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  streakSummaryLabel: {
    color: "#F8C373",
    fontWeight: "700",
    fontSize: 14,
  },
  streakSummaryNext: {
    color: LucidTheme.sub,
    fontSize: 12,
  },

  // ── Card wrapper ──
  card: {
    backgroundColor: "#1b2540",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#D86732",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  sectionSub: {
    color: LucidTheme.sub,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },

  // ── Streak Ladder ──
  ladderWrap: {},
  ladderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  ladderRowNext: {
    backgroundColor: "#0e1424",
    borderRadius: 14,
    padding: 12,
    marginHorizontal: -8,
    borderWidth: 1,
    borderColor: "#ff8a3d55",
  },
  ladderLeft: {
    width: 28,
    alignItems: "center",
    paddingTop: 4,
  },
  ladderDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#2a3a5c",
    borderWidth: 2,
    borderColor: "#3a4f70",
  },
  ladderDotDone: {
    backgroundColor: "#22c55e",
    borderColor: "#16a34a",
  },
  ladderDotNext: {
    backgroundColor: "#ff8a3d",
    borderColor: "#ea580c",
  },
  ladderLine: {
    width: 2,
    flex: 1,
    minHeight: 32,
    backgroundColor: "#2a3a5c",
    marginTop: 4,
  },
  ladderLineDone: {
    backgroundColor: "#22c55e55",
  },
  ladderCenter: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  ladderIcon: {
    fontSize: 20,
  },
  ladderIconDim: {
    opacity: 0.35,
  },
  ladderTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  ladderTitleDim: {
    color: "#4a5568",
  },
  ladderCountdown: {
    color: "#ff8a3d",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  ladderDoneLabel: {
    color: "#22c55e",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  ladderBadge: {
    backgroundColor: "#0e1424",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    minWidth: 60,
    borderWidth: 1,
    borderColor: "#2a3a5c",
  },
  ladderBadgeDone: {
    borderColor: "#22c55e44",
  },
  ladderBadgeNext: {
    backgroundColor: "#ff8a3d18",
    borderColor: "#ff8a3d",
  },
  ladderReward: {
    color: LucidTheme.sub,
    fontWeight: "800",
    fontSize: 14,
  },
  ladderRewardNext: {
    color: "#ff8a3d",
  },
  ladderRewardLabel: {
    color: "#4a5568",
    fontSize: 10,
    marginTop: 1,
  },
  ladderLegal: {
    marginTop: 16,
    backgroundColor: "#0e1424",
    borderRadius: 10,
    padding: 12,
  },
  ladderLegalText: {
    color: "#4a5568",
    fontSize: 11,
    lineHeight: 16,
  },

  // ── Marketplace ──
  coinsNotice: {
    backgroundColor: "#0e1424",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ff8a3d22",
  },
  coinsNoticeText: {
    color: "#fff",
    fontSize: 13,
    lineHeight: 20,
  },
  marketGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  marketCard: {
    backgroundColor: "#0e1424",
    borderRadius: 16,
    padding: 14,
    width: "47%",
    borderWidth: 1,
    borderColor: "#2a3a5c",
  },
  marketCardLocked: {
    opacity: 0.6,
  },
  marketIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  marketTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 2,
  },
  marketAmount: {
    color: "#ff8a3d",
    fontWeight: "800",
    fontSize: 18,
    marginBottom: 2,
  },
  marketCategory: {
    color: LucidTheme.sub,
    fontSize: 11,
    marginBottom: 10,
  },
  marketCostRow: {
    marginBottom: 10,
  },
  marketCost: {
    color: "#F8C373",
    fontWeight: "700",
    fontSize: 13,
  },
  marketCostDim: {
    color: "#4a5568",
  },
  marketBtn: {
    backgroundColor: "#ff8a3d",
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  marketBtnLocked: {
    backgroundColor: "#2a3a5c",
  },
  marketBtnText: {
    color: "#0B0B0F",
    fontWeight: "800",
    fontSize: 13,
  },
  marketBtnTextLocked: {
    color: "#4a5568",
  },
  marketFootnote: {
    color: "#4a5568",
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },

  // ── Skip Passes ──
  skipPassRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  skipPassBadge: {
    backgroundColor: "#0e1424",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F8C37333",
    minWidth: 80,
  },
  skipPassCount: {
    color: "#F8C373",
    fontSize: 32,
    fontWeight: "800",
  },
  skipPassLabel: {
    color: LucidTheme.sub,
    fontSize: 11,
    marginTop: 2,
    textAlign: "center",
  },
  skipPassHint: {
    color: LucidTheme.sub,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  skipPassEarnWays: {
    gap: 4,
  },
  skipPassEarnItem: {
    color: "#22c55e",
    fontSize: 12,
    fontWeight: "600",
  },

  // ── Parent Bounties ──
  bountyPlaceholder: {
    backgroundColor: "#0e1424",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2a3a5c",
    borderStyle: "dashed",
  },
  bountyPlaceholderIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  bountyPlaceholderTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 6,
  },
  bountyPlaceholderSub: {
    color: LucidTheme.sub,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  bountyExamples: {
    backgroundColor: "#0e1424",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#2a3a5c",
  },
  bountyExamplesTitle: {
    color: LucidTheme.sub,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 10,
  },
  bountyExampleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  bountyXPBadge: {
    backgroundColor: "#D8673222",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#D86732",
    minWidth: 52,
    alignItems: "center",
  },
  bountyXPText: {
    color: "#D86732",
    fontWeight: "800",
    fontSize: 12,
  },
  bountyExLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  bountyExReward: {
    color: "#22c55e",
    fontSize: 11,
  },
});
