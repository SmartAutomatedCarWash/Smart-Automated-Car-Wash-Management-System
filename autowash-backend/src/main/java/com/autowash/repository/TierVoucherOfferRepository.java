package com.autowash.repository;

import com.autowash.entity.TierVoucherOffer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TierVoucherOfferRepository extends JpaRepository<TierVoucherOffer, String> {
}
