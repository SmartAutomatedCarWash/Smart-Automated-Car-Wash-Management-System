import type { PaginationMeta } from "@/entities/reports";

export type NormalizedDashboardPage<T> = {
  items: T[];
  pagination: PaginationMeta;
};

export type DashboardPageWire<T> =
  | T[]
  | NormalizedDashboardPage<T>
  | {
      content?: T[];
      number?: number;
      size?: number;
      totalElements?: number;
      totalPages?: number;
      last?: boolean;
    }
  | null
  | undefined;

type DashboardPageDefaults = {
  page: number;
  limit: number;
};

export function normalizeDashboardPage<T>(
  value: DashboardPageWire<T>,
  defaults: DashboardPageDefaults,
): NormalizedDashboardPage<T> {
  if (Array.isArray(value)) {
    return {
      items: value,
      pagination: createPagination(defaults.page, defaults.limit, value.length, value.length > 0 ? 1 : 0, false),
    };
  }

  if (!value || typeof value !== "object") {
    return {
      items: [],
      pagination: createPagination(defaults.page, defaults.limit, 0, 0, false),
    };
  }

  if ("items" in value) {
    const items = Array.isArray(value.items) ? value.items : [];
    const pagination = value.pagination;
    return {
      items,
      pagination: createPagination(
        toPositiveInteger(pagination?.page, defaults.page),
        toPositiveInteger(pagination?.limit, defaults.limit),
        toNonNegativeInteger(pagination?.total, items.length),
        toNonNegativeInteger(pagination?.totalPages, items.length > 0 ? 1 : 0),
        typeof pagination?.hasMore === "boolean" ? pagination.hasMore : false,
      ),
    };
  }

  const items = Array.isArray(value.content) ? value.content : [];
  const page = toNonNegativeInteger(value.number, Math.max(defaults.page - 1, 0)) + 1;
  const totalPages = toNonNegativeInteger(value.totalPages, items.length > 0 ? 1 : 0);
  return {
    items,
    pagination: createPagination(
      page,
      toPositiveInteger(value.size, defaults.limit),
      toNonNegativeInteger(value.totalElements, items.length),
      totalPages,
      typeof value.last === "boolean" ? !value.last : page < totalPages,
    ),
  };
}

function createPagination(
  page: number,
  limit: number,
  total: number,
  totalPages: number,
  hasMore: boolean,
): PaginationMeta {
  return { page, limit, total, totalPages, hasMore };
}

function toPositiveInteger(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : fallback;
}

function toNonNegativeInteger(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : fallback;
}
