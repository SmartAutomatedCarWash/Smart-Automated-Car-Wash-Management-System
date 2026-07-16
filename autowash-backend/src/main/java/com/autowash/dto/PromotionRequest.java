package com.autowash.dto;

import com.autowash.entity.enums.ActiveStatus;
import com.autowash.entity.enums.PromotionTargetingMode;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public record PromotionRequest(
        @NotBlank
        @Size(max = 120)
        @Pattern(
                regexp = "^[A-Z0-9_-]+$",
                message = "Promotion name must be uppercase and must not contain spaces"
        )
        String name,
        @Size(max = 500) String description,
        @NotNull Double pointMultiplier,
        com.autowash.entity.enums.DiscountType discountType,
        Long discountValue,
        @NotNull Instant startDate,
        @NotNull Instant endDate,
        @NotNull PromotionTargetingMode targetingMode,
        List<String> applicableTiers,
        @Min(1) Integer maxUsagePerCustomer,
        ActiveStatus status
) {
}

