package com.autowash.service;

import com.autowash.dto.AdminDashboardFullResponse;

/**
 * Service tổng hợp toàn bộ dữ liệu cho admin dashboard overview.
 */
public interface AdminDashboardFullService {
    AdminDashboardFullResponse getDashboardFull();
    AdminDashboardFullResponse getDashboardFull(
            int noShowPage,
            int recentBookingPage,
            int voucherUsagePage,
            int pointRedemptionPage,
            int limit
    );
}
