package com.autowash.repository;

import com.autowash.entity.UserDiscount;
import com.autowash.entity.enums.UserDiscountStatus;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface UserDiscountRepository extends JpaRepository<UserDiscount, UUID> {
    Page<UserDiscount> findByUserId(UUID userId, Pageable pageable);
    
    List<UserDiscount> findByUserIdAndStatus(UUID userId, UserDiscountStatus status);
    
    List<UserDiscount> findByStatusAndExpiresAtBefore(UserDiscountStatus status, Instant expiresAt);
    
    List<UserDiscount> findByStatusAndExpiresAtBetween(UserDiscountStatus status, Instant start, Instant end);

    java.util.Optional<UserDiscount> findByUsedInBookingId(UUID bookingId);

    boolean existsByVoucherCodeIgnoreCase(String voucherCode);

    Optional<UserDiscount> findByUserIdAndVoucherCodeIgnoreCase(UUID userId, String voucherCode);

    @Query("""
            select userDiscount
            from UserDiscount userDiscount
            join fetch userDiscount.discount discount
            where userDiscount.user.id = :userId
              and upper(discount.code) = upper(:code)
            """)
    Optional<UserDiscount> findByUserIdAndDiscountCodeIgnoreCase(
            @Param("userId") UUID userId,
            @Param("code") String code
    );

    @Query(
            value = """
            select userDiscount
            from UserDiscount userDiscount
            join fetch userDiscount.user user
            join fetch userDiscount.discount discount
            order by userDiscount.claimedAt desc
            """,
            countQuery = "select count(userDiscount) from UserDiscount userDiscount"
    )
    Page<UserDiscount> findDashboardVoucherUsage(Pageable pageable);
    
    long countByStatus(UserDiscountStatus status);
}
