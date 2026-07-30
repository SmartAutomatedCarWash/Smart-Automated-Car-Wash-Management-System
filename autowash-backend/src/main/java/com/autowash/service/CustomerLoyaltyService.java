package com.autowash.service;

import com.autowash.dto.LoyaltyAccountResponse;
import com.autowash.dto.BookingPointBreakdownResponse;
import com.autowash.dto.LoyaltyTransactionResponse;
import com.autowash.dto.WashHistoryItemResponse;
import com.autowash.entity.User;
import com.autowash.shared.dto.PaginationMeta;
import java.util.List;

public interface CustomerLoyaltyService {
    LoyaltyAccountResponse getAccount();
    LoyaltyTransactionPage listTransactions(int page, int limit);
    BookingPointBreakdownResponse getBookingPointBreakdown(String bookingId);
    WashHistoryPage listWashHistory(int page, int limit);
    int getCurrentBalance(User user);

    record LoyaltyTransactionPage(List<LoyaltyTransactionResponse> items, PaginationMeta pagination) {}
    record WashHistoryPage(List<WashHistoryItemResponse> items, PaginationMeta pagination) {}
}

