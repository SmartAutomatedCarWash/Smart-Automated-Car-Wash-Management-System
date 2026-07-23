import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  confirmAdminBooking,
  getAdminBookingDetail,
  refundAdminVnpayPayment,
  updateAdminBookingStatus,
  getAdminVehicleDetail,
  type AdminVehicleDetail
} from "@/features/reports/api/admin-reporting-service";
import { useAuthStore } from "@/features/auth/store/auth.store";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type { BookingDetail, BookingStatus, VnpayPaymentResultResponse } from "@/entities/bookings";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export function useAdminVehicleDetail(vehicleId: string, enabled: boolean) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const isAuthorized = Boolean(accessToken && (user?.role === "ADMIN" || user?.role === "MANAGER"));

  return useQuery<AdminVehicleDetail, ApiErrorResponse>({
    queryKey: ["admin-vehicle-detail", vehicleId],
    queryFn: () => getAdminVehicleDetail(vehicleId),
    enabled: isAuthorized && enabled && UUID_PATTERN.test(vehicleId),
    staleTime: 60_000,
  });
}
