package com.autowash.dto;

/**
 * DTO trả về các chỉ số vận hành tổng quan cho admin dashboard.
 */
public record DashboardMetricsDto(
        long totalBookings,
        long totalRevenue,
        long totalCustomers,
        long activeDiscounts
) {}
