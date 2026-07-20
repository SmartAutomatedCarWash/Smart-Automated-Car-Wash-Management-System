"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  applyBookingPoints,
  cancelCustomerBooking,
  createCustomerBooking,
  getActiveWashTracking,
  getCustomerBookingDetail,
  getWashTrackingDetail,
  listExtraServiceRecommendations,
  listBookingStaffOptions,
  listBookingAddons,
  listBookingCombos,
  listBookingPackages,
  listActiveCustomerCombos,
  listCustomerBookings,
  listSlotAvailability,
  purchaseCustomerCombo,
  validateBookingDiscount,
} from "@/features/bookings/lib/booking-service";
import {
  bookingDetailQueryKey,
  bookingStaffOptionsQueryKey,
  bookingQueryScope,
  bookingsListQueryKey,
  extraServiceRecommendationsQueryKey,
  slotAvailabilityQueryKey,
  washTrackingActiveQueryKey,
  washTrackingDetailQueryKey,
} from "@/features/bookings/hooks/booking-query";
import { customerLoyaltyScope } from "@/features/loyalty/hooks/customer-loyalty-query";
import { useAuthStore } from "@/features/auth/store/auth.store";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type {
  BookingDetail,
  BookingDraft,
  BookingListFilters,
  BookingListItem,
  BookingListPage,
  BookingPackage,
  ApplyBookingPointsRequest,
  ApplyBookingPointsResponse,
  CreateBookingResponse,
  CancelBookingResponse,
  PurchaseCustomerComboRequest,
  PurchaseCustomerComboResponse,
  WashTrackingSession,
  DiscountValidationRequest,
  DiscountValidationResult,
  BookingAddon,
  BookingCombo,
  BookingStaffOption,
  BookingStaffOptionsRequest,
  CustomerCombo,
  ExtraServiceRecommendation,
  SlotAvailability,
} from "@/entities/bookings";

const LIVE_BOOKING_REFETCH_MS = 3_000;
const TERMINAL_BOOKING_STATUSES = new Set(["COMPLETED", "CANCELLED", "NO_SHOW"]);

function isLiveBookingStatus(status: string | null | undefined) {
  return Boolean(status) && !TERMINAL_BOOKING_STATUSES.has(String(status).toUpperCase());
}

function shouldPollBookingDetail(booking: BookingDetail | undefined) {
  if (!booking) {
    return LIVE_BOOKING_REFETCH_MS;
  }

  return isLiveBookingStatus(booking.washStatus ?? booking.status) ? LIVE_BOOKING_REFETCH_MS : false;
}

function shouldPollBookingList(page: BookingListPage | undefined) {
  if (!page) {
    return LIVE_BOOKING_REFETCH_MS;
  }

  return page.items.some((booking) => isLiveBookingStatus(booking.washStatus ?? booking.status))
    ? LIVE_BOOKING_REFETCH_MS
    : false;
}

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
    queryClient.invalidateQueries({ queryKey: customerLoyaltyScope(userId) }),
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: bookingQueryScope(userId) }),
        queryClient.invalidateQueries({ queryKey: customerLoyaltyScope(userId) }),
      ]);
    },
  });
}

export function useValidateBookingDiscount() {
  return useMutation<DiscountValidationResult, ApiErrorResponse, DiscountValidationRequest>({
    mutationFn: validateBookingDiscount,
  });
}

export function useSlotAvailability(bookingDate: string | undefined, times: string[]) {
  const { enabled, userId } = useBookingQueryContext();

  return useQuery<SlotAvailability[], ApiErrorResponse>({
    queryKey: slotAvailabilityQueryKey(userId, bookingDate, times),
    queryFn: () => listSlotAvailability(bookingDate ?? "", times),
    enabled: enabled && Boolean(bookingDate) && times.length > 0,
    placeholderData: keepPreviousData,
    refetchInterval: 5_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
}

export function useExtraServiceRecommendations(comboId: string) {
  const { enabled, userId } = useBookingQueryContext();

  return useQuery<ExtraServiceRecommendation[], ApiErrorResponse>({
    queryKey: extraServiceRecommendationsQueryKey(userId, comboId),
    queryFn: () => listExtraServiceRecommendations(comboId),
    enabled: enabled && comboId.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });
}

export function useBookingStaffOptions(payload: BookingStaffOptionsRequest | null) {
  const { enabled, userId } = useBookingQueryContext();
  const payloadKey = payload
    ? [
        payload.packageId ?? "",
        payload.comboId ?? "",
        payload.bookingDate,
        payload.bookingTime,
        payload.options.join(","),
      ].join("|")
    : "";

  return useQuery<BookingStaffOption[], ApiErrorResponse>({
    queryKey: bookingStaffOptionsQueryKey(userId, payloadKey),
    queryFn: () => listBookingStaffOptions(payload!),
    enabled: enabled && Boolean(payload),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useCreateCustomerBooking() {
  const queryClient = useQueryClient();
  const { userId } = useBookingQueryContext();

  return useMutation<CreateBookingResponse, ApiErrorResponse, BookingDraft>({
    mutationFn: createCustomerBooking,
    onSuccess: async (createdBooking) => {
      const newListItem: BookingListItem = {
        bookingId: createdBooking.bookingId,
        vehiclePlate: createdBooking.vehiclePlate,
        primaryItemName: createdBooking.primaryItemName,
        bookingDate: createdBooking.bookingDate,
        bookingTime: createdBooking.bookingTime,
        finalAmount: createdBooking.pricing.finalAmount,
        status: createdBooking.status,
        washStatus: null,
        createdAt: createdBooking.createdAt,
        completedAt: null,
      };

      queryClient.setQueriesData<BookingListPage>(
        { queryKey: bookingQueryScope(userId) },
        (current) => {
          if (!current || !Array.isArray(current.items)) {
            return current;
          }

          const existingItems = current.items.filter((item) => item.bookingId !== newListItem.bookingId);
          return {
            ...current,
            items: [newListItem, ...existingItems],
            pagination: current.pagination
              ? {
                  ...current.pagination,
                  total: typeof current.pagination.total === "number"
                    ? current.pagination.total + (existingItems.length === current.items.length ? 1 : 0)
                    : current.pagination.total,
                }
              : current.pagination,
          };
        },
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: bookingDetailQueryKey(userId, createdBooking.bookingId) }),
        queryClient.invalidateQueries({ queryKey: washTrackingActiveQueryKey(userId) }),
        queryClient.invalidateQueries({ queryKey: customerLoyaltyScope(userId) }),
        queryClient.refetchQueries({ queryKey: bookingQueryScope(userId), type: "active" }),
        queryClient.invalidateQueries({ queryKey: bookingQueryScope(userId), type: "inactive" }),
      ]);
    },
  });
}

export function useCustomerBookings(filters: BookingListFilters = {}) {
  const { enabled, userId } = useBookingQueryContext();

  return useQuery<BookingListPage, ApiErrorResponse>({
    queryKey: bookingsListQueryKey(userId, filters),
    queryFn: () => listCustomerBookings(filters),
    enabled,
    refetchInterval: (query) => shouldPollBookingList(query.state.data),
    refetchIntervalInBackground: true,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}

export function useCustomerBookingDetail(bookingId: string) {
  const { enabled, userId } = useBookingQueryContext();

  return useQuery<BookingDetail, ApiErrorResponse>({
    queryKey: bookingDetailQueryKey(userId, bookingId),
    queryFn: () => getCustomerBookingDetail(bookingId),
    enabled: enabled && bookingId.length > 0,
    refetchInterval: (query) => shouldPollBookingDetail(query.state.data),
    refetchIntervalInBackground: true,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
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
    refetchInterval: (query) => (query.state.data?.status === "COMPLETED" ? false : LIVE_BOOKING_REFETCH_MS),
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
}
