package com.autowash.repository;

import com.autowash.entity.UserVoucher;
import com.autowash.entity.enums.UserVoucherStatus;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserVoucherRepository extends JpaRepository<UserVoucher, UUID> {

    Page<UserVoucher> findByUserIdAndStatusOrderByIssuedAtDesc(UUID userId, UserVoucherStatus status, Pageable pageable);

    List<UserVoucher> findByUserIdAndStatusAndExpiredAtAfter(UUID userId, UserVoucherStatus status, Instant now);

    Optional<UserVoucher> findByBookingId(UUID bookingId);

    int countByUserIdAndVoucherTemplateId(UUID userId, UUID voucherTemplateId);
    
    List<UserVoucher> findByStatusAndExpiredAtBefore(UserVoucherStatus status, Instant now);
    
    List<UserVoucher> findByStatusAndExpiredAtBetween(UserVoucherStatus status, Instant start, Instant end);

    long countByStatus(UserVoucherStatus status);
}
