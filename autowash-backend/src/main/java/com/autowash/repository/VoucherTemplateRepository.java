package com.autowash.repository;

import com.autowash.entity.VoucherTemplate;
import com.autowash.entity.enums.ActiveStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VoucherTemplateRepository extends JpaRepository<VoucherTemplate, UUID> {
    
    Optional<VoucherTemplate> findByCode(String code);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT v FROM VoucherTemplate v WHERE v.id = :id")
    Optional<VoucherTemplate> findLockedById(@Param("id") UUID id);

    @Query("SELECT v FROM VoucherTemplate v WHERE v.status = :status AND v.startAt <= CURRENT_TIMESTAMP AND v.endAt >= CURRENT_TIMESTAMP")
    List<VoucherTemplate> findActiveVouchers(@Param("status") ActiveStatus status);

    @Query("SELECT v FROM VoucherTemplate v JOIN VoucherTier vt ON v.id = vt.voucherId WHERE v.status = 'ACTIVE' AND vt.tier = :tier AND v.startAt <= CURRENT_TIMESTAMP AND v.endAt >= CURRENT_TIMESTAMP")
    List<VoucherTemplate> findActiveVouchersForTier(@Param("tier") String tier);
}
