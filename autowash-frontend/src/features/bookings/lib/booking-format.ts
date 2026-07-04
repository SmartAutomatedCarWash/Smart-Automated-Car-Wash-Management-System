import type {
  BookingAddon,
  BookingCombo,
  BookingDraft,
  BookingDraftErrors,
  BookingMode,
  BookingPackage,
  BookingStatus,
  BookingSummary,
  CreateBookingRequest,
  PaymentMethod,
  VoucherValidationResult,
} from "../../../entities/bookings/index.ts";
import { getVoucherCodeFormatError, sanitizeVoucherCodeInput } from "../../../shared/lib/validators.ts";

export const BOOKING_TIME_SLOTS = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"] as const;

export function buildCreateBookingPayload(draft: BookingDraft): CreateBookingRequest {
  const payload: CreateBookingRequest = {
    vehicleId: draft.vehicleId,
    options: draft.addonIds,
    bookingDate: draft.bookingDate,
    bookingTime: draft.bookingTime,
    paymentMethod: draft.paymentMethod ?? "CASH_AT_COUNTER",
  };

  if (draft.mode === "PACKAGE") {
    payload.packageId = draft.packageId;
  } else {
    payload.comboId = draft.comboId;
  }

  const voucherCode = normalizeOptionalText(sanitizeVoucherCodeInput(draft.voucherCode));
  if (voucherCode) {
    payload.voucherCode = voucherCode;
  }

  return payload;
}

export function buildBookingSummary(
  draft: BookingDraft,
  input: {
    packages: BookingPackage[];
    addons: BookingAddon[];
    combos: BookingCombo[];
    voucher: VoucherValidationResult | null;
    ownedComboApplied?: boolean;
  },
): BookingSummary | null {
  const selectedAddons = input.addons.filter((addon) => draft.addonIds.includes(addon.addonId));
  const addonsTotal = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);

  if (draft.mode === "PACKAGE") {
    const selectedPackage = input.packages.find((item) => item.packageId === draft.packageId);
    if (!selectedPackage) {
      return null;
    }

    const subtotal = selectedPackage.basePrice + addonsTotal;
    const discountAmount = input.voucher?.discountAmount ?? 0;
    const finalAmount = input.voucher?.finalAmount ?? Math.max(subtotal - discountAmount, 0);

    return {
      itemType: "PACKAGE",
      itemId: selectedPackage.packageId,
      itemName: selectedPackage.name,
      baseAmount: selectedPackage.basePrice,
      addonsTotal,
      subtotal,
      discountAmount,
      finalAmount,
      estimatedDurationLabel: `${selectedPackage.duration + selectedAddons.reduce((sum, addon) => sum + addon.duration, 0)} min`,
      selectedAddons,
      selectedVoucherCode: input.voucher?.voucherCode ?? null,
      paymentMethod: draft.paymentMethod,
    };
  }

  const selectedCombo = input.combos.find((item) => item.comboId === draft.comboId);
  if (!selectedCombo) {
    return null;
  }

  const subtotal = input.ownedComboApplied ? 0 : selectedCombo.basePrice;
  const discountAmount = input.voucher?.discountAmount ?? 0;
  const finalAmount = input.voucher?.finalAmount ?? Math.max(subtotal - discountAmount, 0);

  return {
    itemType: "COMBO",
    itemId: selectedCombo.comboId,
    itemName: selectedCombo.name,
    baseAmount: selectedCombo.basePrice,
    addonsTotal: 0,
    subtotal,
    discountAmount,
    finalAmount,
    estimatedDurationLabel: `${selectedCombo.durationDays} day combo`,
    selectedAddons: [],
    selectedVoucherCode: input.voucher?.voucherCode ?? null,
    paymentMethod: draft.paymentMethod,
  };
}

export function validateBookingDraft(
  draft: BookingDraft,
  summary: BookingSummary | null,
): BookingDraftErrors {
  const errors: BookingDraftErrors = {};

  if (!draft.vehicleId) {
    errors.vehicleId = "Please select a vehicle.";
  }
  if (draft.mode === "PACKAGE" && !draft.packageId) {
    errors.packageId = "Please select a wash package.";
  }
  if (draft.mode === "COMBO" && !draft.comboId) {
    errors.comboId = "Please select a combo package.";
  }
  if (!draft.bookingDate) {
    errors.bookingDate = "Please choose a booking date.";
  }
  if (!draft.bookingTime) {
    errors.bookingTime = "Please choose a booking time.";
  }
  if (!draft.paymentMethod) {
    errors.paymentMethod = "Please select a payment method.";
  }
  if (draft.voucherCode.trim().length > 0) {
    const formatError = getVoucherCodeFormatError(draft.voucherCode);
    if (formatError) {
      errors.voucherCode = formatError;
    } else if (!summary?.selectedVoucherCode) {
      errors.voucherCode = "Please validate the voucher before checkout.";
    }
  }

  return errors;
}

export function getBookingStatusLabel(status: BookingStatus) {
  switch (status) {
    case "CHECKED_IN":
      return "Checked in";
    case "IN_PROGRESS":
      return "In progress";
    case "NO_SHOW":
      return "No show";
    default:
      return humanizeCode(status);
  }
}

export function getPaymentMethodLabel(method: PaymentMethod | string) {
  switch (method) {
    case "BANK_TRANSFER":
      return "Bank transfer";
    case "E_WALLET":
      return "E-wallet";
    case "CASH_AT_COUNTER":
      return "Cash at counter";
    default:
      return humanizeCode(method);
  }
}

export function getModeLabel(mode: BookingMode) {
  return mode === "PACKAGE" ? "Single package" : "Combo";
}

export function getPaymentStatusLabel(status: string | null | undefined) {
  return status ? humanizeCode(status) : "Pending";
}

export function formatBookingCurrency(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatLocalDateInput(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getAvailableBookingTimeSlots(
  bookingDate: string,
  slots: readonly string[] = BOOKING_TIME_SLOTS,
) {
  const today = formatLocalDateInput(0);
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return slots.map((time) => {
    const [hours, minutes] = time.split(":").map(Number);
    const slotMinutes = hours * 60 + minutes;

    return {
      time,
      disabled: bookingDate === today && slotMinutes < currentMinutes,
    };
  });
}

export function humanizeCode(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeOptionalText(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}
