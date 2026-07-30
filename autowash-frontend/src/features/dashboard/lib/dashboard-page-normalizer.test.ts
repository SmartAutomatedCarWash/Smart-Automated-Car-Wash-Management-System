import assert from "node:assert/strict";
import test from "node:test";
import { normalizeDashboardPage } from "./dashboard-page-normalizer.ts";

test("normalizes the legacy dashboard array response", () => {
  const items = [{ customerId: "customer-1" }];

  assert.deepEqual(normalizeDashboardPage(items, { page: 1, limit: 5 }), {
    items,
    pagination: {
      page: 1,
      limit: 5,
      total: 1,
      totalPages: 1,
      hasMore: false,
    },
  });
});

test("keeps the current dashboard page response", () => {
  const page = {
    items: [{ customerId: "customer-1" }],
    pagination: {
      page: 2,
      limit: 5,
      total: 9,
      totalPages: 2,
      hasMore: false,
    },
  };

  assert.deepEqual(normalizeDashboardPage(page, { page: 1, limit: 5 }), page);
});

test("normalizes a Spring Page response", () => {
  const items = [{ customerId: "customer-6" }];

  assert.deepEqual(normalizeDashboardPage({
    content: items,
    number: 1,
    size: 5,
    totalElements: 6,
    totalPages: 2,
    last: true,
  }, { page: 1, limit: 5 }), {
    items,
    pagination: {
      page: 2,
      limit: 5,
      total: 6,
      totalPages: 2,
      hasMore: false,
    },
  });
});

test("falls back to an empty page for malformed data", () => {
  assert.deepEqual(normalizeDashboardPage({ items: "not-an-array" } as never, { page: 1, limit: 5 }), {
    items: [],
    pagination: {
      page: 1,
      limit: 5,
      total: 0,
      totalPages: 0,
      hasMore: false,
    },
  });
});
