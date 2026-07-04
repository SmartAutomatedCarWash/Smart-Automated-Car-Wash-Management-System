package com.autowash.service.impl;

import com.autowash.dto.DashboardMetricsDto;
import com.autowash.entity.enums.UserRole;
import com.autowash.repository.UserRepository;
import com.autowash.entity.enums.BookingStatus;
import com.autowash.repository.BookingRepository;
import com.autowash.entity.enums.ActiveStatus;
import com.autowash.repository.PromotionRepository;
import com.autowash.service.AdminDashboardMetricsService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service tổng hợp các chỉ số vận hành cho admin dashboard.
 */
@Service
public class AdminDashboardMetricsServiceImpl implements AdminDashboardMetricsService {

    private final BookingRepository bookingRepository;
    private final PromotionRepository promotionRepository;
    private final UserRepository UserRepository;

    public AdminDashboardMetricsServiceImpl(
            BookingRepository bookingRepository,
            PromotionRepository promotionRepository,
            UserRepository UserRepository
    ) {
        this.bookingRepository = bookingRepository;
        this.promotionRepository = promotionRepository;
        this.UserRepository = UserRepository;
    }

    @Transactional(readOnly = true)
    public DashboardMetricsDto getMetrics() {
        long totalBookings = bookingRepository.count();
        long totalRevenue = bookingRepository.sumFinalAmountByStatus(BookingStatus.CONFIRMED);
        long totalCustomers = UserRepository.countByRole(UserRole.CUSTOMER);
        long activePromotions = promotionRepository.countByStatus(ActiveStatus.ACTIVE);

        return new DashboardMetricsDto(
                totalBookings,
                totalRevenue,
                totalCustomers,
                activePromotions
        );
    }
}
