package com.autowash.repository;

import com.autowash.entity.DiscountApplicableService;
import com.autowash.entity.DiscountApplicableServiceId;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DiscountApplicableServiceRepository extends JpaRepository<DiscountApplicableService, DiscountApplicableServiceId> {
    List<DiscountApplicableService> findByDiscountId(UUID discountId);
    void deleteByDiscountId(UUID discountId);
}
