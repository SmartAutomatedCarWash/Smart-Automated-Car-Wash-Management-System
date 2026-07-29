package com.autowash.service.impl;

import com.autowash.entity.WashSession;
import com.autowash.entity.BookingPricing;

import com.autowash.service.LoyaltyService;

import com.autowash.entity.Notification;

import com.autowash.repository.NotificationRepository;

import com.autowash.entity.Booking;
import com.autowash.entity.BookingStatusHistory;
import com.autowash.entity.ViolationRecord;
import com.autowash.entity.enums.BookingStatus;
import com.autowash.entity.enums.NotificationType;
import com.autowash.entity.enums.WashSessionStatus;
import com.autowash.repository.BookingRepository;
import com.autowash.repository.BookingStatusHistoryRepository;
import com.autowash.repository.ViolationRecordRepository;
import com.autowash.repository.WashSessionRepository;
import com.autowash.service.BookingNoShowService;
import com.autowash.service.CustomerComboService;
import com.autowash.service.DiscountRedemptionService;
import com.autowash.service.WashSessionLifecycle;
import jakarta.persistence.EntityNotFoundException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingNoShowServiceImpl implements BookingNoShowService {

    private static final Logger LOGGER = LoggerFactory.getLogger(BookingNoShowServiceImpl.class);

    private static final Set<WashSessionStatus> CHECKED_IN_OR_BETTER = Set.of(
            WashSessionStatus.CHECKED_IN,
            WashSessionStatus.IN_PROGRESS,
            WashSessionStatus.COMPLETED
    );
    private static final Set<WashSessionStatus> NOT_CHECKED_IN_SESSION_STATUSES = Set.of(
            WashSessionStatus.PENDING,
            WashSessionStatus.QUEUED
    );

    private final BookingRepository bookingRepository;
    private final WashSessionRepository washSessionRepository;
    private final BookingStatusHistoryRepository bookingStatusHistoryRepository;
    private final DiscountRedemptionService DiscountRedemptionService;
    private final ViolationRecordRepository violationRecordRepository;
    private final NotificationRepository notificationRepository;
    private final LoyaltyService loyaltyService;
    private final CustomerComboService customerComboService;
    private final long noShowGraceMinutes;

    public BookingNoShowServiceImpl(
            BookingRepository bookingRepository,
            WashSessionRepository washSessionRepository,
            BookingStatusHistoryRepository bookingStatusHistoryRepository,
            DiscountRedemptionService DiscountRedemptionService,
            ViolationRecordRepository violationRecordRepository,
            NotificationRepository notificationRepository,
            LoyaltyService loyaltyService,
            CustomerComboService customerComboService,
            @Value("${autowash.booking.no-show.grace-minutes:15}") long noShowGraceMinutes
    ) {
        this.bookingRepository = bookingRepository;
        this.washSessionRepository = washSessionRepository;
        this.bookingStatusHistoryRepository = bookingStatusHistoryRepository;
        this.DiscountRedemptionService = DiscountRedemptionService;
        this.violationRecordRepository = violationRecordRepository;
        this.notificationRepository = notificationRepository;
        this.loyaltyService = loyaltyService;
        this.customerComboService = customerComboService;
        this.noShowGraceMinutes = noShowGraceMinutes;
    }

    @Override
    @Transactional
    public int markOverdueBookingsNoShow() {
        Instant now = Instant.now();
        Instant cutoff = now.minusSeconds(noShowGraceMinutes * 60);
        List<Booking> bookings = bookingRepository.findNoShowCandidates(
                List.of(BookingStatus.CONFIRMED),
                cutoff,
                CHECKED_IN_OR_BETTER
        );

        int markedCount = 0;
        for (Booking booking : bookings) {
            try {
                BookingStatus oldStatus = booking.getStatus();
                booking.markNoShow();
                customerComboService.forfeitUsageForBooking(booking.getId().toString());
                cancelNotCheckedInSessions(booking, now);
                int deductedPoints = applyNoShowPenalty(booking, now);
                if (hasDiscountPricing(booking)) {
                    DiscountRedemptionService.revertRedemption(booking);
                }
                notificationRepository.save(Notification.builder()
                        .id(UUID.randomUUID())
                        .user(booking.getCustomer())
                        .title("Booking marked no-show")
                        .message("Your booking at " + booking.getBookingTime()
                                + " was marked no-show because you did not check in within the grace period. "
                                + deductedPoints + " loyalty points were deducted.")
                        .type(NotificationType.NO_SHOW)
                        .read(false)
                        .createdAt(now)
                        .build());
                bookingStatusHistoryRepository.save(new BookingStatusHistory(
                        booking,
                        oldStatus.name(),
                        BookingStatus.NO_SHOW.name(),
                        null,
                        "Customer did not check in within " + noShowGraceMinutes + " minutes"
                ));
                markedCount++;
            } catch (EntityNotFoundException exception) {
                LOGGER.warn("Skipped no-show booking with missing related data: bookingId={}", booking.getId(), exception);
            }
        }
        return markedCount;
    }

    private boolean hasDiscountPricing(Booking booking) {
        BookingPricing pricing = booking.getPricing();
        return pricing != null && pricing.getDiscountType() != null;
    }

    private int applyNoShowPenalty(Booking booking, Instant now) {
        Instant thirtyDaysAgo = now.minus(30, ChronoUnit.DAYS);
        long previousNoShows = violationRecordRepository.countByCustomer_IdAndTypeAndCreatedAtAfter(
                booking.getCustomer().getId(),
                "NO_SHOW",
                thirtyDaysAgo
        );
        int penaltyPoints = previousNoShows == 0 ? 50 : 100;
        int appliedPoints = loyaltyService.postBonusTransaction(booking.getCustomer().getId(), -penaltyPoints, "No-show penalty");
        violationRecordRepository.save(new ViolationRecord(
                booking.getCustomer(),
                booking,
                "NO_SHOW",
                penaltyPoints,
                "Customer did not check in within " + noShowGraceMinutes + " minutes"
        ));
        return Math.abs(appliedPoints);
    }

    private void cancelNotCheckedInSessions(Booking booking, Instant cancelledAt) {
        List<WashSession> sessions = washSessionRepository.findByBooking_IdAndStatusIn(
                booking.getId(),
                NOT_CHECKED_IN_SESSION_STATUSES
        );
        for (WashSession session : sessions) {
            WashSessionLifecycle.validateTransition(session.getStatus(), WashSessionStatus.CANCELLED);
            session.cancel(cancelledAt, "Booking marked NO_SHOW before check-in", null);
        }
    }
}
