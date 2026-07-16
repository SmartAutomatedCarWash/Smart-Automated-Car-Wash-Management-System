package com.autowash.service;

import com.autowash.entity.Booking;

public interface BookingEmailDeliveryService {

    void sendBookingConfirmation(Booking booking, String email);

    default void sendBookingConfirmationOtp(Booking booking, String email, String otp, int expiresInSeconds) {
        throw new UnsupportedOperationException("Booking confirmation OTP email is not implemented");
    }

    default void sendBookingReminder(Booking booking, String email) {
        // no-op by default
    }
}
