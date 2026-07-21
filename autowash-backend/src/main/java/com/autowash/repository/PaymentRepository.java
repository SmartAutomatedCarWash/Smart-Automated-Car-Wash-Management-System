package com.autowash.repository;

import com.autowash.entity.Booking;
import com.autowash.entity.Payment;
import com.autowash.entity.enums.BookingStatus;
import com.autowash.entity.enums.PaymentMethod;
import com.autowash.entity.enums.PaymentStatus;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    Optional<Payment> findByBooking(Booking booking);
    Optional<Payment> findByBookingId(UUID bookingId);
    Optional<Payment> findFirstByBookingOrderByCreatedAtDesc(Booking booking);
    Optional<Payment> findFirstByBookingIdOrderByCreatedAtDesc(UUID bookingId);

    @Query("""
            select payment from Payment payment
            join fetch payment.booking booking
            where booking.status = :bookingStatus
              and booking.createdAt <= :createdBefore
              and payment.method = :paymentMethod
              and payment.status in :paymentStatuses
            """)
    List<Payment> findExpiredPendingOnlinePayments(
            @Param("bookingStatus") BookingStatus bookingStatus,
            @Param("createdBefore") Instant createdBefore,
            @Param("paymentMethod") PaymentMethod paymentMethod,
            @Param("paymentStatuses") Collection<PaymentStatus> paymentStatuses
    );

    @Query(value = """
            select
                method as "method",
                status as "status",
                transaction_ref as "transactionRef",
                paid_at as "paidAt"
            from payments
            where booking_id = :bookingId
            order by created_at desc, id desc
            limit 1
            """, nativeQuery = true)
    Optional<PaymentSummary> findLatestSummaryByBookingId(@Param("bookingId") UUID bookingId);

    interface PaymentSummary {
        String getMethod();
        String getStatus();
        String getTransactionRef();
        Instant getPaidAt();
    }
}
