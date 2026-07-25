package com.autowash.repository;

import com.autowash.entity.TierVoucherOffer;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface TierVoucherOfferRepository extends JpaRepository<TierVoucherOffer, UUID> {
    @Query("""
            select offer
            from TierVoucherOffer offer
            join fetch offer.discount discount
            join fetch offer.minTier tier
            where discount.status = com.autowash.entity.enums.ActiveStatus.ACTIVE
            order by tier.rankOrder asc, discount.requiredPoints asc
            """)
    List<TierVoucherOffer> findActiveOffersWithDiscountAndTier();
}
