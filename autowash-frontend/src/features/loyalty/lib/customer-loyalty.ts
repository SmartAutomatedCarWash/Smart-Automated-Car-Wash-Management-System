import type {
  LoyaltyAccount,
  LoyaltyTier,
  LoyaltyTransactionType,
  TierVoucherOffer,
  PromotionType,
} from "@/entities/loyalty";

import type { TierConfig } from "@/features/settings/lib/admin-tiers-service";



export function formatTierLabel(tier: LoyaltyTier) {
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}

export function canRedeemTierOffer(currentTier: LoyaltyTier, offer: TierVoucherOffer, configs: TierConfig[]) {
  const sorted = [...configs].sort((a, b) => a.rankOrder - b.rankOrder);
  const currentRank = sorted.findIndex(c => c.tier === currentTier);
  const offerRank = sorted.findIndex(c => c.tier === offer.minTier);
  return currentRank >= offerRank;
}

export function formatLoyaltyTransactionType(type: LoyaltyTransactionType) {
  switch (type) {
    case "EARN":
      return "Points earned";
    case "REDEEM":
      return "Points redeemed";
    case "BONUS":
      return "Bonus points";
    case "ADJUSTMENT":
      return "Manual adjustment";
    case "EXPIRE":
      return "Expired points";
    case "TIER_UPGRADE":
      return "Tier upgraded";
    case "ADJUST":
      return "Manual adjust";
  }
}

export function formatLoyaltyPoints(points: number) {
  const prefix = points > 0 ? "+" : "";
  return `${prefix}${points.toLocaleString("vi-VN")} pts`;
}

export function formatPromotionType(type: PromotionType) {
  switch (type) {
    case "ALL_TIERS":
      return "All members";
    case "SELECTED_TIERS":
      return "Selected tiers";
    case "NEW_CUSTOMERS":
      return "New customers";
  }
}

export function getTierProgress(tier: LoyaltyTier, currentPoints: number, configs: TierConfig[]) {
  const sorted = [...configs].sort((a, b) => a.rankOrder - b.rankOrder);
  const currentIndex = sorted.findIndex(c => c.tier === tier);
  
  const currentConfig = sorted[currentIndex];
  const nextConfig = sorted[currentIndex + 1];

  if (!nextConfig) {
    return {
      currentTier: tier,
      nextTier: null,
      currentPoints,
      nextThreshold: null,
      pointsToNextTier: 0,
      progressPercent: 100,
    };
  }

  const baseThreshold = currentConfig ? currentConfig.minPoints : 0;
  const nextThreshold = nextConfig.minPoints;
  const earnedWithinTier = Math.max(currentPoints - baseThreshold, 0);
  const tierSpan = Math.max(nextThreshold - baseThreshold, 1);
  const progressPercent = Math.min(100, Math.round((earnedWithinTier / tierSpan) * 100));

  return {
    currentTier: tier,
    nextTier: nextConfig.tier as LoyaltyTier,
    currentPoints,
    nextThreshold,
    pointsToNextTier: Math.max(nextThreshold - currentPoints, 0),
    progressPercent,
  };
}

export function buildLoyaltySummary(account: LoyaltyAccount, configs: TierConfig[], offers: TierVoucherOffer[] = []) {
  const availablePoints = account.availablePoints ?? account.currentPoints;
  const lifetimePoints = account.lifetimePoints ?? account.totalEarnedPoints;

  return {
    ...account,
    availablePoints,
    lifetimePoints,
    tierLabel: formatTierLabel(account.tier),
    progress: getTierProgress(account.tier, lifetimePoints, configs),
    voucherOffers: offers.map((offer) => ({
      ...offer,
      eligible: canRedeemTierOffer(account.tier, offer, configs),
      affordable: availablePoints >= offer.pointsCost,
    })),
  };
}
