package com.autowash.job;

import com.autowash.entity.Payment;
import com.autowash.entity.enums.BookingStatus;
import com.autowash.entity.enums.PaymentStatus;
import com.autowash.repository.PaymentRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class PendingOnlinePaymentCleanupJob {

    private static final Logger LOGGER = LoggerFactory.getLogger(PendingOnlinePaymentCleanupJob.class);
    private static final Duration PENDING_BOOKING_HOLD_DURATION = Duration.ofMinutes(15);
    private static final List<PaymentStatus> EXPIRABLE_PAYMENT_STATUSES = List.of(
            PaymentStatus.UNPAID,
            PaymentStatus.PENDING,
            PaymentStatus.PENDING_PAYMENT,
            PaymentStatus.FAILED,
            PaymentStatus.CANCELLED
    );

    private final PaymentRepository paymentRepository;

    public PendingOnlinePaymentCleanupJob(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    @Scheduled(fixedRate = 60000)
    @Transactional
    public void cancelExpiredPendingBookingHolds() {
        Instant cutoff = Instant.now().minus(PENDING_BOOKING_HOLD_DURATION);
        List<Payment> expiredPayments = paymentRepository.findExpiredPendingBookingPayments(
                BookingStatus.PENDING,
                cutoff,
                EXPIRABLE_PAYMENT_STATUSES
        );

        expiredPayments.forEach(payment -> {
            payment.markCancelled();
            payment.getBooking().cancel("Online payment window expired");
        });

        if (!expiredPayments.isEmpty()) {
            LOGGER.info("Cancelled {} expired pending booking holds", expiredPayments.size());
        }
    }
}
