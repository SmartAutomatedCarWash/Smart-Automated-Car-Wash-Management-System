package com.autowash.admin;


import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.autowash.entity.enums.UserRole;
import com.autowash.repository.UserRepository;
import com.autowash.entity.enums.BookingStatus;
import com.autowash.repository.BookingRepository;
import com.autowash.entity.enums.ActiveStatus;
import com.autowash.repository.PromotionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminDashboardMetricsControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private BookingRepository BookingRepository;

    @Autowired
    private UserRepository UserRepository;

    @Autowired
    private PromotionRepository promotionRepository;

    @Test
    void adminCanReadDashboardMetricsFromRealRepositories() throws Exception {
        long expectedTotalBookings = BookingRepository.count();
        long expectedTotalRevenue = BookingRepository.sumFinalAmountByStatus(BookingStatus.CONFIRMED);
        long expectedTotalCustomers = UserRepository.countByRole(UserRole.CUSTOMER);
        long expectedActivePromotions = promotionRepository.countByStatus(ActiveStatus.ACTIVE);

        mockMvc.perform(get("/api/v1/admin/dashboard/metrics")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalBookings").value(expectedTotalBookings))
                .andExpect(jsonPath("$.data.totalRevenue").value(expectedTotalRevenue))
                .andExpect(jsonPath("$.data.totalCustomers").value(expectedTotalCustomers))
                .andExpect(jsonPath("$.data.activePromotions").value(expectedActivePromotions));
    }

    @Test
    void dashboardMetricsEndpointIsRoleProtectedAndDocumented() throws Exception {
        mockMvc.perform(get("/api/v1/admin/dashboard/metrics")
                        .with(user("customer").roles("CUSTOMER")))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/v1/admin/dashboard/metrics']").exists())
                .andExpect(jsonPath("$.components.schemas.DashboardMetricsDto.properties.totalBookings.type").value("integer"))
                .andExpect(jsonPath("$.components.schemas.DashboardMetricsDto.properties.totalRevenue.type").value("integer"))
                .andExpect(jsonPath("$.components.schemas.DashboardMetricsDto.properties.totalCustomers.type").value("integer"))
                .andExpect(jsonPath("$.components.schemas.DashboardMetricsDto.properties.activePromotions.type").value("integer"));
    }
}
