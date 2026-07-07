package com.autowash.job;

import com.autowash.entity.Booking;
import com.autowash.entity.ViolationRecord;
import com.autowash.entity.enums.BookingStatus;
import com.autowash.entity.enums.WashSessionStatus;
import com.autowash.repository.BookingRepository;
import com.autowash.repository.SystemSettingsRepository;
import com.autowash.repository.ViolationRecordRepository;
import com.autowash.service.LoyaltyService;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class NoShowDetectionJob {

    private static final Logger LOGGER = LoggerFactory.getLogger(NoShowDetectionJob.class);

    private final BookingRepository bookingRepository;
    private final ViolationRecordRepository violationRecordRepository;
    private final LoyaltyService loyaltyService;
    private final SystemSettingsRepository systemSettingsRepository;

    public NoShowDetectionJob(BookingRepository bookingRepository, ViolationRecordRepository violationRecordRepository, LoyaltyService loyaltyService, SystemSettingsRepository systemSettingsRepository) {
        this.bookingRepository = bookingRepository;
        this.violationRecordRepository = violationRecordRepository;
        this.loyaltyService = loyaltyService;
        this.systemSettingsRepository = systemSettingsRepository;
    }

    @Scheduled(fixedRate = 300000) // Every 5 minutes
    @Transactional
    public void detectNoShows() {
        int graceMinutes = systemSettingsRepository.findById(1)
                .map(settings -> settings.getNoShowGraceMinutes())
                .orElse(15);

        Instant cutoff = Instant.now().minus(graceMinutes, ChronoUnit.MINUTES);

        List<Booking> candidates = bookingRepository.findNoShowCandidates(
                BookingStatus.CONFIRMED,
                cutoff,
                Set.of(WashSessionStatus.CHECKED_IN, WashSessionStatus.IN_PROGRESS, WashSessionStatus.COMPLETED)
        );

        if (candidates.isEmpty()) {
            return;
        }

        LOGGER.info("Found {} no-show candidates", candidates.size());

        for (Booking booking : candidates) {
            booking.markNoShow();

            Instant thirtyDaysAgo = Instant.now().minus(30, ChronoUnit.DAYS);
            long previousNoShows = violationRecordRepository.countByCustomer_IdAndTypeAndCreatedAtAfter(
                    booking.getCustomer().getId(),
                    "NO_SHOW",
                    thirtyDaysAgo
            );

            int penaltyPoints = (previousNoShows == 0) ? 50 : 100;

            loyaltyService.postBonusTransaction(
                    booking.getCustomer().getId(),
                    -penaltyPoints,
                    "No-show penalty"
            );

            violationRecordRepository.save(new ViolationRecord(
                    booking.getCustomer(),
                    booking,
                    "NO_SHOW",
                    penaltyPoints,
                    "No show detected by system"
            ));
        }
    }
}
