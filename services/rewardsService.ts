import api from "./api";

export type ChallengeType = "speed" | "perfect" | "boss";

export type StreakMilestone = {
  day: number;
  rewardLabel: string;
  rewardAmount: number;
  icon: string;
  title: string;
  claimed: boolean;
  claimable: boolean;
};

export type MarketplaceItem = {
  id: string;
  title: string;
  brand: string;
  amount: string;
  pointsCost: number;
  icon: string;
  category: string;
  available: boolean;
  comingSoon?: boolean;
};

export type RewardsBalance = {
  coins: number;
  skipPasses: number;
  pendingRewards: number;
};

export type ParentBounty = {
  id: string;
  title: string;
  description: string;
  rewardLabel: string;
  progressCurrent: number;
  progressTotal: number;
  deadline?: string;
  xpBoostMultiplier?: number;
};

export async function getRewardsBalance(): Promise<RewardsBalance> {
  const res = await api.get("/rewards/balance");
  return res.data;
}

export async function getStreakMilestones(): Promise<StreakMilestone[]> {
  const res = await api.get("/rewards/streak-milestones");
  return res.data;
}

export async function claimStreakMilestone(milestoneDay: number) {
  const res = await api.post("/rewards/claim-streak", { milestoneDay });
  return res.data;
}

export async function getMarketplaceItems(): Promise<MarketplaceItem[]> {
  const res = await api.get("/rewards/marketplace");
  return res.data;
}

export async function redeemItem(itemId: string) {
  const res = await api.post("/rewards/redeem", { itemId });
  return res.data;
}

export async function getSkipPasses(): Promise<{ count: number }> {
  const res = await api.get("/rewards/skip-passes");
  return res.data;
}

export async function useSkipPass() {
  const res = await api.post("/rewards/use-skip-pass");
  return res.data;
}

export async function getParentBounties(): Promise<ParentBounty[]> {
  const res = await api.get("/rewards/parent-bounties");
  return res.data;
}

export async function recordChallengeResult(
  challengeType: ChallengeType,
  success: boolean,
  cardsCompleted: number,
  timeTakenSeconds?: number,
) {
  const res = await api.post("/rewards/challenge-result", {
    challengeType,
    success,
    cardsCompleted,
    timeTakenSeconds,
  });
  return res.data;
}
