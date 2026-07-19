"use client";

import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { BookingDraft, CreateBookingResponse, DiscountValidationResult } from "@/entities/bookings";

type BookingState = {
  draft: BookingDraft;
  expiresAt: number | null;
  validatedDiscount: DiscountValidationResult | null;
  lastCreatedBooking: CreateBookingResponse | null;
};

type BookingActions = {
  updateDraft: (patch: Partial<BookingDraft>) => void;
  setExpiresAt: (ts: number | null) => void;
  setValidatedDiscount: (voucher: DiscountValidationResult | null) => void;
  resetDraft: () => void;
  setLastCreatedBooking: (booking: CreateBookingResponse | null) => void;
};

type BookingStore = BookingState & BookingActions;

export const EMPTY_BOOKING_DRAFT: BookingDraft = {
  mode: "PACKAGE",
  vehicleId: "",
  packageId: "",
  comboId: "",
  addonIds: [],
  bookingDate: "",
  bookingTime: "",
  discountCode: "",
  confirmationEmail: "",
  paymentMethod: null,
};

const bookingStore = createStore<BookingStore>()(
  persist(
    (set) => ({
      draft: EMPTY_BOOKING_DRAFT,
      expiresAt: null,
      validatedDiscount: null,
      lastCreatedBooking: null,
      updateDraft: (patch) =>
        set((state) => ({
          draft: {
            ...state.draft,
            ...patch,
          },
        })),
      setExpiresAt: (ts) =>
        set(() => ({
          expiresAt: ts,
        })),
      setValidatedDiscount: (voucher) =>
        set(() => ({
          validatedDiscount: voucher,
        })),
      resetDraft: () =>
        set(() => ({
          draft: EMPTY_BOOKING_DRAFT,
          expiresAt: null,
          validatedDiscount: null,
        })),
      setLastCreatedBooking: (booking) =>
        set(() => ({
          lastCreatedBooking: booking,
        })),
    }),
    {
      name: "autowash-booking-draft",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        draft: state.draft,
        expiresAt: state.expiresAt,
        validatedDiscount: state.validatedDiscount,
        lastCreatedBooking: state.lastCreatedBooking,
      }),
    },
  ),
);

export function useBookingStore<T>(selector: (state: BookingStore) => T) {
  return useStore(bookingStore, selector);
}

export function updateBookingDraft(patch: Partial<BookingDraft>) {
  bookingStore.getState().updateDraft(patch);
}

export function resetBookingDraft() {
  bookingStore.getState().resetDraft();
}

export function setBookingExpiresAt(ts: number | null) {
  bookingStore.getState().setExpiresAt(ts);
}

export function setBookingValidatedVoucher(voucher: DiscountValidationResult | null) {
  bookingStore.getState().setValidatedDiscount(voucher);
}

export function setLastCreatedBooking(booking: CreateBookingResponse | null) {
  bookingStore.getState().setLastCreatedBooking(booking);
}
