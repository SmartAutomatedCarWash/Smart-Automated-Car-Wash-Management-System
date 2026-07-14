"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchAdminDashboardMetrics,
  fetchAdminDashboardFull,
  fetchStaffKpi,
} from "@/features/dashboard/api/admin-dashboard-service";
import type { DashboardMetrics, AdminDashboardFull, StaffKpiItem, StaffKpiRange } from "@/features/dashboard/api/admin-dashboard-service";
import { useAuthStore } from "@/features/auth/store/auth.store";
import type { ApiErrorResponse } from "@/shared/types/api.types";

export function useAdminDashboardMetrics() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const enabled = Boolean(accessToken && user?.role === "ADMIN");

  return useQuery<DashboardMetrics, ApiErrorResponse>({
    queryKey: ["admin-dashboard", "metrics"],
    queryFn: fetchAdminDashboardMetrics,
    enabled,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}

export function useAdminDashboardFull() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const enabled = Boolean(accessToken && user?.role === "ADMIN");

  return useQuery<AdminDashboardFull, ApiErrorResponse>({
    queryKey: ["admin-dashboard", "full"],
    queryFn: fetchAdminDashboardFull,
    enabled,
    staleTime: 0,
    gcTime: 0,
    refetchInterval: 60_000,
    retry: 2,
    retryDelay: 1000,
  });
}

export function useStaffKpi(range: StaffKpiRange) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const enabled = Boolean(accessToken && user?.role === "ADMIN");

  return useQuery<StaffKpiItem[], ApiErrorResponse>({
    queryKey: ["admin-staff-kpi", range],
    queryFn: () => fetchStaffKpi(range),
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
