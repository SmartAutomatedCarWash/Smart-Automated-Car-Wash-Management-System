import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getWorkspaceHeaderMeta } from "./workspace-header-meta.ts";

describe("getWorkspaceHeaderMeta", () => {
  it("describes the customer booking workspace route", () => {
    const meta = getWorkspaceHeaderMeta("/customer/bookings/new");

    assert.equal(meta.title, "New Booking");
    assert.equal(meta.subtitle, "Create a new booking for your current primary or selected vehicle");
    assert.equal(meta.workspace, "CUSTOMER");
  });

  it("describes customer notifications without falling back to a workspace label", () => {
    const meta = getWorkspaceHeaderMeta("/customer/notifications");

    assert.equal(meta.title, "Notifications");
    assert.equal(meta.workspace, "CUSTOMER");
  });

  it("describes customer settings without falling back to a workspace label", () => {
    const meta = getWorkspaceHeaderMeta("/customer/settings");

    assert.equal(meta.title, "Settings");
    assert.equal(meta.workspace, "CUSTOMER");
  });

  it("describes customer combos without falling back to a workspace label", () => {
    const meta = getWorkspaceHeaderMeta("/customer/combos");

    assert.equal(meta.title, "Combos");
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
