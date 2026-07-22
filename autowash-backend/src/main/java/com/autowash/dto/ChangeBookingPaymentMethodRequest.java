package com.autowash.dto;

import com.autowash.entity.enums.PaymentMethod;
import jakarta.validation.constraints.NotNull;

public record ChangeBookingPaymentMethodRequest(
        @NotNull PaymentMethod paymentMethod
) {
}
