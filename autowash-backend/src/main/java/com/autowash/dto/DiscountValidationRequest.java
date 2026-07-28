package com.autowash.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record DiscountValidationRequest(
        @NotBlank(message = "Voucher code is required")
        String discountCode,
        String packageId,
        String comboId,
        List<String> options,
        @Min(value = 0, message = "Amount must be greater than or equal to 0")
        long amount
) {
}
