import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  confirmAdminBooking,
  getAdminBookingDetail,
  queryAdminVnpayTransaction,
  refundAdminVnpayPayment,
  updateAdminBookingStatus,
} from "@/features/reports/api/admin-reporting-service";
import { useAuthStore } from "@/features/auth/store/auth.store";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type { BookingDetail, BookingStatus, VnpayPaymentResultResponse } from "@/entities/bookings";

export function useAdminBookingDetail(id: string) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const enabled = Boolean(accessToken && (user?.role === "ADMIN" || user?.role === "MANAGER") && id);

  return useQuery<BookingDetail, ApiErrorResponse>({
    queryKey: ["admin-booking-detail", id],
    queryFn: () => getAdminBookingDetail(id),
    enabled,
  });
}

export function useConfirmAdminBooking(id: string) {
  const queryClient = useQueryClient();

  return useMutation<BookingDetail, ApiErrorResponse>({
    mutationFn: () => confirmAdminBooking(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-booking-detail", id] }),
        queryClient.invalidateQueries({ queryKey: ["admin-bookings"] }),
      ]);
    },
  });
}

export function useUpdateAdminBookingStatus(id: string) {
  const queryClient = useQueryClient();

  return useMutation<BookingDetail, ApiErrorResponse, BookingStatus>({
    mutationFn: (status) => updateAdminBookingStatus(id, status),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-booking-detail", id] }),
        queryClient.invalidateQueries({ queryKey: ["admin-bookings"] }),
      ]);
    },
  });
}

export function useQueryAdminVnpayTransaction(id: string) {
  const queryClient = useQueryClient();

  return useMutation<VnpayPaymentResultResponse, ApiErrorResponse>({
    mutationFn: () => queryAdminVnpayTransaction(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-booking-detail", id] }),
        queryClient.invalidateQueries({ queryKey: ["admin-bookings"] }),
      ]);
    },
  });
}

export function useRefundAdminVnpayPayment(id: string) {
  const queryClient = useQueryClient();

  return useMutation<VnpayPaymentResultResponse, ApiErrorResponse, number | undefined>({
    mutationFn: (amount) => refundAdminVnpayPayment(id, amount),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-booking-detail", id] }),
        queryClient.invalidateQueries({ queryKey: ["admin-bookings"] }),
      ]);
    },
  });
}
