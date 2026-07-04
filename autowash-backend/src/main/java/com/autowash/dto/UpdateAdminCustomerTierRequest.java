package com.autowash.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateAdminCustomerTierRequest(
        @NotBlank(message = "Tier is required")
        String tier
) {}
