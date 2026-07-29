import { useQuery } from "@tanstack/react-query";
import { listAdminBookings, getAdminBookingSummary } from "@/features/reports/api/admin-reporting-service";
import { useAuthStore } from "@/features/auth/store/auth.store";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type { AdminBookingsFilters, AdminBookingsPage } from "@/entities/reports";

export function useAdminBookings(
  page = 1,
  limit = 5,
  filters: AdminBookingsFilters = {},
) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const enabled = Boolean(accessToken && (user?.role === "ADMIN" || user?.role === "MANAGER"));

  return useQuery<AdminBookingsPage, ApiErrorResponse>({
    queryKey: ["admin-bookings", page, limit, filters],
    queryFn: () => listAdminBookings(filters, page, limit),
    enabled,
    staleTime: 30_000,
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
  });
}

export function useAdminBookingSummary() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const enabled = Boolean(accessToken && (user?.role === "ADMIN" || user?.role === "MANAGER"));

  return useQuery({
    queryKey: ["admin-bookings-summary"],
    queryFn: () => getAdminBookingSummary(),
    enabled,
    staleTime: 30_000,
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
  });
}
