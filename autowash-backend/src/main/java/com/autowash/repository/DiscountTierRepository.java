package com.autowash.repository;

import com.autowash.entity.DiscountTier;
import com.autowash.entity.DiscountTierId;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DiscountTierRepository extends JpaRepository<DiscountTier, DiscountTierId> {
    List<DiscountTier> findByDiscountId(UUID discountId);
    void deleteByDiscountId(UUID discountId);
}
