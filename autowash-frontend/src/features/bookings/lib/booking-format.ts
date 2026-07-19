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
  DiscountValidationResult,
} from "../../../entities/bookings/index.ts";
import { getVoucherCodeFormatError, sanitizeVoucherCodeInput } from "../../../shared/lib/validators.ts";

/** @deprecated Use generateTimeSlotsFromRange() with operating hours from API instead */
export const BOOKING_TIME_SLOTS = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"] as const;

/**
 * Generate hourly time slots between openTime and closeTime (exclusive).
 * e.g. openTime="08:00", closeTime="20:00" → ["08:00","09:00",...,"19:00"]
 */
export function generateTimeSlotsFromRange(openTime: string, closeTime: string): string[] {
  const [openH, openM] = openTime.split(":").map(Number);
  const [closeH, closeM] = closeTime.split(":").map(Number);
  const openMinutes = openH * 60 + (openM ?? 0);
  const closeMinutes = closeH * 60 + (closeM ?? 0);
  const slots: string[] = [];
  for (let m = openMinutes; m < closeMinutes; m += 60) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  }
  return slots;
}

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

  const discountCode = normalizeOptionalText(sanitizeVoucherCodeInput(draft.discountCode));
  if (discountCode) {
    payload.discountCode = discountCode;
  }

  const confirmationEmail = normalizeOptionalText(draft.confirmationEmail ?? "");
  if (confirmationEmail) {
    payload.confirmationEmail = confirmationEmail.toLowerCase();
  }

  return payload;
}

export function buildBookingSummary(
  draft: BookingDraft,
  input: {
    packages: BookingPackage[];
    addons: BookingAddon[];
    combos: BookingCombo[];
    voucher: DiscountValidationResult | null;
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
    const totalDiscountAmount = Math.min(input.voucher?.discountAmount ?? 0, subtotal);
    
    const finalAmount = Math.max(subtotal - totalDiscountAmount, 0);

    return {
      itemType: "PACKAGE",
      itemId: selectedPackage.packageId,
      itemName: selectedPackage.name,
      baseAmount: selectedPackage.basePrice,
      addonsTotal,
      subtotal,
      discountAmount: totalDiscountAmount,
      finalAmount,
      estimatedDurationLabel: `${selectedPackage.duration + selectedAddons.reduce((sum, addon) => sum + addon.duration, 0)} min`,
      selectedAddons,
      selectedDiscountCode: input.voucher?.discountCode ?? null,
      paymentMethod: draft.paymentMethod,
    };
  }

  const selectedCombo = input.combos.find((item) => item.comboId === draft.comboId);
  if (!selectedCombo) {
    return null;
  }

  const subtotal = input.ownedComboApplied ? 0 : selectedCombo.basePrice;
  const totalDiscountAmount = Math.min(input.voucher?.discountAmount ?? 0, subtotal);
  
  const finalAmount = Math.max(subtotal - totalDiscountAmount, 0);

  return {
    itemType: "COMBO",
    itemId: selectedCombo.comboId,
    itemName: selectedCombo.name,
    baseAmount: selectedCombo.basePrice,
    addonsTotal: 0,
    subtotal,
    discountAmount: totalDiscountAmount,
    finalAmount,
    estimatedDurationLabel: `${selectedCombo.durationDays} day combo`,
    selectedAddons: [],
    selectedDiscountCode: input.voucher?.discountCode ?? null,
    paymentMethod: draft.paymentMethod,
  };
}

export function validateBookingDraft(
  draft: BookingDraft,
  summary: BookingSummary | null,
  options: { requirePaymentMethod?: boolean } = {},
): BookingDraftErrors {
  const errors: BookingDraftErrors = {};
  const requirePaymentMethod = options.requirePaymentMethod ?? true;

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
  if (draft.confirmationEmail?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.confirmationEmail.trim())) {
    errors.confirmationEmail = "Please enter a valid confirmation email.";
  }
  if (requirePaymentMethod && !draft.paymentMethod) {
    errors.paymentMethod = "Please select a payment method.";
  }
  if (draft.discountCode.trim().length > 0) {
    const formatError = getVoucherCodeFormatError(draft.discountCode);
    if (formatError) {
      errors.discountCode = formatError;
    } else if (!summary?.selectedDiscountCode) {
      errors.discountCode = "Please validate the voucher before checkout.";
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
