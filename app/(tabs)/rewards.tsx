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
import {
  getMyClaimStatuses,
  getMyRewardBalance,
  requestCashOut,
  type WalletClaim,
  type RewardBalance,
} from "../../services/walletService";
import { useRefocusStore } from "../../store/useRefocusStore";

// ─── Static config (mirrors backend STREAK_MILESTONES) ────────────────────────

const STREAK_MILESTONES = [
  { day: 14,  testsRequired: 6,   icon: "🔥", title: "2-Week Warrior", fundingType: "parent_wallet" },
  { day: 30,  testsRequired: 12,  icon: "⚡", title: "Month Strong",    fundingType: "parent_wallet" },
  { day: 60,  testsRequired: 25,  icon: "🌟", title: "Scholar",         fundingType: "parent_wallet" },
  { day: 90,  testsRequired: 40,  icon: "🏆", title: "Elite Learner",   fundingType: "parent_wallet" },
  { day: 180, testsRequired: 80,  icon: "💎", title: "Hall of Fame",    fundingType: "app_funded"    },
  { day: 365, testsRequired: 150, icon: "🦁", title: "Lucid Legend",    fundingType: "parent_wallet" },
];

const MARKETPLACE_ITEMS = [
  { id: "gc_roblox_5",     title: "Roblox",       amount: "$5",  pointsCost: 5000,  icon: "🎮", category: "Gaming"        },
  { id: "gc_amazon_5",     title: "Amazon",       amount: "$5",  pointsCost: 5000,  icon: "📦", category: "Shopping"      },
  { id: "gc_appstore_5",   title: "App Store",    amount: "$5",  pointsCost: 5000,  icon: "📱", category: "Apps"          },
  { id: "gc_googleplay_5", title: "Google Play",  amount: "$5",  pointsCost: 5000,  icon: "🎯", category: "Gaming"        },
  { id: "gc_doordash_10",  title: "DoorDash",     amount: "$10", pointsCost: 10000, icon: "🍔", category: "Food"          },
  { id: "gc_netflix_10",   title: "Netflix",      amount: "$10", pointsCost: 10000, icon: "🎬", category: "Entertainment" },
  { id: "gc_amazon_10",    title: "Amazon",       amount: "$10", pointsCost: 10000, icon: "📦", category: "Shopping"      },
  { id: "gc_ps_25",        title: "PlayStation",  amount: "$25", pointsCost: 25000, icon: "🕹️", category: "Gaming"        },
  { id: "gc_amazon_25",    title: "Amazon",       amount: "$25", pointsCost: 25000, icon: "📦", category: "Shopping"      },
];

const XP_COIN_RATE = 100;

// ─── Mini progress bar ────────────────────────────────────────────────────────

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <View style={miniBar.track}>
      <View style={[miniBar.fill, { width: `${Math.min(100, pct)}%`, backgroundColor: color }]} />
    </View>
  );
}
const miniBar = StyleSheet.create({
  track: { height: 5, backgroundColor: "#0e1424", borderRadius: 3, overflow: "hidden", marginTop: 4 },
  fill:  { height: "100%", borderRadius: 3 },
});

// ─── Streak Ladder ────────────────────────────────────────────────────────────

function StreakLadder({
  currentStreak,
  qualifyingTests,
  claimsByMilestone,
  onClaim,
}: {
  currentStreak: number;
  qualifyingTests: number;
  claimsByMilestone: Map<number, WalletClaim>;
  onClaim: (day: number, fundingType: string) => void;
}) {
  return (
    <View>
      <Text style={styles.sectionTitle}>🔥 Your Reward Journey</Text>
      <Text style={styles.sectionSub}>
        Every milestone requires two things:{" "}
        <Text style={{ color: "#F8C373", fontWeight: "700" }}>a streak</Text> of consecutive
        learning days and{" "}
        <Text style={{ color: "#60a5fa", fontWeight: "700" }}>tests scored 80%+</Text>.
        Both must be met to earn a reward.
      </Text>

      {STREAK_MILESTONES.map((m, i) => {
        const streakMet = currentStreak >= m.day;
        const testsMet  = qualifyingTests >= m.testsRequired;
        const achieved  = streakMet && testsMet;
        const claim     = claimsByMilestone.get(m.day);
        const isPending = claim?.status === "pending";
        const isApproved = claim?.status === "approved";
        const isDenied  = claim?.status === "denied";
        const isNext    = !isApproved && !isPending && (i === 0 || (
          currentStreak >= STREAK_MILESTONES[i - 1].day &&
          qualifyingTests >= STREAK_MILESTONES[i - 1].testsRequired
        ));
        const streakPct = Math.min(100, (currentStreak / m.day) * 100);
        const testsPct  = Math.min(100, (qualifyingTests / m.testsRequired) * 100);
        const daysLeft  = Math.max(0, m.day - currentStreak);
        const testsLeft = Math.max(0, m.testsRequired - qualifyingTests);

        return (
          <View key={m.day} style={[styles.ladderRow, isNext && styles.ladderRowNext]}>
            {/* Connector */}
            <View style={styles.ladderLeft}>
              <View style={[
                styles.ladderDot,
                isApproved && styles.ladderDotDone,
                isNext && !isPending && styles.ladderDotNext,
                isPending && styles.ladderDotPending,
              ]} />
              {i < STREAK_MILESTONES.length - 1 && (
                <View style={[styles.ladderLine, isApproved && styles.ladderLineDone]} />
              )}
            </View>

            {/* Content */}
            <View style={styles.ladderCenter}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Text style={[styles.ladderIcon, !achieved && !isNext && styles.ladderIconDim]}>
                  {isApproved ? "✅" : m.icon}
                </Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={[styles.ladderTitle, !achieved && !isNext && styles.ladderTitleDim]}>
                      Day {m.day} — {m.title}
                    </Text>
                    {m.fundingType === "app_funded" && (
                      <View style={styles.appFundedBadge}>
                        <Text style={styles.appFundedText}>App Reward</Text>
                      </View>
                    )}
                  </View>
                  {isApproved && <Text style={styles.approvedLabel}>Reward approved ✓</Text>}
                  {isPending && <Text style={styles.pendingLabel}>⏳ Waiting for parent approval</Text>}
                  {isDenied && <Text style={styles.deniedLabel}>Request denied — try again</Text>}
                </View>
              </View>

              {/* Dual progress for non-approved milestones */}
              {!isApproved && (
                <View style={{ gap: 5 }}>
                  <View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={styles.reqLabel}>🔥 Streak</Text>
                      <Text style={[styles.reqValue, streakMet && styles.reqMet]}>
                        {streakMet ? `${m.day}/${m.day} ✓` : `${currentStreak}/${m.day} days`}
                      </Text>
                    </View>
                    <MiniBar pct={streakPct} color={streakMet ? "#22c55e" : "#ff8a3d"} />
                  </View>
                  <View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={styles.reqLabel}>📝 Tests ≥80%</Text>
                      <Text style={[styles.reqValue, testsMet && styles.reqMet]}>
                        {testsMet ? `${m.testsRequired}/${m.testsRequired} ✓` : `${qualifyingTests}/${m.testsRequired}`}
                      </Text>
                    </View>
                    <MiniBar pct={testsPct} color={testsMet ? "#22c55e" : "#60a5fa"} />
                  </View>

                  {isNext && !isPending && !isDenied && (daysLeft > 0 || testsLeft > 0) && (
                    <Text style={styles.countdown}>
                      {[
                        daysLeft  > 0 && `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`,
                        testsLeft > 0 && `${testsLeft} more test${testsLeft !== 1 ? "s" : ""} needed`,
                      ].filter(Boolean).join(" · ")}
                    </Text>
                  )}

                  {/* Claim / Request button */}
                  {achieved && !isPending && (
                    <Pressable
                      style={[styles.claimBtn, m.fundingType === "app_funded" && styles.claimBtnApp]}
                      onPress={() => onClaim(m.day, m.fundingType)}
                    >
                      <Text style={styles.claimBtnText}>
                        {m.fundingType === "app_funded" ? "🎁 Claim App Reward" : "📩 Request Reward from Parent"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>

            {/* Right badge */}
            <View style={[
              styles.ladderBadge,
              isApproved && styles.ladderBadgeDone,
              isNext && styles.ladderBadgeNext,
              isPending && styles.ladderBadgePending,
            ]}>
              <Text style={[styles.ladderReward, (isNext || isPending) && styles.ladderRewardNext]}>
                {m.fundingType === "app_funded" ? "$25" : "Parent"}
              </Text>
              <Text style={styles.ladderRewardLabel}>
                {m.fundingType === "app_funded" ? "App pays" : "Sets amount"}
              </Text>
            </View>
          </View>
        );
      })}

      <View style={styles.ladderLegal}>
        <Text style={styles.ladderLegalText}>
          <Text style={{ color: "#F8C373" }}>Both goals</Text> (streak + tests ≥80%) must be met to request a reward.{"\n\n"}
          <Text style={{ color: "#60a5fa" }}>Parent-funded milestones</Text> are paid from your parent's reward wallet and require their approval. Your parent sets the dollar amount for each milestone.{"\n\n"}
          <Text style={{ color: "#22c55e" }}>App-funded reward</Text> (Day 180) is paid automatically by Lucid — no parent approval needed. One per child per year.{"\n\n"}
          Streak Shields protect your streak for missed days. Repeating the same test does not count toward qualifying tests.
        </Text>
      </View>
    </View>
  );
}

// ─── Marketplace Card ─────────────────────────────────────────────────────────

function MarketplaceCard({ item, coins, onRedeem }: { item: typeof MARKETPLACE_ITEMS[0]; coins: number; onRedeem: (id: string) => void }) {
  const canAfford = coins >= item.pointsCost;
  return (
    <View style={[styles.marketCard, !canAfford && styles.marketCardLocked]}>
      <Text style={styles.marketIcon}>{item.icon}</Text>
      <Text style={styles.marketTitle}>{item.title}</Text>
      <Text style={styles.marketAmount}>{item.amount}</Text>
      <Text style={styles.marketCategory}>{item.category}</Text>
      <Text style={[styles.marketCost, !canAfford && styles.marketCostDim]}>🪙 {item.pointsCost.toLocaleString()}</Text>
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

// ─── Skip Passes ──────────────────────────────────────────────────────────────

function SkipPassSection({ skipPasses }: { skipPasses: number }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>🎟️ Skip Passes</Text>
      <Text style={styles.sectionSub}>
        Use a Skip Pass to bypass one session without breaking your streak.
      </Text>
      <View style={styles.skipPassRow}>
        <View style={styles.skipPassBadge}>
          <Text style={styles.skipPassCount}>{skipPasses}</Text>
          <Text style={styles.skipPassLabel}>Passes</Text>
        </View>
        <View style={{ flex: 1, paddingLeft: 16, gap: 4 }}>
          <Text style={styles.skipPassEarnItem}>✓ Perfect Week bonus</Text>
          <Text style={styles.skipPassEarnItem}>✓ Earn 1,500 coins</Text>
          <Text style={styles.skipPassEarnItem}>✓ Parent-granted pass</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Parent Bounties ──────────────────────────────────────────────────────────

function ParentBountiesSection() {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>💰 Parent Bounties</Text>
      <Text style={styles.sectionSub}>
        Parents can create custom challenges with real-world rewards.
      </Text>
      <View style={styles.bountyPlaceholder}>
        <Text style={styles.bountyPlaceholderIcon}>🎯</Text>
        <Text style={styles.bountyPlaceholderTitle}>No Active Bounties</Text>
        <Text style={styles.bountyPlaceholderSub}>
          Ask a parent to create a bounty in the Family Settings.
        </Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RewardsScreen() {
  const { usage, streak, coins, skipPasses, qualifyingTestsCount, setCoins, setSkipPasses, setQualifyingTestsCount } = useRefocusStore();

  const [refreshing, setRefreshing] = useState(false);
  const [claimsByMilestone, setClaimsByMilestone] = useState<Map<number, WalletClaim>>(new Map());
  const [rewardBalance, setRewardBalance] = useState<RewardBalance | null>(null);
  const [cashingOut, setCashingOut] = useState(false);

  const xp             = usage?.xp ?? 0;
  const level          = Math.floor(xp / 100);
  const currentStreak  = streak?.currentStreak ?? 0;

  const nextMilestone = STREAK_MILESTONES.find(
    (m) => currentStreak < m.day || qualifyingTestsCount < m.testsRequired
  );
  const prevMilestone = STREAK_MILESTONES.slice().reverse().find(
    (m) => currentStreak >= m.day && qualifyingTestsCount >= m.testsRequired
  );

  const ladderProgressPercent = (() => {
    if (!nextMilestone) return 100;
    const startDay   = prevMilestone?.day ?? 0;
    const startTests = prevMilestone?.testsRequired ?? 0;
    const sp = (currentStreak - startDay) / (nextMilestone.day - startDay);
    const tp = (qualifyingTestsCount - startTests) / (nextMilestone.testsRequired - startTests);
    return Math.min(100, Math.min(sp, tp) * 100);
  })();

  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progressAnim, { toValue: ladderProgressPercent / 100, duration: 900, useNativeDriver: false }).start();
  }, [ladderProgressPercent]);

  async function load() {
    try {
      const [balance, claims, rb] = await Promise.all([
        getRewardsBalance(),
        getMyClaimStatuses(),
        getMyRewardBalance().catch(() => null),
      ]);
      setCoins(balance.coins ?? 0);
      setSkipPasses(balance.skipPasses ?? 0);
      setQualifyingTestsCount(balance.qualifyingTestsCount ?? 0);
      if (rb) setRewardBalance(rb);

      const map = new Map<number, WalletClaim>();
      for (const c of claims) map.set(c.milestoneDay, c);
      setClaimsByMilestone(map);
    } catch {
      // silently fall through
    }
  }

  useEffect(() => { load(); }, []);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleCashOut() {
    setCashingOut(true);
    try {
      await requestCashOut();
      Alert.alert(
        "💸 Cash Out Requested!",
        "Your parent has been notified. Once they approve, a gift card will be sent to their email for you."
      );
      load();
    } catch (err: any) {
      Alert.alert("Not yet", err?.response?.data?.error ?? err?.message ?? "Could not request cash out.");
    } finally {
      setCashingOut(false);
    }
  }

  function handleRedeem(itemId: string) {
    const item = MARKETPLACE_ITEMS.find((i) => i.id === itemId);
    if (!item) return;
    Alert.alert(
      "Redeem Reward",
      `Spend ${item.pointsCost.toLocaleString()} coins for a ${item.amount} ${item.title} gift card?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Redeem", onPress: () => Alert.alert("🎁 Reward Requested", "Your parent will receive a notification to approve your reward.") },
      ]
    );
  }

  async function handleClaim(day: number, fundingType: string) {
    try {
      const result = await claimStreakMilestone(day);

      if (fundingType === "app_funded") {
        Alert.alert(
          "🎉 Reward Claimed!",
          "You hit the 180-day milestone — Lucid will send your $25 reward automatically. Well done!"
        );
      } else {
        Alert.alert(
          "📩 Request Sent!",
          "Your parent has been notified. Once they approve the request from their app, you'll receive your reward."
        );
      }
      load();
    } catch (err: any) {
      Alert.alert("Not quite", err?.response?.data?.error ?? err?.message ?? "Could not claim reward.");
    }
  }

  const bottleneckText = (() => {
    if (!nextMilestone) return null;
    const sd = currentStreak >= nextMilestone.day;
    const td = qualifyingTestsCount >= nextMilestone.testsRequired;
    if (!sd && !td) return `${nextMilestone.day - currentStreak}d streak · ${nextMilestone.testsRequired - qualifyingTestsCount} tests left`;
    if (!sd) return `${nextMilestone.day - currentStreak} days left on streak`;
    if (!td) return `${nextMilestone.testsRequired - qualifyingTestsCount} more tests ≥80% needed`;
    return "Both goals met — claim your reward!";
  })();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 50 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ff8a3d" />}
    >
      {/* ── Header ── */}
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

        <View style={styles.xpBarTrack}>
          <Animated.View
            style={[styles.xpBarFill, { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]}
          />
        </View>
        <Text style={styles.xpBarLabel}>Level {level} → {level + 1} · {xp % 100}/100 XP</Text>

        <View style={styles.dualRow}>
          <View style={styles.dualItem}>
            <Text style={styles.dualIcon}>🔥</Text>
            <Text style={styles.dualValue}>{currentStreak}</Text>
            <Text style={styles.dualLabel}>day streak</Text>
          </View>
          <View style={styles.dualDivider} />
          <View style={styles.dualItem}>
            <Text style={styles.dualIcon}>📝</Text>
            <Text style={styles.dualValue}>{qualifyingTestsCount}</Text>
            <Text style={styles.dualLabel}>tests ≥80%</Text>
          </View>
          {nextMilestone && (
            <>
              <View style={styles.dualDivider} />
              <View style={[styles.dualItem, { flex: 1.4 }]}>
                <Text style={[styles.dualLabel, { textAlign: "center", color: "#ff8a3d" }]}>
                  {bottleneckText}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* ── Reward Balance / Cash Out ── */}
      {rewardBalance && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>💵 Reward Balance</Text>
          <Text style={[styles.sectionSub, { marginBottom: 12 }]}>
            Milestone rewards approved by your parent accumulate here. Cash out once you reach $20.
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={{ color: "#9ca3af", fontSize: 13 }}>Available</Text>
              <Text style={{ color: "#fff", fontSize: 28, fontWeight: "700" }}>
                ${(rewardBalance.balanceCents / 100).toFixed(2)}
              </Text>
              {!rewardBalance.canCashOut && (
                <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
                  ${((rewardBalance.thresholdCents - rewardBalance.balanceCents) / 100).toFixed(2)} more to unlock cashout
                </Text>
              )}
            </View>
            <Pressable
              style={[
                cashOutCardStyles.btn,
                !rewardBalance.canCashOut && cashOutCardStyles.btnDisabled,
              ]}
              disabled={!rewardBalance.canCashOut || cashingOut}
              onPress={handleCashOut}
            >
              <Text style={cashOutCardStyles.btnText}>
                {cashingOut ? "..." : rewardBalance.canCashOut ? "Cash Out 🎁" : "Not yet"}
              </Text>
            </Pressable>
          </View>
          {rewardBalance.canCashOut && (
            <Text style={{ color: "#6b7280", fontSize: 11, marginTop: 10 }}>
              A $1.50 processing fee is deducted from your parent's wallet when the gift card is sent.
            </Text>
          )}
        </View>
      )}

      {/* ── Streak Ladder ── */}
      <View style={styles.card}>
        <StreakLadder
          currentStreak={currentStreak}
          qualifyingTests={qualifyingTestsCount}
          claimsByMilestone={claimsByMilestone}
          onClaim={handleClaim}
        />
      </View>

      {/* ── Marketplace ── */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🛍️ Gift Card Marketplace</Text>
        <Text style={styles.sectionSub}>Convert coins into real gift cards.</Text>
        <View style={styles.coinsNotice}>
          <Text style={styles.coinsNoticeText}>
            Your balance: <Text style={{ color: "#ff8a3d", fontWeight: "700" }}>🪙 {coins.toLocaleString()} coins</Text>
            {"\n"}<Text style={{ color: LucidTheme.sub, fontSize: 12 }}>Every {XP_COIN_RATE} XP = 1 coin.</Text>
          </Text>
        </View>
        <View style={styles.marketGrid}>
          {MARKETPLACE_ITEMS.map((item) => (
            <MarketplaceCard key={item.id} item={item} coins={coins} onRedeem={handleRedeem} />
          ))}
        </View>
        <Text style={styles.marketFootnote}>Redemptions require parent approval.</Text>
      </View>

      <SkipPassSection skipPasses={skipPasses} />
      <ParentBountiesSection />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: LucidTheme.bg, paddingHorizontal: 16, paddingTop: 16 },

  headerCard: { backgroundColor: "#1b2540", borderRadius: 20, padding: 20, marginBottom: 16 },
  headerRow:  { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  headerLabel:{ color: LucidTheme.sub, fontSize: 13, fontWeight: "600", marginBottom: 2 },
  headerTitle:{ color: "#fff", fontSize: 28, fontWeight: "800" },
  coinBadge:  { backgroundColor: "#0e1424", borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, alignItems: "center", borderWidth: 1, borderColor: "#ff8a3d33" },
  coinAmount: { color: "#ff8a3d", fontSize: 18, fontWeight: "800" },
  coinLabel:  { color: LucidTheme.sub, fontSize: 11, marginTop: 2 },
  xpBarTrack: { height: 8, backgroundColor: "#0e1424", borderRadius: 4, overflow: "hidden", marginBottom: 6 },
  xpBarFill:  { height: "100%", backgroundColor: "#ff8a3d", borderRadius: 4 },
  xpBarLabel: { color: LucidTheme.sub, fontSize: 11, marginBottom: 14 },

  dualRow:     { flexDirection: "row", alignItems: "center", backgroundColor: "#0e1424", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  dualItem:    { flex: 1, alignItems: "center", gap: 2 },
  dualIcon:    { fontSize: 16 },
  dualValue:   { color: "#fff", fontWeight: "800", fontSize: 20 },
  dualLabel:   { color: LucidTheme.sub, fontSize: 11 },
  dualDivider: { width: 1, height: 36, backgroundColor: "#2a3a5c", marginHorizontal: 8 },

  card:         { backgroundColor: "#1b2540", borderRadius: 20, padding: 20, marginBottom: 16 },
  sectionTitle: { color: "#D86732", fontSize: 18, fontWeight: "800", marginBottom: 6 },
  sectionSub:   { color: LucidTheme.sub, fontSize: 13, lineHeight: 19, marginBottom: 16 },

  ladderRow:     { flexDirection: "row", alignItems: "flex-start", marginBottom: 4 },
  ladderRowNext: { backgroundColor: "#0e1424", borderRadius: 14, padding: 12, marginHorizontal: -8, borderWidth: 1, borderColor: "#ff8a3d55" },
  ladderLeft:    { width: 28, alignItems: "center", paddingTop: 4 },
  ladderDot:     { width: 14, height: 14, borderRadius: 7, backgroundColor: "#2a3a5c", borderWidth: 2, borderColor: "#3a4f70" },
  ladderDotDone: { backgroundColor: "#22c55e", borderColor: "#16a34a" },
  ladderDotNext: { backgroundColor: "#ff8a3d", borderColor: "#ea580c" },
  ladderDotPending: { backgroundColor: "#F8C373", borderColor: "#d97706" },
  ladderLine:    { width: 2, flex: 1, minHeight: 32, backgroundColor: "#2a3a5c", marginTop: 4 },
  ladderLineDone:{ backgroundColor: "#22c55e55" },
  ladderCenter:  { flex: 1, paddingHorizontal: 10, paddingVertical: 2 },
  ladderIcon:    { fontSize: 20 },
  ladderIconDim: { opacity: 0.35 },
  ladderTitle:   { color: "#fff", fontWeight: "700", fontSize: 14 },
  ladderTitleDim:{ color: "#4a5568" },
  ladderBadge:   { backgroundColor: "#0e1424", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6, alignItems: "center", minWidth: 64, borderWidth: 1, borderColor: "#2a3a5c", alignSelf: "flex-start", marginTop: 4 },
  ladderBadgeDone:   { borderColor: "#22c55e44" },
  ladderBadgeNext:   { backgroundColor: "#ff8a3d18", borderColor: "#ff8a3d" },
  ladderBadgePending:{ backgroundColor: "#F8C37318", borderColor: "#F8C373" },
  ladderReward:      { color: LucidTheme.sub, fontWeight: "800", fontSize: 13 },
  ladderRewardNext:  { color: "#ff8a3d" },
  ladderRewardLabel: { color: "#4a5568", fontSize: 10, marginTop: 1 },

  reqLabel:  { color: LucidTheme.sub, fontSize: 11, fontWeight: "600" },
  reqValue:  { color: LucidTheme.sub, fontSize: 11, fontWeight: "700" },
  reqMet:    { color: "#22c55e" },
  countdown: { color: "#ff8a3d", fontSize: 12, fontWeight: "600", marginTop: 4 },

  approvedLabel: { color: "#22c55e", fontSize: 12, fontWeight: "600", marginTop: 2 },
  pendingLabel:  { color: "#F8C373", fontSize: 12, fontWeight: "600", marginTop: 2 },
  deniedLabel:   { color: "#ef4444", fontSize: 12, fontWeight: "600", marginTop: 2 },

  appFundedBadge: { backgroundColor: "#22c55e22", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: "#22c55e" },
  appFundedText:  { color: "#22c55e", fontSize: 10, fontWeight: "700" },

  claimBtn:    { backgroundColor: "#ff8a3d", borderRadius: 10, paddingVertical: 9, alignItems: "center", marginTop: 6 },
  claimBtnApp: { backgroundColor: "#22c55e" },
  claimBtnText:{ color: "#0B0B0F", fontWeight: "800", fontSize: 13 },

  ladderLegal:    { marginTop: 16, backgroundColor: "#0e1424", borderRadius: 10, padding: 12 },
  ladderLegalText:{ color: "#4a5568", fontSize: 11, lineHeight: 17 },

  coinsNotice:    { backgroundColor: "#0e1424", borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "#ff8a3d22" },
  coinsNoticeText:{ color: "#fff", fontSize: 13, lineHeight: 20 },
  marketGrid:     { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 12 },
  marketCard:     { backgroundColor: "#0e1424", borderRadius: 16, padding: 14, width: "47%", borderWidth: 1, borderColor: "#2a3a5c" },
  marketCardLocked:{ opacity: 0.6 },
  marketIcon:     { fontSize: 28, marginBottom: 6 },
  marketTitle:    { color: "#fff", fontWeight: "700", fontSize: 14, marginBottom: 2 },
  marketAmount:   { color: "#ff8a3d", fontWeight: "800", fontSize: 18, marginBottom: 2 },
  marketCategory: { color: LucidTheme.sub, fontSize: 11, marginBottom: 10 },
  marketCost:     { color: "#F8C373", fontWeight: "700", fontSize: 13, marginBottom: 10 },
  marketCostDim:  { color: "#4a5568" },
  marketBtn:      { backgroundColor: "#ff8a3d", borderRadius: 10, paddingVertical: 8, alignItems: "center" },
  marketBtnLocked:{ backgroundColor: "#2a3a5c" },
  marketBtnText:  { color: "#0B0B0F", fontWeight: "800", fontSize: 13 },
  marketBtnTextLocked:{ color: "#4a5568" },
  marketFootnote: { color: "#4a5568", fontSize: 11, textAlign: "center", marginTop: 4 },

  skipPassRow:   { flexDirection: "row", alignItems: "center" },
  skipPassBadge: { backgroundColor: "#0e1424", borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "#F8C37333", minWidth: 80 },
  skipPassCount: { color: "#F8C373", fontSize: 32, fontWeight: "800" },
  skipPassLabel: { color: LucidTheme.sub, fontSize: 11, marginTop: 2, textAlign: "center" },
  skipPassEarnItem:{ color: "#22c55e", fontSize: 12, fontWeight: "600" },

  bountyPlaceholder:    { backgroundColor: "#0e1424", borderRadius: 14, padding: 20, alignItems: "center", borderWidth: 1, borderColor: "#2a3a5c", borderStyle: "dashed" },
  bountyPlaceholderIcon:{ fontSize: 36, marginBottom: 8 },
  bountyPlaceholderTitle:{ color: "#fff", fontWeight: "700", fontSize: 16, marginBottom: 6 },
  bountyPlaceholderSub: { color: LucidTheme.sub, fontSize: 12, textAlign: "center", lineHeight: 18 },
});

const cashOutCardStyles = StyleSheet.create({
  btn:         { backgroundColor: "#ff8a3d", borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, alignItems: "center" },
  btnDisabled: { backgroundColor: "#2a3a5c" },
  btnText:     { color: "#0B0B0F", fontWeight: "800", fontSize: 14 },
});
