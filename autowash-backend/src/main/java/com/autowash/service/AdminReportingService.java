package com.autowash.service;

import com.autowash.dto.AdjustTotalEarnedPointsResponse;
import com.autowash.dto.UpdateAdminCustomerRoleResponse;

import com.autowash.dto.BookingDetailResponse;

import com.autowash.dto.StaffKpiItem;

import com.autowash.dto.AdminBookingResponse;
import com.autowash.dto.AdminBookingSummaryResponse;
import com.autowash.dto.AdminBusinessHealthReportResponse;
import com.autowash.dto.AdminAccountResponse;
import com.autowash.dto.AdminCustomerDetailResponse;
import com.autowash.dto.AdminCustomerVehicleResponse;
import com.autowash.dto.AdminOperationsDashboardResponse;
import com.autowash.dto.AdminStaffWorkloadResponse;
import com.autowash.dto.CreateAdminStaffRequest;
import com.autowash.dto.UpdateAdminStaffRequest;
import com.autowash.dto.AdminTierHistoryResponse;
import com.autowash.dto.AdminWashHistoryResponse;
import com.autowash.shared.dto.PaginationMeta;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface AdminReportingService {
    AdminAccountResponse createStaff(CreateAdminStaffRequest request);
    AdminAccountResponse updateStaff(UUID staffId, UpdateAdminStaffRequest request);
    List<AdminAccountResponse> listStaff();
    AdminAccountResponse updateStaffStatus(UUID staffId, String status);
    AdminAccountResponse deleteStaff(UUID staffId);
    AdminStaffWorkloadResponse getStaffWorkload(UUID staffId);
    List<StaffKpiItem> listStaffKpi(String range);
    AdminAccountResponse updateCustomerStatus(UUID customerId, String status);
    AdminOperationsDashboardResponse getOperationsDashboard();
    AccountPage listAccounts(String role, String status, String searchQuery, int page, int limit);
    AdminAccountResponse getAccountDetail(UUID accountId);
    AdminBusinessHealthReportResponse getBusinessHealthReport(String range, String analysisGroup, LocalDate customDateFrom, LocalDate customDateTo);
    BookingPage listBookings(String status, LocalDate dateFrom, LocalDate dateTo, UUID customerId, String searchQuery, int page, int limit);
    AdminBookingSummaryResponse getBookingSummary();
    BookingDetailResponse getBookingDetail(String bookingId);
    AdminCustomerDetailResponse getCustomerDetail(UUID customerId);
    UpdateAdminCustomerRoleResponse updateCustomerRole(UUID customerId, String role);
    UpdateAdminCustomerRoleResponse updateCustomerTier(UUID customerId, String tier);
    void adjustActivePoints(UUID customerId, int points, String reason);
    AdjustTotalEarnedPointsResponse adjustTotalEarnedPoints(UUID customerId, int pointsDelta, String reason);
    WashHistoryPage getWashHistory(UUID customerId, Instant dateFrom, Instant dateTo, int page, int limit);
    LoyaltyService.TransactionPage getPointHistory(UUID customerId, String type, Instant dateFrom, Instant dateTo, int page, int limit);
    CustomerVehiclePage getCustomerVehicles(UUID customerId, int page, int limit);
    TierHistoryPage getTierHistory(UUID customerId, int page, int limit);
    com.autowash.dto.AdminVehicleDetailResponse getVehicleDetail(String vehicleId);

    record BookingPage(List<AdminBookingResponse> items, PaginationMeta pagination) {}
    record AccountPage(List<AdminAccountResponse> items, PaginationMeta pagination) {}
    record WashHistoryPage(List<AdminWashHistoryResponse> items, PaginationMeta pagination) {}
    record CustomerVehiclePage(List<AdminCustomerVehicleResponse> items, PaginationMeta pagination) {}
    record TierHistoryPage(List<AdminTierHistoryResponse> items, PaginationMeta pagination) {}
}
