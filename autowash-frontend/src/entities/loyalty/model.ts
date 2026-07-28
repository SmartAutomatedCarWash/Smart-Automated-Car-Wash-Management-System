export type LoyaltyTier = string;

export type LoyaltyAccount = {
  customerId: string;
  tier: LoyaltyTier;
  currentPoints: number;
  totalEarnedPoints: number;
  availablePoints: number;
  lifetimePoints: number;
  completedWashCount: number;
  totalBookingCount?: number;
  totalPaid?: number;
};

export type LoyaltyTransactionType =
  | "EARN"
  | "REDEEM"
  | "BONUS"
  | "ADJUSTMENT"
  | "EXPIRE"
  | "TIER_UPGRADE"
  | "ADJUST";

export type LoyaltyTransaction = {
  transactionId: string;
  sessionId: string | null;
  bookingId: string | null;
  type: LoyaltyTransactionType;
  points: number;
  description: string;
  createdAt: string;
};

export type RedeemPointsRequest = {
  offerId: string;
};

export type RedeemPointsResponse = {
  transactionId: string;
  pointsRedeemed: number;
  newBalance: number;
  discountCode: string;
  discountValue: number;
  expiresAt: string;
  status: "SUCCESS";
};

export type TierVoucherOffer = {
  id: string;
  title: string;
  minTier: LoyaltyTier;
  pointsCost: number;
  voucherValue: number;
  accent: "sky" | "violet" | "amber" | "rose" | "fuchsia";
  badge: string;
};

export type WashHistoryItem = {
  sessionId: string;
  bookingId: string;
  vehiclePlate: string;
  primaryItemName: string | null;
  bookingDate: string;
  bookingTime: string;
  finalAmount: number;
  awardedPoints: number;
  status: "COMPLETED";
  completedAt: string;
};

