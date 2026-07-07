package com.autowash.repository;

import com.autowash.entity.ViolationRecord;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ViolationRecordRepository extends JpaRepository<ViolationRecord, UUID> {
    long countByCustomer_IdAndTypeAndCreatedAtAfter(UUID customerId, String type, Instant after);
}
