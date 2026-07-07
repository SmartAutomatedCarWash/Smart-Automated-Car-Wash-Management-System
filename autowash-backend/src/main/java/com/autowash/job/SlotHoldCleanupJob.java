package com.autowash.job;

import com.autowash.repository.SlotHoldRepository;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class SlotHoldCleanupJob {

    private static final Logger LOGGER = LoggerFactory.getLogger(SlotHoldCleanupJob.class);

    private final SlotHoldRepository slotHoldRepository;

    public SlotHoldCleanupJob(SlotHoldRepository slotHoldRepository) {
        this.slotHoldRepository = slotHoldRepository;
    }

    @Scheduled(fixedRate = 60000) // Run every minute
    @Transactional
    public void cleanupExpiredHolds() {
        Instant now = Instant.now();
        int deletedCount = slotHoldRepository.deleteExpiredHolds(now);
        if (deletedCount > 0) {
            LOGGER.info("Cleaned up {} expired slot holds", deletedCount);
        }
    }
}
