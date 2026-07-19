package com.autowash.repository;

import com.autowash.entity.TierVoucherOffer;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TierVoucherOfferRepository extends JpaRepository<TierVoucherOffer, UUID> {
}
