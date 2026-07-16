package com.autowash.repository;

import com.autowash.entity.Promotion;
import com.autowash.entity.enums.ActiveStatus;
import com.autowash.entity.enums.PromotionTargetingMode;
import java.time.Instant;
import java.util.Collection;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PromotionRepository extends JpaRepository<Promotion, UUID> {

    Page<Promotion> findAllByOrderByCreatedAtDesc(Pageable pageable);

    java.util.Optional<Promotion> findByName(String name);

    long countByStatus(ActiveStatus status);

    @Query("""
            select p from Promotion p
            where p.status = :status
              and p.startAt <= :now
              and p.endAt >= :now
              and (
                    p.targetingMode = :allTiers
                    or exists (
                        select 1 from PromotionTier pt
                        where pt.promotionId = p.id
                          and pt.tier in :tiers
                    )
              )
            order by p.endAt asc, p.createdAt desc
            """)
    Page<Promotion> findActiveForTier(
            @Param("now") Instant now,
            @Param("tiers") Collection<String> tiers,
            @Param("status") ActiveStatus status,
            @Param("allTiers") PromotionTargetingMode allTiers,
            Pageable pageable
    );
}
