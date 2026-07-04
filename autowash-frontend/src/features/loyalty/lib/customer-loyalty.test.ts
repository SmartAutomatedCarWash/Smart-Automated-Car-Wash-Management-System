import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLoyaltySummary,
  canRedeemTierOffer,
  formatLoyaltyPoints,
  formatLoyaltyTransactionType,
  formatPromotionType,
  formatTierLabel,
  getTierProgress,
} from "./customer-loyalty.ts";

import type { TierConfig } from "@/features/settings/lib/admin-tiers-service";
import type { TierVoucherOffer } from "@/entities/loyalty";

const MOCK_CONFIGS: TierConfig[] = [
  { tier: "MEMBER", minPoints: 0, pointMultiplier: 1.0, priorityScore: 0, updatedAt: "" },
  { tier: "SILVER", minPoints: 500, pointMultiplier: 1.2, priorityScore: 0, updatedAt: "" },
  { tier: "GOLD", minPoints: 1500, pointMultiplier: 1.5, priorityScore: 0, updatedAt: "" },
  { tier: "PLATINUM", minPoints: 4000, pointMultiplier: 2.0, priorityScore: 80, updatedAt: "" },
  { tier: "DIAMOND", minPoints: 10000, pointMultiplier: 2.5, priorityScore: 100, updatedAt: "" },
];

const MOCK_OFFERS: TierVoucherOffer[] = [
  { id: "bronze-50", title: "Bronze Voucher", minTier: "BRONZE", pointsCost: 50, voucherValue: 50000, accent: "sky", badge: "Bronze" },
  { id: "silver-100", title: "Silver Voucher", minTier: "SILVER", pointsCost: 100, voucherValue: 100000, accent: "violet", badge: "Silver" },
  { id: "platinum-200", title: "Platinum Voucher", minTier: "PLATINUM", pointsCost: 200, voucherValue: 200000, accent: "rose", badge: "Platinum" },
];

test("computes loyalty tier progress against the next threshold", () => {
  assert.deepEqual(getTierProgress("MEMBER", 320, MOCK_CONFIGS), {
    currentTier: "MEMBER",
    nextTier: "SILVER",
    currentPoints: 320,
    nextThreshold: 500,
    pointsToNextTier: 180,
    progressPercent: 64,
  });
});

test("caps loyalty progress at 100 percent for the highest tier", () => {
  assert.deepEqual(getTierProgress("DIAMOND", 12000, MOCK_CONFIGS), {
    currentTier: "DIAMOND",
    nextTier: null,
    currentPoints: 12000,
    nextThreshold: null,
    pointsToNextTier: 0,
    progressPercent: 100,
  });
});

test("formats tier, transaction, and promotion labels for customer pages", () => {
  assert.equal(formatTierLabel("GOLD"), "Gold");
  assert.equal(formatLoyaltyTransactionType("EARN"), "Points earned");
  assert.equal(formatLoyaltyTransactionType("TIER_UPGRADE"), "Tier upgraded");
  assert.equal(formatPromotionType("SELECTED_TIERS"), "Selected tiers");
  assert.equal(formatLoyaltyPoints(27), "+27 pts");
  assert.equal(formatLoyaltyPoints(-50), "-50 pts");
});

test("limits voucher offers by current loyalty tier", () => {
  const platinumOffer = MOCK_OFFERS.find((offer) => offer.minTier === "PLATINUM");
  assert.ok(platinumOffer);
  assert.equal(canRedeemTierOffer("GOLD", platinumOffer, MOCK_CONFIGS), false);
  assert.equal(canRedeemTierOffer("PLATINUM", platinumOffer, MOCK_CONFIGS), true);
});

test("uses lifetime points for tier progress and available points for redemption affordability", () => {
  const summary = buildLoyaltySummary({
    customerId: "customer-1",
    tier: "SILVER",
    currentPoints: 40,
    totalEarnedPoints: 520,
    availablePoints: 40,
    lifetimePoints: 520,
    completedWashCount: 6,
  }, MOCK_CONFIGS, MOCK_OFFERS);

  assert.equal(summary.progress.currentPoints, 520);
  assert.equal(summary.voucherOffers.find((offer) => offer.id === "bronze-50")?.affordable, false);
});
