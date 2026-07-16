package com.autowash.service.impl;

import com.autowash.entity.Booking;
import com.autowash.service.BookingEmailDeliveryService;
import com.resend.Resend;
import com.resend.services.emails.model.CreateEmailOptions;
import com.resend.services.emails.model.CreateEmailResponse;
import com.resend.services.emails.model.Template;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(prefix = "autowash.email", name = "provider", havingValue = "resend")
public class ResendBookingEmailDeliveryServiceImpl implements BookingEmailDeliveryService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ResendBookingEmailDeliveryServiceImpl.class);
    private static final String BOOKING_DETAIL_TEMPLATE_ID = "5ab158dc-e695-48e9-905c-176f12482631";
    private static final String BOOKING_CONFIRMATION_OTP_TEMPLATE_ID = "6ff8e31e-60c0-412a-a237-2339dcbfbf2f";

    private final Resend resend;
    private final String from;
    private final String fromName;

    public ResendBookingEmailDeliveryServiceImpl(
            @Value("${autowash.email.resend-api-key}") String apiKey,
            @Value("${autowash.email.from}") String from,
            @Value("${autowash.email.from-name:AURA Car Wash}") String fromName
    ) {
        this.resend = new Resend(apiKey);
        this.from = from;
        this.fromName = fromName;
    }

    @Override
    public void sendBookingConfirmation(Booking booking, String email) {
        try {
            CreateEmailOptions params = CreateEmailOptions.builder()
                    .from(fromName + " <" + from + ">")
                    .to(email)
                    .subject("AURA Car Wash - Booking Confirmation")
                    .template(bookingDetailTemplate(booking))
                    .build();
            CreateEmailResponse response = resend.emails().send(params);
            LOGGER.info("Booking confirmation sent: bookingId={}, emailId={}, to={}",
                    booking.getId(), response.getId(), email);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to send booking confirmation via Resend", e);
        }
    }

    @Override
    public void sendBookingConfirmationOtp(Booking booking, String email, String otp, int expiresInSeconds) {
        try {
            int minutes = Math.max(expiresInSeconds / 60, 1);
            CreateEmailOptions params = CreateEmailOptions.builder()
                    .from(fromName + " <" + from + ">")
                    .to(email)
                    .subject("AURA Car Wash - Booking Confirmation OTP")
                    .template(bookingConfirmationOtpTemplate(booking, otp, minutes))
                    .build();
            CreateEmailResponse response = resend.emails().send(params);
            LOGGER.info("Booking confirmation OTP sent: bookingId={}, emailId={}, to={}",
                    booking.getId(), response.getId(), email);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to send booking confirmation OTP via Resend", e);
        }
    }

    @Override
    public void sendBookingReminder(Booking booking, String email) {
        try {
            CreateEmailOptions params = CreateEmailOptions.builder()
                    .from(fromName + " <" + from + ">")
                    .to(email)
                    .subject("AURA Car Wash - Nhắc nhở lịch rửa xe")
                    .template(bookingReminderTemplate(booking))
                    .build();
            CreateEmailResponse response = resend.emails().send(params);
            LOGGER.info("Booking reminder sent: bookingId={}, emailId={}, to={}",
                    booking.getId(), response.getId(), email);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to send booking reminder via Resend", e);
        }
    }

    private Template bookingDetailTemplate(Booking booking) {
        return Template.builder()
                .id(BOOKING_DETAIL_TEMPLATE_ID)
                .addVariable("bookingId", booking.getId().toString())
                .addVariable("bookingDate", booking.getBookingDate().toString())
                .addVariable("bookingTime", booking.getBookingTime().toString())
                .addVariable("finalAmount", String.format("%,d", booking.getFinalAmount()))
                .addVariable("status", booking.getStatus().name())
                .build();
    }

    private Template bookingConfirmationOtpTemplate(Booking booking, String otp, int minutes) {
        return Template.builder()
                .id(BOOKING_CONFIRMATION_OTP_TEMPLATE_ID)
                .addVariable("bookingId", booking.getId().toString())
                .addVariable("bookingDate", booking.getBookingDate().toString())
                .addVariable("bookingTime", booking.getBookingTime().toString())
                .addVariable("finalAmount", String.format("%,d", booking.getFinalAmount()))
                .addVariable("otp", otp)
                .addVariable("minutes", String.valueOf(minutes))
                .build();
    }

    private Template bookingReminderTemplate(Booking booking) {
        // We reuse the detail template or you can create a separate one on Resend
        // For now, using BOOKING_DETAIL_TEMPLATE_ID because they share similar fields
        return Template.builder()
                .id(BOOKING_DETAIL_TEMPLATE_ID)
                .addVariable("bookingId", booking.getId().toString())
                .addVariable("bookingDate", booking.getBookingDate().toString())
                .addVariable("bookingTime", booking.getBookingTime().toString())
                .addVariable("finalAmount", String.format("%,d", booking.getFinalAmount()))
                .addVariable("status", booking.getStatus().name())
                .build();
    }
}
