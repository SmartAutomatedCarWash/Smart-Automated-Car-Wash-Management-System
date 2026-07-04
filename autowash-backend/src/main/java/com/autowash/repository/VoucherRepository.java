package com.autowash.repository;

import com.autowash.entity.Voucher;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface VoucherRepository extends JpaRepository<Voucher, UUID> {
    Optional<Voucher> findByCode(String code);
    boolean existsByCode(String code);
    List<Voucher> findByStatusAndEndAtAfterOrderByEndAtAsc(com.autowash.entity.enums.ActiveStatus status, Instant instant);

    default List<Voucher> findByActiveTrueAndExpiresAtAfterOrderByExpiresAtAsc(Instant instant) {
        return findByStatusAndEndAtAfterOrderByEndAtAsc(com.autowash.entity.enums.ActiveStatus.ACTIVE, instant);
    }

    @Query("""
            select v from Voucher v
            where v.status = :status
              and v.startAt <= :now
              and v.endAt >= :now
              and (
                  not exists (
                      select 1 from VoucherTier vt
                      where vt.voucherId = v.id
                  )
                  or exists (
                      select 1 from VoucherTier vt
                      where vt.voucherId = v.id
                        and vt.tier in :tiers
                  )
              )
            order by v.endAt asc
            """)
    org.springframework.data.domain.Page<Voucher> findActiveForTier(
            @org.springframework.data.repository.query.Param("now") Instant now,
            @org.springframework.data.repository.query.Param("tiers") Collection<String> tiers,
            @org.springframework.data.repository.query.Param("status") com.autowash.entity.enums.ActiveStatus status,
            org.springframework.data.domain.Pageable pageable
    );
}
