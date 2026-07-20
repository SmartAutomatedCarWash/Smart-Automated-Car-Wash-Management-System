package com.autowash.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record DiscountValidationRequest(
        @NotBlank(message = "Voucher code is required")
        String discountCode,
        String packageId,
        @Min(value = 0, message = "Amount must be greater than or equal to 0")
        long amount
) {
}
