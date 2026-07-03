package com.autowash.dto;

import com.autowash.entity.enums.ActiveStatus;
import com.autowash.entity.enums.DiscountType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public record AdminVoucherRequest(
        @NotBlank
        @Size(max = 50)
        @Pattern(regexp = "^[A-Z0-9_-]+$", message = "Voucher code must be uppercase and must not contain spaces")
        String code,
        @NotBlank
        @Size(max = 120)
        String name,
        @NotNull DiscountType discountType,
        @Min(1) long discountValue,
        @Min(0) long minOrderAmount,
        @Min(0) Long maxDiscountAmount,
        @Min(1) Integer usageLimit,
        boolean newCustomerOnly,
        @NotNull Instant startAt,
        @NotNull Instant endAt,
        ActiveStatus status,
        List<String> targetTiers
) {
}
