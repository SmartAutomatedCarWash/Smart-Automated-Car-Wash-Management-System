import assert from "node:assert/strict";
import test from "node:test";
import {
  BOOKING_TIME_SLOTS,
  buildBookingSummary,
  buildCreateBookingPayload,
  getBookingStatusLabel,
  getPaymentMethodLabel,
  validateBookingDraft,
} from "./booking-format.ts";
import type {
  BookingAddon,
  BookingCombo,
  BookingDraft,
  BookingPackage,
  DiscountValidationResult,
} from "@/entities/bookings";

const PACKAGES: BookingPackage[] = [
  {
    packageId: "pkg_001",
    name: "Basic Wash",
    description: "Quick exterior clean",
    basePrice: 150000,
    duration: 45,
    category: "BASIC",
    features: ["Exterior wash"],
    image: null,
    status: "ACTIVE",
    popularity: "HIGH",
  },
];

const ADDONS: BookingAddon[] = [
  {
    addonId: "addon_001",
    name: "Interior Vacuum",
    description: "Cabin clean",
    price: 120000,
    duration: 20,
    category: "INTERIOR",
    image: null,
    applicableToPackages: ["pkg_001"],
    status: "ACTIVE",
  },
];

const COMBOS: BookingCombo[] = [
  {
    comboId: "combo_001",
    name: "Monthly Unlimited",
    description: "Unlimited washes in one month",
    basePrice: 500000,
    durationDays: 30,
    maxServices: 4,
    benefits: ["Priority scheduling"],
    image: null,
    isActive: true,
    canUpgrade: false,
    upgradePriceFrom: 0,
  },
];

const VOUCHER: DiscountValidationResult = {
  discountCode: "WELCOME20",
  isValid: true,
  discountType: "PERCENTAGE",
  discountValue: 20,
  discountAmount: 30000,
  finalAmount: 240000,
  expiresAt: "2026-12-31T00:00:00Z",
};

test("exposes the supported booking time slots", () => {
  assert.deepEqual(BOOKING_TIME_SLOTS, [
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
  ]);
});

test("builds a package booking payload with trimmed note and voucher code", () => {
  const draft: BookingDraft = {
    mode: "PACKAGE",
    vehicleId: "vehicle_001",
    packageId: "pkg_001",
    comboId: "",
    addonIds: ["addon_001"],
    bookingDate: "2026-06-10",
    bookingTime: "14:00",
    discountCode: " welcome20 ",
    paymentMethod: "E_WALLET",
  };

  assert.deepEqual(buildCreateBookingPayload(draft), {
    vehicleId: "vehicle_001",
    packageId: "pkg_001",
    options: ["addon_001"],
    bookingDate: "2026-06-10",
    bookingTime: "14:00",
    discountCode: "WELCOME20",
    paymentMethod: "E_WALLET",
  });
});

test("builds a combo booking payload without package id", () => {
  const draft: BookingDraft = {
    mode: "COMBO",
    vehicleId: "vehicle_001",
    packageId: "",
    comboId: "combo_001",
    addonIds: [],
    bookingDate: "2026-06-10",
    bookingTime: "10:00",
    discountCode: "",
    paymentMethod: "CASH_AT_COUNTER",
  };

  assert.deepEqual(buildCreateBookingPayload(draft), {
    vehicleId: "vehicle_001",
    comboId: "combo_001",
    options: [],
    bookingDate: "2026-06-10",
    bookingTime: "10:00",
    paymentMethod: "CASH_AT_COUNTER",
  });
});

test("builds a checkout summary with package, add-on, and voucher totals", () => {
  const summary = buildBookingSummary(
    {
      mode: "PACKAGE",
      vehicleId: "vehicle_001",
      packageId: "pkg_001",
      comboId: "",
      addonIds: ["addon_001"],
      bookingDate: "2026-06-10",
      bookingTime: "14:00",
      discountCode: "WELCOME20",
      paymentMethod: "E_WALLET",
    },
    {
      packages: PACKAGES,
      addons: ADDONS,
      combos: COMBOS,
      voucher: VOUCHER,
    },
  );

  assert.equal(summary?.itemType, "PACKAGE");
  assert.equal(summary?.itemName, "Basic Wash");
  assert.equal(summary?.baseAmount, 150000);
  assert.equal(summary?.addonsTotal, 120000);
  assert.equal(summary?.subtotal, 270000);
  assert.equal(summary?.discountAmount, 30000);
  assert.equal(summary?.finalAmount, 240000);
});

test("validates the required customer booking selections", () => {
  assert.deepEqual(
    validateBookingDraft(
      {
        mode: "PACKAGE",
        vehicleId: "",
        packageId: "",
        comboId: "",
        addonIds: [],
        bookingDate: "",
        bookingTime: "",
        discountCode: "",
        paymentMethod: null,
      },
      null,
    ),
    {
      vehicleId: "Please select a vehicle.",
      packageId: "Please select a wash package.",
      bookingDate: "Please choose a booking date.",
      bookingTime: "Please choose a booking time.",
      paymentMethod: "Please select a payment method.",
    },
  );
});

test("rejects voucher codes that are not uppercase or contain spaces", () => {
  assert.equal(
    validateBookingDraft(
      {
        mode: "PACKAGE",
        vehicleId: "vehicle_001",
        packageId: "pkg_001",
        comboId: "",
        addonIds: [],
        bookingDate: "2026-06-10",
        bookingTime: "14:00",
        discountCode: "welcome 20",
        paymentMethod: "E_WALLET",
      },
      null,
    ).discountCode,
    "Mã giảm giá phải viết hoa và không chứa khoảng trắng.",
  );
});

test("labels backend statuses and payment methods for customer pages", () => {
  assert.equal(getBookingStatusLabel("CHECKED_IN"), "Checked in");
  assert.equal(getPaymentMethodLabel("CASH_AT_COUNTER"), "Cash at counter");
});
