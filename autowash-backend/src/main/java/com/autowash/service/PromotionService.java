package com.autowash.service;

import com.autowash.dto.CustomerPromotionResponse;
import com.autowash.dto.PromotionRequest;
import com.autowash.dto.PromotionResponse;
import com.autowash.entity.Promotion;
import com.autowash.entity.User;
import com.autowash.shared.dto.PaginationMeta;
import java.util.List;

public interface PromotionService {
    PromotionResponse create(PromotionRequest request);
    PromotionResponse getById(String promotionId);
    PromotionPage listAdmin(int page, int limit);
    PromotionResponse update(String promotionId, PromotionRequest request);
    PromotionResponse delete(String promotionId);
    PromotionPage listActiveForCurrentCustomer(int page, int limit);
    List<Promotion> listActiveForCustomer(User customer);
    List<CustomerPromotionResponse> listActiveLegacyForCurrentCustomer();
    java.util.Optional<Promotion> getActivePromotionByNameForCustomer(String name, User customer);

    record PromotionPage(List<PromotionResponse> items, PaginationMeta pagination) {
    }
}
