export enum DiscountKind {
  PROMOTION = 'PROMOTION',
  VOUCHER = 'VOUCHER'
}

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT'
}

export enum DiscountTargetingMode {
  ALL_TIERS = 'ALL_TIERS',
  SPECIFIC_TIERS = 'SPECIFIC_TIERS'
}

export enum DiscountAcquisitionMethod {
  ADMIN_GRANTED = 'ADMIN_GRANTED',
  AUTO_ELIGIBLE = 'AUTO_ELIGIBLE',
  POINT_REDEEMED = 'POINT_REDEEMED'
}

export enum UserDiscountStatus {
  AVAILABLE = 'AVAILABLE',
  USED = 'USED',
  EXPIRED = 'EXPIRED',
  FORFEITED = 'FORFEITED'
}

export interface Discount {
  id: string;
  name: string;
  code: string | null;
  description: string;
  type: DiscountKind;
  discountType: DiscountType;
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  requiredPoints: number;
  validDaysAfterClaim: number | null;
  startAt: string;
  endAt: string;
  usageLimit: number | null;
  usedCount: number;
  status: string;
  newCustomerOnly: boolean;
  targetingMode: DiscountTargetingMode;
  applicableTierIds?: string[];
  applicableServiceIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UserDiscount {
  id: string;
  discount: Discount;
  acquisitionMethod: DiscountAcquisitionMethod;
  pointsSpent: number;
  claimedAt: string;
  expiresAt: string | null;
  status: UserDiscountStatus;
  usedAt: string | null;
  usedInBookingId: string | null;
}
