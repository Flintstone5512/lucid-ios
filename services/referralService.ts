import api from "./api";

export type ReferralEntry = {
  id: string;
  friendEmail: string;
  status: "signed_up" | "trial" | "converted" | "churned";
  createdAt: string;
};

export type PendingReferralReward = {
  id: string;
  friendEmail: string;
};

export type ReferralStats = {
  code: string;
  shareUrl: string;
  totalReferred: number;
  totalConverted: number;
  milestoneLevel: "friend" | "ambassador" | "legend" | null;
  referrals: ReferralEntry[];
  pendingRewards: PendingReferralReward[];
};

export async function getReferralStats(): Promise<ReferralStats> {
  const res = await api.get("/referral/stats");
  return res.data;
}

export async function applyReferralCode(code: string) {
  const res = await api.post("/referral/apply", { code });
  return res.data;
}

export async function claimReferralReward(
  rewardId: string,
  rewardType: "subscription" | "wallet_credit"
) {
  const res = await api.post("/referral/claim-reward", { rewardId, rewardType });
  return res.data;
}
