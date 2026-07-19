package com.autowash.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record CreateBookingResponse(
        String bookingId,
        String customerId,
        String vehicleId,
        String vehiclePlate,
        String primaryItemName,
        List<BookingDetailDto> details,
        Pricing pricing,
        LocalDate bookingDate,
        String bookingTime,
        int estimatedDuration,
        String paymentMethod,
        String paymentStatus,
        String status,
        String confirmationStatus,
        int otpExpiresIn,
        Instant otpExpiresAt,
        Instant createdAt,
        String confirmationNumber,
        String confirmationEmail,
        String comboId,
        String customerComboId,
        boolean comboPurchased,
        String devOtp
) {
    public record Pricing(
            long subtotal,
            String discountCode,
            long discountAmount,
            long finalAmount,
            String currency
    ) {
    }
}
