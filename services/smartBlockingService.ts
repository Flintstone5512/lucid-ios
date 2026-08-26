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
  goalsSummary?: GoalsSummary | null;
};

export type GoalProgress = {
  deckId: string;
  deckName: string;
  totalCards: number;
  examReadyCards: number;
  masteredCards: number;
  masteryPct: number;
  daysRemaining: number;
  dailyCardsNeeded: number;
  targetDate: string | null;
  urgencyScore: number;
};

export type GoalsSummary = {
  goals: GoalProgress[];
  allOnTrack: boolean;
  mostUrgent: GoalProgress | null;
};

export type SessionContext = {
  selectedDeckId?: string | null;
  shuffleMode?: boolean;
  shuffleDeckIds?: string[];
};

export async function computeSmartBlockingPolicy(
  settings: any,
  sessionContext?: SessionContext
): Promise<SmartBlockingResult> {
  const reasoning: string[] = [];
  let cardsRequired = 5;
  let unlockMinutes = 20;

  let dashboard: any = {};
  let rewards: any = { coins: 0, skipPasses: 0 };
  let bounties: any[] = [];
  let goalsSummary: GoalsSummary | null = null;

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

  try {
    const res = await api.get("/decks/goals-summary");
    if (res.data?.ok) {
      goalsSummary = res.data as GoalsSummary;
    }
  } catch {}

  // Determine which deck IDs are active in the current session
  const activeDeckIds = new Set<string>(
    sessionContext?.shuffleMode && sessionContext.shuffleDeckIds?.length
      ? sessionContext.shuffleDeckIds
      : sessionContext?.selectedDeckId
      ? [sessionContext.selectedDeckId]
      : []
  );

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

  // Factor 7: Active study goals (multi-deck, urgency-ranked)
  if (goalsSummary && goalsSummary.goals.length > 0) {
    const { goals, allOnTrack, mostUrgent } = goalsSummary;

    // Prefer goals from the active session decks; fall back to all goals
    const sessionGoals = activeDeckIds.size > 0
      ? goals.filter((g) => activeDeckIds.has(g.deckId.toString()))
      : goals;
    const relevantGoals = sessionGoals.length > 0 ? sessionGoals : goals;

    if (allOnTrack && relevantGoals.every((g) => g.masteryPct >= 80)) {
      // All goals well ahead — reward with eased requirements
      cardsRequired = Math.max(2, cardsRequired - 2);
      unlockMinutes = Math.min(45, unlockMinutes + 5);
      reasoning.push(
        `All study goals on track (80%+ exam-ready) — rewarding with easier gates. Keep it up!`
      );
    } else {
      // Most urgent goal sets the floor
      const urgent = relevantGoals[0];
      const days = urgent.daysRemaining;
      const pct = urgent.masteryPct;
      const dailyNeeded = urgent.dailyCardsNeeded;

      if (days <= 3 && pct < 70) {
        cardsRequired = Math.max(cardsRequired + 3, dailyNeeded);
        unlockMinutes = Math.max(10, unlockMinutes - 5);
        reasoning.push(
          `"${urgent.deckName}" test in ${days} day${days !== 1 ? "s" : ""} — only ${pct}% exam-ready. Crunch mode on.`
        );
      } else if (days <= 7 && pct < 60) {
        cardsRequired = Math.max(cardsRequired + 2, dailyNeeded);
        reasoning.push(
          `"${urgent.deckName}" test in ${days} days — ${pct}% exam-ready and behind pace.`
        );
      } else {
        cardsRequired = Math.max(cardsRequired, dailyNeeded);
        reasoning.push(
          `"${urgent.deckName}": ${pct}% exam-ready, ${days} day${days !== 1 ? "s" : ""} to go — pacing to your goal.`
        );
      }

      // Each additional urgent goal (days ≤ 14, pct < 75) adds +1 card — uncapped here,
      // the 2–15 clamp below handles the ceiling so it never conflicts with challenges
      const additionalUrgent = relevantGoals.slice(1).filter(
        (g) => g.daysRemaining <= 14 && g.masteryPct < 75
      );
      if (additionalUrgent.length > 0) {
        cardsRequired += additionalUrgent.length;
        const names = additionalUrgent.map((g) => `"${g.deckName}"`).join(", ");
        reasoning.push(
          `${additionalUrgent.length} more upcoming test${additionalUrgent.length !== 1 ? "s" : ""} (${names}) — adding extra study pressure.`
        );
      }
    }
  }

  if (reasoning.length === 0) {
    reasoning.push(
      "Usage and retention look balanced — standard settings applied."
    );
  }

  // Clamp to safe range
  cardsRequired = Math.max(2, Math.min(15, cardsRequired));
  unlockMinutes = Math.max(10, Math.min(45, unlockMinutes));

  return { cardsRequired, unlockMinutes, reasoning, goalsSummary };
}
