package com.autowash.service;

import com.autowash.dto.AdjustTotalEarnedPointsResponse;
import com.autowash.dto.EarnPointsResponse;
import com.autowash.dto.LoyaltyAccountResponse;
import com.autowash.dto.PointTransactionResponse;
import com.autowash.dto.RedeemPointsResponse;
import com.autowash.shared.dto.PaginationMeta;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
public interface LoyaltyService {
    LoyaltyAccountResponse getAccount(UUID customerId);
    int calculateEarnPoints(UUID sessionId);
    EarnPointsResponse postEarnTransaction(UUID customerId, UUID sessionId);
    int postBonusTransaction(UUID customerId, int points, String reason);
    int postBonusTransaction(UUID customerId, UUID bookingId, int points, String reason);
    void adjustActivePoints(UUID customerId, int points, String reason);
    AdjustTotalEarnedPointsResponse adjustTotalEarnedPoints(UUID customerId, int pointsDelta, String reason);
    RedeemPointsResponse redeemOffer(UUID customerId, UUID offerId);

    TransactionPage getTransactionHistory(UUID customerId, String type, Instant dateFrom, Instant dateTo, int page, int limit);
    TransactionPage getCustomerTransactionHistory(UUID customerId, int page, int limit);

    void updateCustomerTierByAdmin(UUID customerId, String newTier);

    record TransactionPage(List<PointTransactionResponse> items, PaginationMeta pagination) {}
}
