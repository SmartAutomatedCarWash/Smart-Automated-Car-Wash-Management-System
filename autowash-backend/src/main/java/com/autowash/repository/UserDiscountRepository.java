package com.autowash.repository;

import com.autowash.entity.UserDiscount;
import com.autowash.entity.enums.UserDiscountStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserDiscountRepository extends JpaRepository<UserDiscount, UUID> {
    Page<UserDiscount> findByUserId(UUID userId, Pageable pageable);
    
    List<UserDiscount> findByUserIdAndStatus(UUID userId, UserDiscountStatus status);
    
    List<UserDiscount> findByStatusAndExpiresAtBefore(UserDiscountStatus status, Instant expiresAt);
    
    List<UserDiscount> findByStatusAndExpiresAtBetween(UserDiscountStatus status, Instant start, Instant end);

    java.util.Optional<UserDiscount> findByUsedInBookingId(UUID bookingId);
    
    long countByStatus(UserDiscountStatus status);
}
