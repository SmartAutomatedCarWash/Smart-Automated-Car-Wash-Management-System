package com.autowash.service;

import com.autowash.dto.DiscountRequest;
import com.autowash.dto.DiscountResponse;
import com.autowash.dto.UserDiscountResponse;
import com.autowash.entity.enums.DiscountKind;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.UUID;

public interface DiscountService {
    DiscountResponse createDiscount(DiscountRequest request);
    DiscountResponse getDiscount(UUID id);
    Page<DiscountResponse> getDiscounts(DiscountKind type, Pageable pageable);
    DiscountResponse updateDiscount(UUID id, DiscountRequest request);
    void deleteDiscount(UUID id);
    
    Page<DiscountResponse> getActiveDiscounts(Pageable pageable);
    
    UserDiscountResponse claimDiscount(UUID userId, UUID discountId);
    
    Page<UserDiscountResponse> getUserDiscounts(UUID userId, Pageable pageable);

    UserDiscountResponse getUserDiscount(UUID userId, UUID userDiscountId);
}
