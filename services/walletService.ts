import api from "./api";

export type WalletClaim = {
  _id: string;
  childUserId: string;
  childName?: string;
  milestoneDay: number;
  milestoneName?: string;
  amountCents: number;
  fundingType: "parent_wallet" | "app_funded";
  status: "pending" | "approved" | "denied";
  createdAt: string;
};

export type WalletTransaction = {
  _id: string;
  type: "topup" | "reward_payout" | "refund";
  amountCents: number;
  childUserId?: string;
  milestoneDay?: number;
  description: string;
  createdAt: string;
};

export type WalletSummary = {
  balanceCents: number;
  pendingClaims: WalletClaim[];
  recentTransactions: WalletTransaction[];
};

export type MilestoneRewardConfig = {
  childUserId: string;
  milestoneDay: number;
  amountCents: number;
};

// ── Parent endpoints ──────────────────────────────────────────────────────────

export async function getParentWallet(): Promise<WalletSummary> {
  const res = await api.get("/parent/wallet");
  return res.data;
}

export async function topUpWallet(amountCents: number): Promise<{ ok: boolean; balanceCents: number }> {
  const res = await api.post("/parent/wallet/topup", { amountCents });
  return res.data;
}

export async function getMilestoneRewardConfigs(): Promise<MilestoneRewardConfig[]> {
  const res = await api.get("/parent/wallet/configs");
  return res.data.configs ?? [];
}

export async function setMilestoneRewardConfig(
  childUserId: string,
  milestoneDay: number,
  amountCents: number
): Promise<{ ok: boolean }> {
  const res = await api.post("/parent/wallet/configs", { childUserId, milestoneDay, amountCents });
  return res.data;
}

export async function approveRewardClaim(claimId: string): Promise<{ ok: boolean; amountCents: number }> {
  const res = await api.post("/parent/wallet/approve-claim", { claimId });
  return res.data;
}

export async function denyRewardClaim(claimId: string): Promise<{ ok: boolean }> {
  const res = await api.post("/parent/wallet/deny-claim", { claimId });
  return res.data;
}

// ── Child endpoint ────────────────────────────────────────────────────────────

export async function getMyClaimStatuses(): Promise<WalletClaim[]> {
  const res = await api.get("/parent/wallet/my-claims");
  return res.data.claims ?? [];
}
