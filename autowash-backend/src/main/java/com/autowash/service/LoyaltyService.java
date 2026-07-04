package com.autowash.service;

import com.autowash.dto.EarnPointsResponse;
import com.autowash.dto.LoyaltyAccountResponse;
import com.autowash.dto.RedeemPointsResponse;
import com.autowash.entity.Booking;
import com.autowash.shared.dto.PaginationMeta;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface LoyaltyService {
    LoyaltyAccountResponse getAccount(UUID customerId);
    int calculateEarnPoints(UUID sessionId);
    EarnPointsResponse postEarnTransaction(UUID customerId, UUID sessionId);
    RedeemPointsResponse redeemPoints(UUID customerId, int pointsToRedeem, String referenceId);

    TransactionPage getTransactionHistory(UUID customerId, String type, Instant dateFrom, Instant dateTo, int page, int limit);

    void updateCustomerTierByAdmin(UUID customerId, String newTier);

    record TransactionPage(List<com.autowash.dto.PointTransactionResponse> items, PaginationMeta pagination) {}
}
