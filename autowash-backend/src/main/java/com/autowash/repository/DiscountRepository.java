package com.autowash.repository;

import org.springframework.data.jpa.repository.Lock;

import jakarta.persistence.LockModeType;

import com.autowash.entity.Discount;
import com.autowash.entity.enums.ActiveStatus;
import com.autowash.entity.enums.DiscountKind;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface DiscountRepository extends JpaRepository<Discount, UUID> {
    
    Optional<Discount> findByCodeIgnoreCase(String code);
    
    Page<Discount> findByType(DiscountKind type, Pageable pageable);
    
    Page<Discount> findByStatus(ActiveStatus status, Pageable pageable);
    long countByStatus(ActiveStatus status);
    
    @Query("SELECT d FROM Discount d WHERE d.status = :status AND d.startAt <= :now AND d.endAt >= :now")
    Page<Discount> findActiveDiscounts(@Param("status") ActiveStatus status, @Param("now") Instant now, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM Discount d WHERE d.id = :id")
    Optional<Discount> findByIdWithLock(@Param("id") UUID id);
}
