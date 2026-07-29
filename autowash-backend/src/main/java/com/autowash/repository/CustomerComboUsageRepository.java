package com.autowash.repository;


import com.autowash.entity.CustomerComboUsage;
import com.autowash.entity.enums.CustomerComboUsageStatus;
import java.util.Collection;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerComboUsageRepository extends JpaRepository<CustomerComboUsage, Long> {
    Optional<CustomerComboUsage> findFirstByCustomerComboIdOrderByUsedAtDesc(UUID customerComboId);

    Optional<CustomerComboUsage> findFirstByCustomerComboIdAndStatusInOrderByUsedAtDesc(UUID customerComboId, Collection<CustomerComboUsageStatus> statuses);

    Optional<CustomerComboUsage> findByBookingId(UUID bookingId);

    boolean existsByBookingId(UUID bookingId);
}
