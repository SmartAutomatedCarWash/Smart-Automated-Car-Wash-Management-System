package com.autowash.repository;

import com.autowash.entity.TierVoucherOffer;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import org.springframework.stereotype.Repository;

@Repository
public interface TierVoucherOfferRepository extends JpaRepository<TierVoucherOffer, UUID> {

    @EntityGraph(attributePaths = {"discount", "minTier"})
    @Query("select offer from TierVoucherOffer offer")
    List<TierVoucherOffer> findAllWithDiscountAndMinTier();
}
