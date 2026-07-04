package com.autowash.controller;

import com.autowash.dto.AdminAccountResponse;
import com.autowash.dto.AdminBookingResponse;
import com.autowash.dto.AdminCustomerDetailResponse;
import com.autowash.dto.AdminCustomerVehicleResponse;
import com.autowash.dto.AdminTierHistoryResponse;
import com.autowash.dto.AdminWashHistoryResponse;
import com.autowash.dto.PointTransactionResponse;
import com.autowash.dto.UpdateAdminCustomerRoleRequest;
import com.autowash.dto.UpdateAdminCustomerRoleResponse;
import com.autowash.dto.UpdateUserStatusRequest;
import com.autowash.service.AdminReportingService;
import com.autowash.service.LoyaltyService;
import com.autowash.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequestMapping("/api/v1/admin")
@Tag(name = "Admin Customers")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('ADMIN')")
public class AdminCustomerController {

    private final AdminReportingService adminReportingService;

    public AdminCustomerController(AdminReportingService adminReportingService) {
        this.adminReportingService = adminReportingService;
    }

    @GetMapping("/accounts")
    @Operation(summary = "List user accounts for admin with filters")
    public ApiResponse<List<AdminAccountResponse>> listAccounts(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String searchQuery,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit
    ) {
        AdminReportingService.AccountPage accountPage =
                adminReportingService.listAccounts(role, status, searchQuery, page, limit);
        return ApiResponse.ok("Accounts retrieved", accountPage.items(), accountPage.pagination());
    }

    @GetMapping("/accounts/{accountId}")
    @Operation(summary = "Get account detail for admin")
    public ApiResponse<AdminAccountResponse> getAccountDetail(@PathVariable UUID accountId) {
        return ApiResponse.ok("Account retrieved", adminReportingService.getAccountDetail(accountId));
    }

    @GetMapping("/customers/{customerId}")
    @Operation(summary = "Get customer detail for admin")
    public ApiResponse<AdminCustomerDetailResponse> getCustomerDetail(@PathVariable UUID customerId) {
        return ApiResponse.ok("Customer retrieved", adminReportingService.getCustomerDetail(customerId));
    }

    @PutMapping("/customers/{customerId}/status")
    @Operation(summary = "Update customer status for admin")
    public ApiResponse<AdminAccountResponse> updateCustomerStatus(
            @PathVariable UUID customerId,
            @Valid @RequestBody UpdateUserStatusRequest request
    ) {
        return ApiResponse.ok("Customer status updated", adminReportingService.updateCustomerStatus(customerId, request.status()));
    }

    @PutMapping("/customers/{customerId}/role")
    @Operation(summary = "Update customer role for admin")
    public ApiResponse<UpdateAdminCustomerRoleResponse> updateCustomerRole(
            @PathVariable UUID customerId,
            @Valid @RequestBody UpdateAdminCustomerRoleRequest request
    ) {
        return ApiResponse.ok(
                "Customer role updated",
                adminReportingService.updateCustomerRole(customerId, request.role())
        );
    }

    @PutMapping("/customers/{customerId}/tier")
    @Operation(summary = "Update customer loyalty tier for admin")
    public ApiResponse<UpdateAdminCustomerRoleResponse> updateCustomerTier(
            @PathVariable UUID customerId,
            @Valid @RequestBody com.autowash.dto.UpdateAdminCustomerTierRequest request
    ) {
        return ApiResponse.ok(
                "Customer tier updated",
                adminReportingService.updateCustomerTier(customerId, request.tier())
        );
    }

    @GetMapping("/customers/{customerId}/wash-sessions")
    @Operation(summary = "List completed wash sessions for a customer")
    public ApiResponse<List<AdminWashHistoryResponse>> getWashSessions(
            @PathVariable UUID customerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateTo,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit
    ) {
        AdminReportingService.WashHistoryPage historyPage =
                adminReportingService.getWashHistory(customerId, dateFrom, dateTo, page, limit);
        return ApiResponse.ok("Customer wash sessions retrieved", historyPage.items(), historyPage.pagination());
    }

    @GetMapping("/customers/{customerId}/wash-history")
    @Operation(summary = "List completed wash sessions for a customer (alias)")
    public ApiResponse<List<AdminWashHistoryResponse>> getWashHistory(
            @PathVariable UUID customerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateTo,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit
    ) {
        return getWashSessions(customerId, dateFrom, dateTo, page, limit);
    }

    @GetMapping("/customers/{customerId}/vehicles")
    @Operation(summary = "List vehicles for a customer")
    public ApiResponse<List<AdminCustomerVehicleResponse>> getCustomerVehicles(
            @PathVariable UUID customerId,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit
    ) {
        AdminReportingService.CustomerVehiclePage vehiclePage =
                adminReportingService.getCustomerVehicles(customerId, page, limit);
        return ApiResponse.ok("Customer vehicles retrieved", vehiclePage.items(), vehiclePage.pagination());
    }

    @GetMapping("/customers/{customerId}/point-transactions")
    @Operation(summary = "List point transactions for a customer")
    public ApiResponse<List<PointTransactionResponse>> getPointTransactions(
            @PathVariable UUID customerId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateTo,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit
    ) {
        LoyaltyService.TransactionPage transactionPage =
                adminReportingService.getPointHistory(customerId, type, dateFrom, dateTo, page, limit);
        return ApiResponse.ok("Customer point transactions retrieved", transactionPage.items(), transactionPage.pagination());
    }

    @GetMapping("/customers/{customerId}/point-history")
    @Operation(summary = "List point transactions for a customer (alias)")
    public ApiResponse<List<PointTransactionResponse>> getPointHistory(
            @PathVariable UUID customerId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateTo,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit
    ) {
        return getPointTransactions(customerId, type, dateFrom, dateTo, page, limit);
    }

    @GetMapping("/customers/{customerId}/tier-history")
    @Operation(summary = "List loyalty tier history for a customer")
    public ApiResponse<List<AdminTierHistoryResponse>> getTierHistory(
            @PathVariable UUID customerId,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit
    ) {
        AdminReportingService.TierHistoryPage tierHistoryPage =
                adminReportingService.getTierHistory(customerId, page, limit);
        return ApiResponse.ok("Customer tier history retrieved", tierHistoryPage.items(), tierHistoryPage.pagination());
    }

    @GetMapping("/customers/{customerId}/bookings")
    @Operation(summary = "List all bookings for a customer")
    public ApiResponse<List<AdminBookingResponse>> getCustomerBookings(
            @PathVariable UUID customerId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(required = false) String searchQuery,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit
    ) {
        AdminReportingService.BookingPage bookingPage =
                adminReportingService.listBookings(status, dateFrom, dateTo, customerId, searchQuery, page, limit);
        return ApiResponse.ok("Customer bookings retrieved", bookingPage.items(), bookingPage.pagination());
    }
}
