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

export async function createTopUpIntent(amountCents: number): Promise<{ ok: boolean; clientSecret: string }> {
  const res = await api.post("/parent/wallet/topup/intent", { amountCents });
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

// ── Cashout endpoints ─────────────────────────────────────────────────────────

export type RewardBalance = {
  balanceCents: number;
  thresholdCents: number;
  canCashOut: boolean;
};

export type CashOutHistoryItem = {
  _id: string;
  amountCents: number;
  tremendousFee: number;
  status: "pending" | "approved" | "denied" | "sent";
  recipientEmail: string;
  createdAt: string;
};

export type PendingCashOutRequest = {
  _id: string;
  childUserId: string;
  childName: string;
  amountCents: number;
  tremendousFee: number;
  totalDeductedCents: number;
  recipientEmail: string;
  status: string;
  createdAt: string;
};

// Child: get accumulated reward balance
export async function getMyRewardBalance(): Promise<RewardBalance> {
  const res = await api.get("/cashout/balance");
  return res.data;
}

// Child: request cashout (creates pending request for parent)
export async function requestCashOut(): Promise<{ ok: boolean }> {
  const res = await api.post("/cashout/request");
  return res.data;
}

// Child: cashout history
export async function getMyCashOutHistory(): Promise<CashOutHistoryItem[]> {
  const res = await api.get("/cashout/history");
  return res.data.history ?? [];
}

// Parent: get pending cashout requests
export async function getPendingCashOutRequests(): Promise<{ requests: PendingCashOutRequest[]; tremendousFee: number }> {
  const res = await api.get("/cashout/pending");
  return res.data;
}

// Parent: approve cashout → fires Tremendous gift card
export async function approveCashOutRequest(cashOutRequestId: string): Promise<{ ok: boolean }> {
  const res = await api.post("/cashout/approve", { cashOutRequestId });
  return res.data;
}

// Parent: deny cashout
export async function denyCashOutRequest(cashOutRequestId: string): Promise<{ ok: boolean }> {
  const res = await api.post("/cashout/deny", { cashOutRequestId });
  return res.data;
}
