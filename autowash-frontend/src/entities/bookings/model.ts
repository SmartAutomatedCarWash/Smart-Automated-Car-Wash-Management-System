import type { ApiPaginatedResponse } from "@/shared/types/api.types";

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type BookingListFilterStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type BookingConfirmationStatus = "PENDING" | "VERIFIED" | "EXPIRED" | "CANCELLED";

export type PaymentMethod = "BANK_TRANSFER" | "E_WALLET" | "CASH_AT_COUNTER";

export type BookingMode = "PACKAGE" | "COMBO";

export type BookingPackage = {
  packageId: string;
  name: string;
  description: string;
  basePrice: number;
  duration: number;
  category: string;
  features: string[];
  image: string | null;
  status: string;
  popularity: string | null;
};

export type BookingAddon = {
  addonId: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  category: string;
  image: string | null;
  applicableToPackages: string[];
  status: string;
};

export type BookingCombo = {
  comboId: string;
  name: string;
  description: string;
  basePrice: number;
  durationDays: number;
  maxServices: number;
  benefits: string[];
  image: string | null;
  imageUrls?: string[] | null;
  isActive: boolean;
  canUpgrade: boolean;
  upgradePriceFrom: number;
};

export type CustomerCombo = {
  customerComboId: string;
  comboId: string;
  comboName: string;
  status: string;
  totalUsages: number;
  remainingUsages: number;
  activatedAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
};

export type VoucherValidationRequest = {
  voucherCode: string;
  packageId?: string;
  amount: number;
};

export type VoucherValidationResult = {
  voucherCode: string;
  isValid: boolean;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  finalAmount: number;
  expiresAt: string;
};

export type CreateBookingRequest = {
  vehicleId: string;
  packageId?: string;
  comboId?: string;
  options: string[];
  bookingDate: string;
  bookingTime: string;
  voucherCode?: string;
  paymentMethod: PaymentMethod;
};

export type HoldSlotRequest = {
  bookingDate: string;
  bookingTime: string;
};

export type HoldSlotResponse = {
  slotTime: string;
  expiresAt: string;
};

export type BookingAddonSelection = {
  addonId: string;
  addonName: string;
  addonPrice: number;
};

export type CreateBookingResponse = {
  bookingId: string;
  customerId: string;
  vehicleId: string;
  vehiclePlate: string;
  packageId: string | null;
  packageName: string;
  addons?: BookingAddonSelection[];
  options?: BookingAddonSelection[];
  basePrice: number;
  addonsTotal?: number;
  optionsTotal?: number;
  voucherDiscount: number;
  finalAmount: number;
  bookingDate: string;
  bookingTime: string;
  estimatedDuration: number;
  paymentMethod: PaymentMethod;
  paymentStatus: string;
  status: BookingStatus;
  confirmationStatus: BookingConfirmationStatus;
  createdAt: string;
  confirmationNumber: string;
  comboId: string | null;
  customerComboId: string | null;
  comboPurchased: boolean;
};

export type BookingListItem = {
  bookingId: string;
  vehiclePlate: string;
  packageName: string | null;
  bookingDate: string;
  bookingTime: string;
  finalAmount: number;
  status: BookingStatus;
  washStatus: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type BookingDetail = {
  bookingId: string;
  confirmationNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleBrand: string;
  vehicleModel: string;
  packageId: string | null;
  packageName: string | null;
  addons?: BookingAddonSelection[];
  options?: BookingAddonSelection[];
  pricing: {
    basePrice: number;
    addonsTotal?: number;
    optionsTotal?: number;
    subtotal: number;
    voucherCode: string | null;
    voucherDiscount: number;
    pointsRedeemed: number;
    pointsDiscount: number;
    finalAmount: number;
    currency: string;
  };
  scheduling: {
    bookingDate: string;
    bookingTime: string;
    estimatedDuration: number;
    estimatedEndTime: string;
  };
  payment: {
    method: string;
    status: string;
    transactionId: string;
    paidAt: string | null;
  };
  status: BookingStatus;
  confirmationStatus: BookingConfirmationStatus;
  confirmationExpiresAt: string | null;
  washSessionId: string | null;
  staffName: string | null;
  washStatus: string | null;
  notes: string | null;
  createdAt: string;
};

export type BookingListPage = {
  items: BookingListItem[];
  pagination: ApiPaginatedResponse<never>["pagination"];
};

export type BookingListFilters = {
  status?: BookingListFilterStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

export type ApplyBookingPointsRequest = {
  pointsToApply: number;
};

export type ApplyBookingPointsResponse = {
  bookingId: string;
  pointsApplied: number;
  discountAmount: number;
  finalAmount: number;
  loyaltyBalance: number;
  currency: string;
};

export type CancelBookingResponse = {
  bookingId: string;
  status: string;
  cancelledAt: string;
  refundAmount: number;
  refundStatus: string;
  refundMessage: string;
};

export type PurchaseCustomerComboRequest = {
  comboId: string;
  paymentMethod: PaymentMethod;
};

export type PurchaseCustomerComboResponse = {
  customerComboId: string;
  comboId: string;
  comboName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: string;
  totalUsages: number;
  remainingUsages: number;
  activatedAt: string;
  expiresAt: string;
  purchasedAt: string;
};

export type WashTrackingSession = {
  washSessionId: string;
  bookingId: string;
  status: "PENDING" | "QUEUED" | "CHECKED_IN" | "IN_PROGRESS" | "COMPLETED";
  customerName: string;
  customerPhone: string;
  vehiclePlate: string;
  vehicleBrand: string;
  vehicleModel: string;
  packageId: string | null;
  serviceName: string | null;
  bookingDate: string;
  bookingTime: string;
  assignedStaffName: string | null;
  feeAmount: number | null;
  feeCurrency: string | null;
  projectedLoyaltyPoints: number | null;
  awardedLoyaltyPoints: number | null;
  notes: string | null;
  createdAt: string;
  queuedAt: string | null;
  checkedInAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
};

export type BookingDraft = {
  mode: BookingMode;
  vehicleId: string;
  packageId: string;
  comboId: string;
  addonIds: string[];
  bookingDate: string;
  bookingTime: string;
  voucherCode: string;
  paymentMethod: PaymentMethod | null;
};

export type BookingDraftErrors = Partial<Record<keyof BookingDraft, string>>;

export type BookingSummary = {
  itemType: BookingMode;
  itemId: string;
  itemName: string;
  baseAmount: number;
  addonsTotal: number;
  subtotal: number;
  discountAmount: number;
  finalAmount: number;
  estimatedDurationLabel: string;
  selectedAddons: BookingAddon[];
  selectedVoucherCode: string | null;
  paymentMethod: PaymentMethod | null;
};

