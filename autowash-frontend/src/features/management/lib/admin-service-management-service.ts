import { apiClient, apiRequest } from "@/shared/lib/api";
import type { ApiPaginatedResponse } from "@/shared/types/api.types";
import type {
  AdminCatalogPackage,
  AdminCatalogService,
  AdminCombo,
  AdminComboForm,
  CatalogListParams,
  CatalogPage,
} from "@/entities/management";

const DEFAULT_CATALOG_LIMIT = 5;

function catalogParams(params: CatalogListParams = {}) {
  return {
    page: params.page ?? 1,
    limit: params.limit ?? DEFAULT_CATALOG_LIMIT,
    status: params.status || undefined,
    sortBy: params.sortBy ?? "name",
    direction: params.direction ?? "asc",
  };
}

function toCatalogPage<T>(response: ApiPaginatedResponse<T>): CatalogPage<T> {
  return {
    items: response.data,
    pagination: response.pagination,
  };
}

export async function listAdminCatalogServices(params: CatalogListParams = {}) {
  const response = await apiClient.get<ApiPaginatedResponse<AdminCatalogService>>("/admin/services", {
    params: catalogParams(params),
  });
  return toCatalogPage(response.data);
}

export async function listAdminCatalogPackages(params: CatalogListParams = {}) {
  const response = await apiClient.get<ApiPaginatedResponse<AdminCatalogPackage>>("/admin/packages", {
    params: catalogParams(params),
  });
  return toCatalogPage(response.data);
}

export function createAdminService(payload: {
  name: string;
  description: string;
  price: number;
  duration: number;
  status: string;
  imageUrls?: string[];
}) {
  return apiRequest<AdminCatalogService, Record<string, unknown>>({
    method: "POST",
    url: "/admin/services",
    data: {
      name: payload.name,
      description: payload.description,
      price: Number(payload.price),
      durationMinutes: Number(payload.duration),
      status: payload.status,
      imageUrls: payload.imageUrls || [],
    },
  });
}

export function deleteAdminService(serviceId: string) {
  return apiRequest<AdminCatalogService>({
    method: "DELETE",
    url: `/admin/services/${serviceId}`,
  });
}

export function updateAdminService(payload: {
  serviceId: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  status: string;
  imageUrls?: string[];
}) {
  return apiRequest<AdminCatalogService, Record<string, unknown>>({
    method: "PUT",
    url: `/admin/services/${payload.serviceId}`,
    data: {
      name: payload.name,
      description: payload.description,
      price: Number(payload.price),
      durationMinutes: Number(payload.duration),
      status: payload.status,
      imageUrls: payload.imageUrls || [],
    },
  });
}

export function createAdminPackage(payload: {
  name: string;
  description: string;
  basePrice: number;
  duration: number;
  category: string;
  features: string[];
  status: string;
  serviceIds: string[];
  imageUrls?: string[];
}) {
  return apiRequest<AdminCatalogPackage, Record<string, unknown>>({
    method: "POST",
    url: "/admin/packages",
    data: {
      name: payload.name,
      description: payload.description,
      basePrice: Number(payload.basePrice),
      durationMinutes: Number(payload.duration),
      imageUrls: payload.imageUrls || [],
      status: payload.status,
      options: payload.serviceIds.map((serviceId, index) => ({
        optionId: serviceId,
        quantity: 1,
        sortOrder: index + 1,
      })),
    },
  });
}

export function deleteAdminPackage(packageId: string) {
  return apiRequest<AdminCatalogPackage>({
    method: "DELETE",
    url: `/admin/packages/${packageId}`,
  });
}

export function updateAdminPackage(payload: {
  packageId: string;
  name: string;
  description: string;
  basePrice: number;
  duration: number;
  category: string;
  features: string[];
  status: string;
  serviceIds: string[];
  imageUrls?: string[];
}) {
  return apiRequest<AdminCatalogPackage, Record<string, unknown>>({
    method: "PUT",
    url: `/admin/packages/${payload.packageId}`,
    data: {
      name: payload.name,
      description: payload.description,
      basePrice: Number(payload.basePrice),
      durationMinutes: Number(payload.duration),
      imageUrls: payload.imageUrls || [],
      status: payload.status,
      options: payload.serviceIds.map((serviceId, index) => ({
        optionId: serviceId,
        quantity: 1,
        sortOrder: index + 1,
      })),
    },
  });
}

// API Flow: Calls GET /api/v1/admin/combos in Backend
// Handled by: AdminComboController.listCombos() -> AdminComboServiceImpl.listCombos()
export async function listAdminCombos(params: CatalogListParams = {}) {
  const response = await apiClient.get<ApiPaginatedResponse<AdminCombo>>("/admin/combos", {
    params: catalogParams(params),
  });
  return toCatalogPage(response.data);
}

export function createAdminCombo(payload: AdminComboForm) {
  return apiRequest<AdminCombo, Record<string, unknown>>({
    method: "POST",
    url: "/admin/combos",
    data: {
      name: payload.name,
      description: payload.description || null,
      price: Number(payload.price),
      originalPrice: payload.originalPrice ? Number(payload.originalPrice) : null,
      durationMinutes: Number(payload.durationMinutes),
      durationDays: payload.durationDays ? Number(payload.durationDays) : null,
      maxUsages: payload.maxUsages ? Number(payload.maxUsages) : null,
      imageUrls: payload.imageUrls || [],
      status: payload.status,
      options: payload.optionIds.map((optionId, index) => ({
        optionId,
        quantity: 1,
        sortOrder: index + 1,
      })),
    },
  });
}

export function deleteAdminCombo(comboId: string) {
  return apiRequest<AdminCombo>({
    method: "DELETE",
    url: `/admin/combos/${comboId}`,
  });
}

export function updateAdminCombo(payload: AdminComboForm & { comboId: string }) {
  return apiRequest<AdminCombo, Record<string, unknown>>({
    method: "PUT",
    url: `/admin/combos/${payload.comboId}`,
    data: {
      name: payload.name,
      description: payload.description || null,
      price: Number(payload.price),
      originalPrice: payload.originalPrice ? Number(payload.originalPrice) : null,
      durationMinutes: Number(payload.durationMinutes),
      durationDays: payload.durationDays ? Number(payload.durationDays) : null,
      maxUsages: payload.maxUsages ? Number(payload.maxUsages) : null,
      imageUrls: payload.imageUrls || [],
      status: payload.status,
      options: payload.optionIds.map((optionId, index) => ({
        optionId,
        quantity: 1,
        sortOrder: index + 1,
      })),
    },
  });
}

export type ImageUploadResponse = {
  url: string;
  fileName: string;
  size: number;
};

export function uploadCatalogImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest<ImageUploadResponse, FormData>({
    method: "POST",
    url: "/admin/uploads/images",
    data: formData,
    headers: { "Content-Type": "multipart/form-data" },
  });
}
