package com.autowash.entity.enums;

/**
 * Stored as varchar with a database CHECK constraint.
 * Values: ACTIVE | INACTIVE
 * Used by: packages.status, services.status, combos.status,
 *          discounts.status
 */
public enum ActiveStatus {
    ACTIVE,
    INACTIVE
}
