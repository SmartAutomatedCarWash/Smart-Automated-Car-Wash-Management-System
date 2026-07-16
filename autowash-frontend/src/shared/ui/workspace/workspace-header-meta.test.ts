import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getWorkspaceHeaderMeta } from "./workspace-header-meta.ts";

describe("getWorkspaceHeaderMeta", () => {
  it("describes the customer booking workspace route", () => {
    const meta = getWorkspaceHeaderMeta("/customer/bookings/new");

    assert.equal(meta.title, "History");
    assert.equal(meta.subtitle, "Active bookings, completed sessions and combo purchase history");
    assert.equal(meta.workspace, "CUSTOMER");
  });

  it("describes staff operations routes without changing their URL shape", () => {
    const meta = getWorkspaceHeaderMeta("/staff/sessions/WS-01");

    assert.equal(meta.title, "Wash Session");
    assert.equal(meta.workspace, "STAFF");
  });

  it("describes admin account management as a unified account directory", () => {
    const meta = getWorkspaceHeaderMeta("/admin/accounts");

    assert.equal(meta.title, "Accounts");
    assert.equal(meta.subtitle, "Customer, staff, and admin account directory");
    assert.equal(meta.workspace, "ADMIN");
  });

  it("prioritizes staff session history before session detail routes", () => {
    const meta = getWorkspaceHeaderMeta("/staff/sessions/history");

    assert.equal(meta.title, "Wash Session History");
    assert.equal(meta.workspace, "STAFF");
  });

  it("falls back to a stable overview label for unknown admin sub-pages", () => {
    const meta = getWorkspaceHeaderMeta("/admin/not-yet-modeled");

    assert.equal(meta.title, "Overview");
    assert.equal(meta.workspace, "ADMIN");
  });
});
