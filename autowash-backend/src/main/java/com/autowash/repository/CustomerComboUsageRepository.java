package com.autowash.repository;

import com.autowash.entity.CustomerComboUsage;
import com.autowash.entity.enums.CustomerComboUsageStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerComboUsageRepository extends JpaRepository<CustomerComboUsage, Long> {
    Optional<CustomerComboUsage> findFirstByCustomerComboIdOrderByUsedAtDesc(UUID customerComboId);

    Optional<CustomerComboUsage> findFirstByCustomerComboIdAndStatusInOrderByUsedAtDesc(
            UUID customerComboId,
            Collection<CustomerComboUsageStatus> statuses
    );

    @EntityGraph(attributePaths = {"booking", "booking.vehicle"})
    List<CustomerComboUsage> findByCustomerComboIdOrderByUsedAtDesc(UUID customerComboId);

    Optional<CustomerComboUsage> findByBookingId(UUID bookingId);

    boolean existsByBookingId(UUID bookingId);
}
