"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  applyBookingPoints,
  cancelCustomerBooking,
  createCustomerBooking,
  getActiveWashTracking,
  getCustomerBookingDetail,
  getWashTrackingDetail,
  listBookingAddons,
  listBookingCombos,
  listBookingPackages,
  listActiveCustomerCombos,
  listCustomerBookings,
  purchaseCustomerCombo,
  validateBookingVoucher,
} from "@/features/bookings/lib/booking-service";
import {
  bookingDetailQueryKey,
  bookingQueryScope,
  bookingsListQueryKey,
  washTrackingActiveQueryKey,
  washTrackingDetailQueryKey,
} from "@/features/bookings/hooks/booking-query";
import { useAuthStore } from "@/features/auth/store/auth.store";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type {
  BookingDetail,
  BookingDraft,
  BookingListFilters,
  BookingListPage,
  BookingPackage,
  ApplyBookingPointsRequest,
  ApplyBookingPointsResponse,
  CreateBookingResponse,
  CancelBookingResponse,
  PurchaseCustomerComboRequest,
  PurchaseCustomerComboResponse,
  WashTrackingSession,
  VoucherValidationRequest,
  VoucherValidationResult,
  BookingAddon,
  BookingCombo,
  CustomerCombo,
} from "@/entities/bookings";

function useBookingQueryContext() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const userId = user?.userId ?? null;
  const enabled = Boolean(accessToken && userId && user?.role === "CUSTOMER");

  return { enabled, userId };
}

async function invalidateBookingViews(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string | null,
  bookingId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: bookingDetailQueryKey(userId, bookingId) }),
    queryClient.invalidateQueries({ queryKey: bookingQueryScope(userId) }),
    queryClient.invalidateQueries({ queryKey: washTrackingActiveQueryKey(userId) }),
  ]);
}

export function useBookingPackages() {
  const { enabled } = useBookingQueryContext();

  return useQuery<BookingPackage[], ApiErrorResponse>({
    queryKey: ["booking-catalog", "packages"],
    queryFn: () => listBookingPackages(),
    enabled,
  });
}

export function useBookingAddons() {
  const { enabled } = useBookingQueryContext();

  return useQuery<BookingAddon[], ApiErrorResponse>({
    queryKey: ["booking-catalog", "addons"],
    queryFn: listBookingAddons,
    enabled,
  });
}

export function useBookingCombos() {
  const { enabled } = useBookingQueryContext();

  return useQuery<BookingCombo[], ApiErrorResponse>({
    queryKey: ["booking-catalog", "combos"],
    queryFn: listBookingCombos,
    enabled,
  });
}

export function useActiveCustomerCombos() {
  const { enabled } = useBookingQueryContext();

  return useQuery<CustomerCombo[], ApiErrorResponse>({
    queryKey: ["booking-catalog", "customer-combos", "active"],
    queryFn: listActiveCustomerCombos,
    enabled,
  });
}

export function usePurchaseCustomerCombo() {
  const queryClient = useQueryClient();
  const { userId } = useBookingQueryContext();

  return useMutation<PurchaseCustomerComboResponse, ApiErrorResponse, PurchaseCustomerComboRequest>({
    mutationFn: purchaseCustomerCombo,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["booking-catalog", "customer-combos", "active"] });
      await queryClient.invalidateQueries({ queryKey: bookingQueryScope(userId) });
    },
  });
}

export function useValidateBookingVoucher() {
  return useMutation<VoucherValidationResult, ApiErrorResponse, VoucherValidationRequest>({
    mutationFn: validateBookingVoucher,
  });
}

export function useCreateCustomerBooking() {
  const queryClient = useQueryClient();
  const { userId } = useBookingQueryContext();

  return useMutation<CreateBookingResponse, ApiErrorResponse, BookingDraft>({
    mutationFn: createCustomerBooking,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: bookingQueryScope(userId) });
    },
  });
}

export function useCustomerBookings(filters: BookingListFilters = {}) {
  const { enabled, userId } = useBookingQueryContext();

  return useQuery<BookingListPage, ApiErrorResponse>({
    queryKey: bookingsListQueryKey(userId, filters),
    queryFn: () => listCustomerBookings(filters),
    enabled,
  });
}

export function useCustomerBookingDetail(bookingId: string) {
  const { enabled, userId } = useBookingQueryContext();

  return useQuery<BookingDetail, ApiErrorResponse>({
    queryKey: bookingDetailQueryKey(userId, bookingId),
    queryFn: () => getCustomerBookingDetail(bookingId),
    enabled: enabled && bookingId.length > 0,
  });
}

export function useApplyBookingPoints(bookingId: string) {
  const queryClient = useQueryClient();
  const { userId } = useBookingQueryContext();

  return useMutation<ApplyBookingPointsResponse, ApiErrorResponse, ApplyBookingPointsRequest>({
    mutationFn: (payload) => applyBookingPoints(bookingId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: bookingDetailQueryKey(userId, bookingId) }),
        queryClient.invalidateQueries({ queryKey: bookingQueryScope(userId) }),
      ]);
    },
  });
}

export function useCancelCustomerBooking(bookingId: string) {
  const queryClient = useQueryClient();
  const { userId } = useBookingQueryContext();

  return useMutation<CancelBookingResponse, ApiErrorResponse, string | undefined>({
    mutationFn: (reason) => cancelCustomerBooking(bookingId, reason),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: bookingDetailQueryKey(userId, bookingId) }),
        queryClient.invalidateQueries({ queryKey: bookingQueryScope(userId) }),
      ]);
    },
  });
}

export function useActiveWashTracking() {
  const { enabled, userId } = useBookingQueryContext();

  return useQuery<WashTrackingSession | null, ApiErrorResponse>({
    queryKey: washTrackingActiveQueryKey(userId),
    queryFn: getActiveWashTracking,
    enabled,
    refetchInterval: (query) => (query.state.data?.status === "COMPLETED" ? false : 5_000),
    refetchIntervalInBackground: true,
  });
}

export function useWashTrackingDetail(washSessionId: string) {
  const { enabled, userId } = useBookingQueryContext();

  return useQuery<WashTrackingSession, ApiErrorResponse>({
    queryKey: washTrackingDetailQueryKey(userId, washSessionId),
    queryFn: () => getWashTrackingDetail(washSessionId),
    enabled: enabled && washSessionId.length > 0,
  });
}
