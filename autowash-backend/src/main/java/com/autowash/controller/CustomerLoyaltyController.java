package com.autowash.controller;

import com.autowash.dto.LoyaltyAccountResponse;
import com.autowash.dto.LoyaltyTransactionResponse;
import com.autowash.dto.WashHistoryItemResponse;
import com.autowash.service.CustomerLoyaltyService;
import com.autowash.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@Tag(name = "Customer Loyalty")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('CUSTOMER')")
public class CustomerLoyaltyController {

    private final CustomerLoyaltyService customerLoyaltyService;

    public CustomerLoyaltyController(CustomerLoyaltyService customerLoyaltyService) {
        this.customerLoyaltyService = customerLoyaltyService;
    }

    @GetMapping("/api/v1/loyalty/account")
    @Operation(summary = "Get current customer's loyalty account")
    public ApiResponse<LoyaltyAccountResponse> getAccount() {
        return ApiResponse.ok("Loyalty account retrieved", customerLoyaltyService.getAccount());
    }

    @GetMapping("/api/v1/loyalty/transactions")
    @Operation(summary = "List current customer's loyalty transactions")
    public ApiResponse<List<LoyaltyTransactionResponse>> listTransactions(
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit
    ) {
        CustomerLoyaltyService.LoyaltyTransactionPage transactionPage = customerLoyaltyService.listTransactions(page, limit);
        return ApiResponse.ok("Loyalty transactions retrieved", transactionPage.items(), transactionPage.pagination());
    }

    @GetMapping("/api/v1/customers/wash-history")
    @Operation(summary = "List current customer's completed wash history")
    public ApiResponse<List<WashHistoryItemResponse>> listWashHistory(
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit
    ) {
        CustomerLoyaltyService.WashHistoryPage historyPage = customerLoyaltyService.listWashHistory(page, limit);
        return ApiResponse.ok("Wash history retrieved", historyPage.items(), historyPage.pagination());
    }
}
