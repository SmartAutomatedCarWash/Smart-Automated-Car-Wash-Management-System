package com.autowash.job;

import com.autowash.entity.Notification;
import com.autowash.entity.User;
import com.autowash.entity.UserVoucher;
import com.autowash.entity.VoucherTemplate;
import com.autowash.entity.enums.UserVoucherStatus;
import com.autowash.repository.NotificationRepository;
import com.autowash.repository.UserVoucherRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class VoucherExpiryNotificationJob {

    private static final Logger log = LoggerFactory.getLogger(VoucherExpiryNotificationJob.class);

    private final UserVoucherRepository userVoucherRepository;
    private final NotificationRepository notificationRepository;

    public VoucherExpiryNotificationJob(
            UserVoucherRepository userVoucherRepository,
            NotificationRepository notificationRepository
    ) {
        this.userVoucherRepository = userVoucherRepository;
        this.notificationRepository = notificationRepository;
    }

    @Scheduled(cron = "0 0 8 * * *") // Run at 8:00 AM every day
    public void notifyExpiringVouchers() {
        Instant now = Instant.now();
        Instant threeDaysLater = now.plus(3, ChronoUnit.DAYS);

        List<UserVoucher> expiringVouchers = userVoucherRepository.findByStatusAndExpiredAtBetween(UserVoucherStatus.AVAILABLE, now, threeDaysLater);
        
        log.info("Found {} vouchers expiring in the next 3 days", expiringVouchers.size());

        for (UserVoucher userVoucher : expiringVouchers) {
            sendNotification(userVoucher.getUser(), userVoucher);
        }
    }

    private void sendNotification(User user, UserVoucher userVoucher) {
        VoucherTemplate voucher = userVoucher.getVoucherTemplate();
        Notification notification = Notification.builder()
                .id(UUID.randomUUID())
                .user(user)
                .title("Voucher sắp hết hạn!")
                .message("Voucher " + voucher.getCode() + " (" + voucher.getName() + ") của bạn sẽ hết hạn vào " + voucher.getEndAt() + ". Hãy sử dụng ngay!")
                .type("VOUCHER_EXPIRY")
                .read(false)
                .createdAt(Instant.now())
                .build();
        notificationRepository.save(notification);
        log.info("Sent expiry notification to user {} for voucher {}", user.getId(), voucher.getCode());
    }
}
