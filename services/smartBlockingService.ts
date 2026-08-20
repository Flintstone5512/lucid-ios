import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./api";

const STORAGE_KEY = "lucid_smart_blocking_enabled";

export async function isSmartBlockingEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(STORAGE_KEY);
  return val === "true";
}

export async function setSmartBlockingEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, String(enabled));
}

export type SmartBlockingResult = {
  cardsRequired: number;
  unlockMinutes: number;
  reasoning: string[];
};

export async function computeSmartBlockingPolicy(
  settings: any
): Promise<SmartBlockingResult> {
  const reasoning: string[] = [];
  let cardsRequired = 5;
  let unlockMinutes = 20;

  let dashboard: any = {};
  let rewards: any = { coins: 0, skipPasses: 0 };
  let bounties: any[] = [];

  try {
    const res = await api.get("/analytics/dashboard");
    dashboard = res.data?.dashboard ?? res.data ?? {};
  } catch {}

  try {
    const res = await api.get("/rewards/balance");
    rewards = res.data ?? {};
  } catch {}

  try {
    const res = await api.get("/rewards/parent-bounties");
    bounties = Array.isArray(res.data) ? res.data : [];
  } catch {}

  const today = dashboard?.today ?? {};
  const trends = dashboard?.trends ?? {};
  const behavior = dashboard?.behavior ?? {};

  const wastedToday: number = today.wastedMinutes ?? 0;
  const weeklyAvgWasted: number = trends.weeklyAvg?.wastedMinutes ?? 0;
  const dailyLimit: number = settings?.socialPolicy?.dailyLimitMinutes ?? 60;
  const conversionRate: number = behavior.conversionRate ?? 0.5;
  const skipPasses: number = rewards.skipPasses ?? 0;
  const coins: number = rewards.coins ?? 0;

  // Factor 1: Today's social media vs weekly average
  if (weeklyAvgWasted > 0) {
    const ratio = wastedToday / weeklyAvgWasted;
    if (ratio > 1.3) {
      cardsRequired += 2;
      unlockMinutes -= 5;
      reasoning.push(
        `Heavy scrolling today (${wastedToday}m vs ${Math.round(weeklyAvgWasted)}m avg) — tightening study gates.`
      );
    } else if (ratio < 0.7 && wastedToday > 0) {
      unlockMinutes += 5;
      reasoning.push(
        `Light scrolling today (${wastedToday}m vs ${Math.round(weeklyAvgWasted)}m avg) — rewarding with longer unlocks.`
      );
    }
  }

  // Factor 2: Daily social media limit usage
  if (dailyLimit > 0) {
    const limitRatio = wastedToday / dailyLimit;
    if (limitRatio > 0.8) {
      cardsRequired += 2;
      reasoning.push(
        `Approaching your ${dailyLimit}m daily limit (${wastedToday}m used) — adding 2 extra cards.`
      );
    } else if (limitRatio < 0.3) {
      cardsRequired = Math.max(2, cardsRequired - 1);
      reasoning.push(
        `Well under your daily limit — card requirement eased slightly.`
      );
    }
  }

  // Factor 3: Learning retention / focus efficiency
  if (conversionRate < 0.4) {
    cardsRequired += 2;
    unlockMinutes -= 5;
    reasoning.push(
      `Focus efficiency is low (${Math.round(conversionRate * 100)}%) — more study required before unlocking.`
    );
  } else if (conversionRate > 0.7) {
    cardsRequired = Math.max(2, cardsRequired - 1);
    reasoning.push(
      `Strong focus efficiency (${Math.round(conversionRate * 100)}%) — slightly reducing card requirements.`
    );
  }

  // Factor 4: Skip passes banked
  if (skipPasses >= 5) {
    unlockMinutes += 5;
    reasoning.push(
      `You have ${skipPasses} skip passes saved — rewarding with a slightly longer unlock window.`
    );
  }

  // Factor 5: XP / coins earned
  if (coins > 500) {
    unlockMinutes += 3;
    reasoning.push(
      `High XP balance (${coins} coins) — good learner bonus applied.`
    );
  }

  // Factor 6: Active parent bounties
  const activeBounties = bounties.filter(
    (b) => b.progressCurrent < b.progressTotal
  );
  if (activeBounties.length > 0) {
    cardsRequired += 1;
    reasoning.push(
      `${activeBounties.length} active parent ${activeBounties.length === 1 ? "bounty" : "bounties"} — maintaining study pressure.`
    );
  }

  if (reasoning.length === 0) {
    reasoning.push(
      "Usage and retention look balanced — standard settings applied."
    );
  }

  // Clamp to safe range
  cardsRequired = Math.max(2, Math.min(15, cardsRequired));
  unlockMinutes = Math.max(10, Math.min(45, unlockMinutes));

  return { cardsRequired, unlockMinutes, reasoning };
}
