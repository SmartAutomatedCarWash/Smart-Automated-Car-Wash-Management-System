import type { PaginationMeta } from "@/entities/reports";

export type AdminVoucher = {
  code: string;
  name: string;
  description: string;
  discountType: "PERCENT" | "FIXED_AMOUNT" | "FREE_SERVICE";
  discountValue: number;
  minAmount: number;
  maxDiscountAmount: number | null;
  requiredPoints: number;
  validDaysAfterClaim: number;
  expiresAt: string;
  active: boolean;
  newCustomerOnly: boolean;
  targetTiers: string[];
  applicableServiceIds: string[];
  startAt: string;
  endAt: string;
  status: "ACTIVE" | "INACTIVE";
  usageLimit: number | null;
};

export type Voucher = AdminVoucher;
export type VoucherDiscountType = "PERCENT" | "FIXED_AMOUNT" | "FREE_SERVICE";
export type VoucherStatus = "ACTIVE" | "INACTIVE";
export type VoucherTargetingMode = "ALL_TIERS" | "SELECTED_TIERS";
export type VoucherRequest = AdminVoucherRequest;

export type AdminVoucherRequest = {
  code: string;
  name: string;
  description: string;
  discountType: "PERCENT" | "FIXED_AMOUNT" | "FREE_SERVICE";
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  requiredPoints: number;
  validDaysAfterClaim: number;
  usageLimit: number | null;
  newCustomerOnly: boolean;
  startAt: string;
  endAt: string;
  status: "ACTIVE" | "INACTIVE";
  targetTiers: string[];
  applicableServiceIds: string[];
};

export type AdminVoucherRedemption = {
  transactionId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  voucherCode: string;
  pointsRedeemed: number;
  balanceAfter: number;
  redeemedAt: string;
};

export type AdminVoucherRedemptionPage = {
  items: AdminVoucherRedemption[];
  pagination: PaginationMeta;
};

