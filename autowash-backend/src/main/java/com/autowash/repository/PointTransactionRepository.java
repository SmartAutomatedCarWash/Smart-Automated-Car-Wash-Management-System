package com.autowash.repository;

import com.autowash.entity.User;
import com.autowash.entity.PointTransaction;
import com.autowash.entity.enums.PointTransactionType;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PointTransactionRepository extends JpaRepository<PointTransaction, Long> {

    @Query("select pt from PointTransaction pt where pt.loyaltyAccount.customer = :customer")
    Page<PointTransaction> findByCustomer(@Param("customer") User customer, Pageable pageable);

    Optional<PointTransaction> findByTypeAndBookingId(PointTransactionType type, UUID bookingId);

    Optional<PointTransaction> findByTypeAndBookingIdAndReason(PointTransactionType type, UUID bookingId, String reason);

    Optional<PointTransaction> findByReasonContaining(String reasonPart);

    long countByTypeAndBookingId(PointTransactionType type, UUID bookingId);

    default Optional<PointTransaction> findByTypeAndReferenceId(PointTransactionType type, String referenceId) {
        return parseUuid(referenceId).flatMap(bookingId -> findByTypeAndBookingId(type, bookingId));
    }

    default long countByTypeAndReferenceId(PointTransactionType type, String referenceId) {
        return parseUuid(referenceId).map(bookingId -> countByTypeAndBookingId(type, bookingId)).orElse(0L);
    }

    @Query("""
            select pt from PointTransaction pt
            where pt.loyaltyAccount.customer = :customer
              and (:#{#type == null} = true or pt.type = :type)
              and (:#{#dateFrom == null} = true or pt.createdAt >= :dateFrom)
              and (:#{#dateTo == null} = true or pt.createdAt <= :dateTo)
            """)
    Page<PointTransaction> search(
            @Param("customer") User customer,
            @Param("type") PointTransactionType type,
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            Pageable pageable
    );

    @Query("select coalesce(sum(pt.points), 0) from PointTransaction pt where pt.loyaltyAccount.customer = :customer and pt.type = :type")
    long sumPointsByCustomerAndType(@Param("customer") User customer, @Param("type") PointTransactionType type);

    @Query("""
            select pt from PointTransaction pt
            where pt.type = :type
              and (:#{#searchQuery == null} = true or lower(cast(pt.booking.id as string)) like :searchQuery
                   or lower(pt.loyaltyAccount.customer.fullName) like :searchQuery
                   or lower(pt.loyaltyAccount.customer.phone) like :searchQuery
                   or lower(pt.loyaltyAccount.customer.email) like :searchQuery
                   or lower(pt.reason) like :searchQuery)
              and (:#{#dateFrom == null} = true or pt.createdAt >= :dateFrom)
              and (:#{#dateTo == null} = true or pt.createdAt <= :dateTo)
            """)
    Page<PointTransaction> searchAdminByType(
            @Param("type") PointTransactionType type,
            @Param("searchQuery") String searchQuery,
            @Param("dateFrom") Instant dateFrom,
            @Param("dateTo") Instant dateTo,
            Pageable pageable
    );

    private static Optional<UUID> parseUuid(String id) {
        try {
            return id == null || id.isBlank() ? Optional.empty() : Optional.of(UUID.fromString(id));
        } catch (IllegalArgumentException exception) {
            return Optional.empty();
        }
    }
}
