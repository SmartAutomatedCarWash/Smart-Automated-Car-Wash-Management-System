package com.autowash.service.impl;

import com.autowash.dto.DashboardMetricsDto;
import com.autowash.entity.enums.UserRole;
import com.autowash.repository.UserRepository;
import com.autowash.entity.enums.BookingStatus;
import com.autowash.repository.BookingRepository;
import com.autowash.entity.enums.ActiveStatus;
import com.autowash.repository.DiscountRepository;
import com.autowash.service.AdminDashboardMetricsService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service tổng hợp các chỉ số vận hành cho admin dashboard.
 */
@Service
public class AdminDashboardMetricsServiceImpl implements AdminDashboardMetricsService {

    private final BookingRepository bookingRepository;
    private final DiscountRepository discountRepository;
    private final UserRepository userRepository;

    public AdminDashboardMetricsServiceImpl(
            BookingRepository bookingRepository,
            DiscountRepository discountRepository,
            UserRepository userRepository
    ) {
        this.bookingRepository = bookingRepository;
        this.discountRepository = discountRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public DashboardMetricsDto getMetrics() {
        long totalBookings = bookingRepository.count();
        long totalRevenue = bookingRepository.sumFinalAmountByStatus(BookingStatus.CONFIRMED);
        long totalCustomers = userRepository.countByRole(UserRole.CUSTOMER);
        long activeDiscounts = discountRepository.countByStatus(ActiveStatus.ACTIVE);

        return new DashboardMetricsDto(
                totalBookings,
                totalRevenue,
                totalCustomers,
                activeDiscounts
        );
    }
}
