package com.autowash.dto;

import com.autowash.entity.enums.PaymentMethod;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.time.LocalDate;
import java.util.List;

public record CreateBookingRequest(
        @NotBlank(message = "Vehicle is required")
        String vehicleId,
        String packageId,
        List<String> options,
        @NotNull(message = "Booking date is required")
        @FutureOrPresent(message = "Booking date must be today or in the future")
        LocalDate bookingDate,
        @NotBlank(message = "Booking time is required")
        @Pattern(regexp = "^([01]\\d|2[0-3]):[0-5]\\d$", message = "Booking time must be in HH:mm format")
        String bookingTime,
        String voucherCode,
        @NotNull(message = "Payment method is required")
        PaymentMethod paymentMethod,
        String comboId
) {
    @AssertTrue(message = "Either packageId or comboId is required")
    public boolean hasPackageOrCombo() {
        return (packageId != null && !packageId.isBlank()) || (comboId != null && !comboId.isBlank());
    }

    @AssertTrue(message = "Voucher code must be uppercase and must not contain spaces")
    public boolean isValidVoucherCode() {
        if (voucherCode == null || voucherCode.isBlank()) {
            return true;
        }
        return voucherCode.matches("^[A-Z0-9_-]+$");
    }
}

