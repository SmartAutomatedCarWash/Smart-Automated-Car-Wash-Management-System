package com.autowash.dto;

import java.util.List;

public record AdminAccountSummaryResponse(
        long totalCustomers,
        List<TierCount> customerTiers,
        List<RoleCount> staffRoles
) {
    public record TierCount(String tier, String displayName, long count) {}

    public record RoleCount(String role, long count) {}
}
