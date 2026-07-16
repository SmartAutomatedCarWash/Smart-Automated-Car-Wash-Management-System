package com.autowash.job;

import com.autowash.entity.Booking;
import com.autowash.entity.Notification;
import com.autowash.entity.enums.BookingStatus;
import com.autowash.entity.enums.NotificationType;
import com.autowash.repository.BookingRepository;
import com.autowash.repository.NotificationRepository;
import com.autowash.service.BookingEmailDeliveryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Component
public class BookingReminderJob {

    private static final Logger LOGGER = LoggerFactory.getLogger(BookingReminderJob.class);

    private final BookingRepository bookingRepository;
    private final NotificationRepository notificationRepository;
    private final BookingEmailDeliveryService bookingEmailDeliveryService;

    public BookingReminderJob(
            BookingRepository bookingRepository,
            NotificationRepository notificationRepository,
            BookingEmailDeliveryService bookingEmailDeliveryService
    ) {
        this.bookingRepository = bookingRepository;
        this.notificationRepository = notificationRepository;
        this.bookingEmailDeliveryService = bookingEmailDeliveryService;
    }

    @Scheduled(cron = "*/15 * * * * *") // Temporary: run every 15s for testing
    @Transactional
    public void sendReminders() {
        LOGGER.info("Starting booking reminder job...");
        Instant from = Instant.now().plus(23, ChronoUnit.HOURS);
        Instant to   = Instant.now().plus(24, ChronoUnit.HOURS);
        List<Booking> upcoming = bookingRepository
            .findByScheduledAtBetweenAndStatusInAndReminderSentFalse(from, to, List.of(BookingStatus.PENDING, BookingStatus.CONFIRMED));
        
        for (Booking booking : upcoming) {
            // 1. In-app notification
            notificationRepository.save(Notification.builder()
                .id(UUID.randomUUID())
                .user(booking.getCustomer())
                .title("Nhắc nhở: Lịch rửa xe ngày mai")
                .message("Bạn có lịch rửa xe vào lúc " + booking.getBookingTime()
                    + " ngày " + booking.getBookingDate() + ". Vui lòng đến đúng giờ!")
                .type(NotificationType.BOOKING_REMINDER)
                .read(false)
                .createdAt(Instant.now())
                .build());

            // 2. Email reminder
            String email = booking.getCustomer().getEmail();
            if (email != null && !email.isBlank()) {
                try {
                    bookingEmailDeliveryService.sendBookingReminder(booking, email);
                } catch (Exception e) {
                    LOGGER.warn("Failed to send reminder email for booking {}: {}",
                        booking.getId(), e.getMessage());
                }
            }

            // 3. Mark as sent
            booking.markReminderSent();
        }
    }
}
