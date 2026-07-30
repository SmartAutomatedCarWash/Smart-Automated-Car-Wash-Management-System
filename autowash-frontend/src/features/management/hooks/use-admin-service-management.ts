"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store/auth.store";
import {
  createAdminCombo,
  createAdminPackage,
  createAdminService,
  deleteAdminCombo,
  deleteAdminPackage,
  deleteAdminService,
  listAdminCatalogPackages,
  listAdminCatalogServices,
  listAdminCombos,
  updateAdminCombo,
  updateAdminPackage,
  updateAdminService,
} from "@/features/management/lib/admin-service-management-service";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type {
  AdminCatalogPackage,
  AdminCatalogService,
  AdminCombo,
  AdminComboForm,
  AdminPackageForm,
  AdminServiceForm,
  CatalogListParams,
  CatalogPage,
} from "@/entities/management";

function useAdminManagementContext() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const userId = user?.userId ?? null;
  const enabled = Boolean(accessToken && userId && user?.role === "ADMIN");

  return { userId, enabled };
}

function adminManagementScope(userId: string | null) {
  return ["admin-service-management", userId] as const;
}

export function useAdminCatalogServices(params: CatalogListParams = {}) {
  const { userId, enabled } = useAdminManagementContext();

  return useQuery<CatalogPage<AdminCatalogService>, ApiErrorResponse>({
    queryKey: [...adminManagementScope(userId), "services", params],
    queryFn: () => listAdminCatalogServices(params),
    enabled,
  });
}

export function useAdminCatalogPackages(params: CatalogListParams = {}) {
  const { userId, enabled } = useAdminManagementContext();

  return useQuery<CatalogPage<AdminCatalogPackage>, ApiErrorResponse>({
    queryKey: [...adminManagementScope(userId), "packages", params],
    queryFn: () => listAdminCatalogPackages(params),
    enabled,
  });
}

export function useAdminCombosCatalog(params: CatalogListParams = {}) {
  const { userId, enabled } = useAdminManagementContext();

  return useQuery<CatalogPage<AdminCombo>, ApiErrorResponse>({
    queryKey: [...adminManagementScope(userId), "combos", params],
    queryFn: () => listAdminCombos(params),
    enabled,
  });
}

export function useCreateAdminCombo() {
  const queryClient = useQueryClient();
  const { userId } = useAdminManagementContext();

  return useMutation<AdminCombo, ApiErrorResponse, AdminComboForm>({
    mutationFn: createAdminCombo,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminManagementScope(userId) });
    },
  });
}

export function useDeleteAdminCombo() {
  const queryClient = useQueryClient();
  const { userId } = useAdminManagementContext();

  return useMutation<AdminCombo, ApiErrorResponse, string>({
    mutationFn: deleteAdminCombo,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminManagementScope(userId) });
    },
  });
}

export function useUpdateAdminCombo() {
  const queryClient = useQueryClient();
  const { userId } = useAdminManagementContext();

  return useMutation<AdminCombo, ApiErrorResponse, AdminComboForm & { comboId: string }>({
    mutationFn: updateAdminCombo,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminManagementScope(userId) });
    },
  });
}

export function useCreateAdminService() {
  const queryClient = useQueryClient();
  const { userId } = useAdminManagementContext();

  return useMutation<AdminCatalogService, ApiErrorResponse, AdminServiceForm>({
    mutationFn: async (form) => {
      return createAdminService({
        name: form.name,
        description: form.description,
        price: Number(form.price),
        duration: Number(form.duration),
        status: form.status,
        imageUrls: form.imageUrls || [],
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminManagementScope(userId) });
    },
  });
}

export function useDeleteAdminService() {
  const queryClient = useQueryClient();
  const { userId } = useAdminManagementContext();

  return useMutation<AdminCatalogService, ApiErrorResponse, string>({
    mutationFn: deleteAdminService,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminManagementScope(userId) });
    },
  });
}

export function useUpdateAdminService() {
  const queryClient = useQueryClient();
  const { userId } = useAdminManagementContext();

  return useMutation<AdminCatalogService, ApiErrorResponse, AdminServiceForm & { serviceId: string }>({
    mutationFn: async (form) => {
      return updateAdminService({
        serviceId: form.serviceId,
        name: form.name,
        description: form.description,
        price: Number(form.price),
        duration: Number(form.duration),
        status: form.status,
        imageUrls: form.imageUrls || [],
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminManagementScope(userId) });
    },
  });
}

export function useCreateAdminPackage() {
  const queryClient = useQueryClient();
  const { userId } = useAdminManagementContext();

  return useMutation<AdminCatalogPackage, ApiErrorResponse, AdminPackageForm>({
    mutationFn: async (form) => {
      const features = form.features
        ? form.features.split(",").map((f) => f.trim()).filter(Boolean)
        : [];
      return createAdminPackage({
        name: form.name,
        description: form.description,
        basePrice: Number(form.basePrice),
        duration: Number(form.duration),
        category: form.category,
        features,
        status: form.status,
        serviceIds: form.serviceIds,
        imageUrls: form.imageUrls || [],
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminManagementScope(userId) });
    },
  });
}

export function useDeleteAdminPackage() {
  const queryClient = useQueryClient();
  const { userId } = useAdminManagementContext();

  return useMutation<AdminCatalogPackage, ApiErrorResponse, string>({
    mutationFn: deleteAdminPackage,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminManagementScope(userId) });
    },
  });
}

export function useUpdateAdminPackage() {
  const queryClient = useQueryClient();
  const { userId } = useAdminManagementContext();

  return useMutation<AdminCatalogPackage, ApiErrorResponse, AdminPackageForm & { packageId: string }>({
    mutationFn: async (form) => {
      const features = form.features
        ? form.features.split(",").map((f) => f.trim()).filter(Boolean)
        : [];
      return updateAdminPackage({
        packageId: form.packageId,
        name: form.name,
        description: form.description,
        basePrice: Number(form.basePrice),
        duration: Number(form.duration),
        category: form.category,
        features,
        status: form.status,
        serviceIds: form.serviceIds,
        imageUrls: form.imageUrls || [],
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminManagementScope(userId) });
    },
  });
}
