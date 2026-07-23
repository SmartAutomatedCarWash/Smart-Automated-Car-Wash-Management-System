package com.autowash.dto;

import com.autowash.entity.enums.PaymentMethod;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record PurchaseCustomerComboRequest(
        @NotBlank(message = "Combo is required")
        String comboId,
        List<String> comboIds,
        @NotNull(message = "Payment method is required")
        PaymentMethod paymentMethod
) {
}
