package com.autowash.job;

import com.autowash.entity.UserVoucher;
import com.autowash.entity.enums.UserVoucherStatus;
import com.autowash.repository.UserVoucherRepository;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class VoucherExpirationJob {

    private static final Logger LOGGER = LoggerFactory.getLogger(VoucherExpirationJob.class);

    private final UserVoucherRepository userVoucherRepository;

    public VoucherExpirationJob(UserVoucherRepository userVoucherRepository) {
        this.userVoucherRepository = userVoucherRepository;
    }

    @Scheduled(cron = "0 0 * * * *") // Run every hour
    @Transactional
    public void expireVouchers() {
        LOGGER.info("Starting voucher expiration job...");
        
        List<UserVoucher> expiredVouchers = userVoucherRepository.findByStatusAndExpiredAtBefore(
                UserVoucherStatus.AVAILABLE,
                Instant.now()
        );
        
        for (UserVoucher voucher : expiredVouchers) {
            voucher.expire();
        }
        
        userVoucherRepository.saveAll(expiredVouchers);
        LOGGER.info("Expired {} vouchers.", expiredVouchers.size());
    }
}
