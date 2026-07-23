"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCustomerVehicle,
  deleteCustomerVehicle,
  getCustomerVehicle,
  listCustomerVehicles,
  setPrimaryCustomerVehicle,
  updateCustomerVehicle,
} from "@/features/vehicles/lib/vehicle-service";
import { useAuthStore } from "@/features/auth/store/auth.store";
import type { ApiErrorResponse } from "@/shared/types/api.types";
import type {
  CreateCustomerVehicleRequest,
  CreateCustomerVehicleResponse,
  CustomerVehicleDetail,
  CustomerVehicleListItem,
  CustomerVehicleListPage,
  SetPrimaryCustomerVehicleResponse,
  UpdateCustomerVehicleRequest,
  UpdateCustomerVehicleResponse,
} from "@/entities/vehicles";
import {
  customerVehicleDetailQueryKey,
  customerVehiclesQueryKey,
  customerVehiclesQueryScope,
} from "@/features/vehicles/hooks/customer-vehicle-query";

function useVehicleQueryContext() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const userId = user?.userId ?? null;
  const enabled = Boolean(accessToken && userId && user?.role === "CUSTOMER");

  return { userId, enabled };
}

function toVehicleListItem(vehicle: CreateCustomerVehicleResponse): CustomerVehicleListItem {
  return {
    vehicleId: vehicle.vehicleId,
    plate: vehicle.plate,
    type: vehicle.type,
    brand: vehicle.brand,
    model: vehicle.model,
    color: vehicle.color,
    isPrimary: vehicle.isPrimary,
    status: vehicle.status,
  };
}

export function useCustomerVehicles(page = 1, limit = 20) {
  const { userId, enabled } = useVehicleQueryContext();

  return useQuery<CustomerVehicleListPage, ApiErrorResponse>({
    queryKey: customerVehiclesQueryKey(userId, page, limit),
    queryFn: () => listCustomerVehicles({ page, limit }),
    enabled,
  });
}

export function useCustomerVehicleDetail(vehicleId: string) {
  const { userId, enabled } = useVehicleQueryContext();

  return useQuery<CustomerVehicleDetail, ApiErrorResponse>({
    queryKey: customerVehicleDetailQueryKey(userId, vehicleId),
    queryFn: () => getCustomerVehicle(vehicleId),
    enabled: enabled && vehicleId.length > 0,
  });
}

export function useCreateCustomerVehicle() {
  const queryClient = useQueryClient();
  const { userId } = useVehicleQueryContext();

  return useMutation<CreateCustomerVehicleResponse, ApiErrorResponse, CreateCustomerVehicleRequest>(
    {
      mutationFn: createCustomerVehicle,
      onSuccess: async (createdVehicle) => {
        queryClient.setQueryData(
          customerVehicleDetailQueryKey(userId, createdVehicle.vehicleId),
          createdVehicle,
        );

        queryClient.setQueriesData<CustomerVehicleListPage>(
          { queryKey: customerVehiclesQueryScope(userId) },
          (current) => {
            if (
              !current ||
              !("items" in current) ||
              !Array.isArray(current.items) ||
              !("pagination" in current)
            ) {
              return current;
            }

            const nextItems = current.items
              .filter((vehicle) => vehicle.vehicleId !== createdVehicle.vehicleId)
              .map((vehicle) => ({
                ...vehicle,
                isPrimary: createdVehicle.isPrimary ? false : vehicle.isPrimary,
              }));

            return {
              ...current,
              items: [toVehicleListItem(createdVehicle), ...nextItems],
              pagination: {
                ...current.pagination,
                total: current.pagination.total + 1,
              },
            };
          },
        );

        await queryClient.invalidateQueries({ queryKey: customerVehiclesQueryScope(userId) });
      },
    },
  );
}

export function useUpdateCustomerVehicle(vehicleId: string) {
  const queryClient = useQueryClient();
  const { userId } = useVehicleQueryContext();

  return useMutation<
    UpdateCustomerVehicleResponse,
    ApiErrorResponse,
    UpdateCustomerVehicleRequest
  >({
    mutationFn: (payload) => updateCustomerVehicle(vehicleId, payload),
    onSuccess: async (updatedVehicle) => {
      queryClient.setQueryData<CustomerVehicleDetail>(
        customerVehicleDetailQueryKey(userId, vehicleId),
        (current) =>
          current
            ? {
                ...current,
                brand: updatedVehicle.brand,
                model: updatedVehicle.model,
                year: updatedVehicle.year,
                color: updatedVehicle.color,
              }
            : current,
      );

      queryClient.setQueriesData<CustomerVehicleListPage>(
        { queryKey: customerVehiclesQueryScope(userId) },
        (current) => {
          if (
            !current ||
            !("items" in current) ||
            !Array.isArray(current.items)
          ) {
            return current;
          }

          return {
            ...current,
            items: current.items.map((vehicle) =>
              vehicle.vehicleId === vehicleId
                ? {
                    ...vehicle,
                    brand: updatedVehicle.brand,
                    model: updatedVehicle.model,
                    color: updatedVehicle.color,
                  }
                : vehicle,
            ),
          };
        },
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: customerVehiclesQueryScope(userId) }),
        queryClient.invalidateQueries({
          queryKey: customerVehicleDetailQueryKey(userId, vehicleId),
        }),
      ]);
    },
  });
}

export function useSetPrimaryCustomerVehicle(vehicleId: string) {
  const queryClient = useQueryClient();
  const { userId } = useVehicleQueryContext();

  return useMutation<SetPrimaryCustomerVehicleResponse, ApiErrorResponse, void>({
    mutationFn: () => setPrimaryCustomerVehicle(vehicleId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: customerVehiclesQueryScope(userId) }),
        queryClient.invalidateQueries({
          queryKey: customerVehicleDetailQueryKey(userId, vehicleId),
        }),
      ]);
    },
  });
}

export function useDeleteCustomerVehicle(vehicleId: string) {
  const queryClient = useQueryClient();
  const { userId } = useVehicleQueryContext();

  return useMutation<void, ApiErrorResponse, void>({
    mutationFn: () => deleteCustomerVehicle(vehicleId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: customerVehiclesQueryScope(userId) }),
        queryClient.removeQueries({
          queryKey: customerVehicleDetailQueryKey(userId, vehicleId),
        }),
      ]);
    },
  });
}
