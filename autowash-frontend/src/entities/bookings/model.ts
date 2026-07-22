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
  serviceIds?: string[] | null;
  image: string | null;
  imageUrls?: string[] | null;
  status: string;
  popularity: string | null;
  averageRating?: number;
  reviewCount?: number;
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
  services?: {
    serviceId: string;
    name: string;
    description?: string | null;
    price: number;
    duration?: number;
    durationMinutes?: number;
    quantity: number;
    sortOrder: number;
  }[];
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

export type DiscountValidationRequest = {
  discountCode: string;
  packageId?: string;
  amount: number;
};

export type DiscountValidationResult = {
  discountCode: string;
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
  discountCode?: string;
  confirmationEmail?: string;
  paymentMethod: PaymentMethod;
  staffId?: string;
  staffIds?: string[];
};

export type BookingStaffOptionsRequest = {
  packageId?: string;
  comboId?: string;
  options: string[];
  bookingDate: string;
  bookingTime: string;
};

export type UpdateBookingStaffRequest = {
  staffIds: string[];
};

export type BookingStaffOption = {
  staffId: string;
  staffName: string;
  serviceName: string;
  recommended: boolean;
  reason: string;
  available?: boolean;
  availabilityStatus?: "AVAILABLE" | "BUSY" | string;
  busyUntil?: string | null;
};

export type HoldSlotRequest = {
  bookingDate: string;
  bookingTime: string;
};

export type HoldSlotResponse = {
  slotTime: string;
  expiresAt: string;
};

export type SlotAvailability = {
  bookingDate: string;
  bookingTime: string;
  slotTime: string;
  capacity: number;
  bookedCount: number;
  heldCount: number;
  remaining: number;
  available: boolean;
};

export type ExtraServiceRecommendation = {
  serviceId: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  reason: string;
  source: "RULE" | string;
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
  primaryItemName: string;
  pricing: {
    subtotal: number;
    discountCode: string | null;
    discountAmount: number;
    finalAmount: number;
    currency: string;
  };
  bookingDate: string;
  bookingTime: string;
  estimatedDuration: number;
  paymentMethod: PaymentMethod;
  paymentStatus: string;
  status: BookingStatus;
  confirmationStatus: BookingConfirmationStatus;
  createdAt: string;
  confirmationNumber: string;
  confirmationEmail: string | null;
  comboPurchased: boolean;
  assignedStaffId: string | null;
  assignedStaffName: string | null;
};

export type VnpayCheckoutResponse = {
  bookingId: string;
  txnRef: string;
  amount: number;
  paymentUrl: string;
};

export type VnpayPaymentResultResponse = {
  validSignature: boolean;
  success: boolean;
  bookingId: string | null;
  responseCode: string | null;
  transactionStatus: string | null;
  transactionRef: string | null;
  message: string;
};

export type PayBookingResponse = {
  bookingId: string;
  paymentId: string;
  paymentMethod: PaymentMethod;
  paymentStatus: string;
  amount: number;
  transactionRef: string | null;
  paidAt: string | null;
  bookingStatus: BookingStatus;
  assignedStaffId: string | null;
  assignedStaffName: string | null;
  assignedStaff?: BookingStaffAssignment[];
};

export type BookingStaffAssignment = {
  staffId: string;
  staffName: string;
  sortOrder: number;
};

export type BookingListItem = {
  bookingId: string;
  vehiclePlate: string;
  primaryItemName: string | null;
  bookingDate: string;
  bookingTime: string;
  finalAmount: number;
  status: BookingStatus;
  washStatus: string | null;
  createdAt: string;
  confirmationExpiresAt: string | null;
  completedAt: string | null;
};

export type BookingDetailDto = {
  id: string;
  itemType: string;
  refId: string;
  snapshotName: string;
  snapshotPrice: number;
  quantity: number;
  subtotal: number;
  durationMinutes: number;
};

export type BookingStatusHistoryItem = {
  oldStatus: string | null;
  newStatus: string;
  changedByName: string | null;
  reason: string | null;
  changedAt: string;
};

export type BookingDetail = {
  bookingId: string;
  confirmationNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  confirmationEmail: string | null;
  vehicleId: string;
  vehiclePlate: string;
  vehicleBrand: string;
  vehicleModel: string;
  primaryItemName: string | null;
  details: BookingDetailDto[];
  pricing: {
    subtotal: number;
    discountCode: string | null;
    discountAmount: number;
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
    transactionId: string | null;
    paidAt: string | null;
    qrUrl?: string | null;
    bankCode?: string | null;
    accountNumber?: string | null;
    accountName?: string | null;
    transferDescription?: string | null;
  };
  status: BookingStatus;
  confirmationStatus: BookingConfirmationStatus;
  confirmationExpiresAt: string | null;
  washSessionId: string | null;
  staffName: string | null;
  assignedStaff?: BookingStaffAssignment[];
  washStatus: string | null;
  notes: string | null;
  createdAt: string;
  devOtp?: string;
  statusHistory?: BookingStatusHistoryItem[];
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
  discountCode: string;
  confirmationEmail?: string;
  paymentMethod: PaymentMethod | null;
  staffId?: string;
  staffIds?: string[];
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
  selectedDiscountCode: string | null;
  paymentMethod: PaymentMethod | null;
};

