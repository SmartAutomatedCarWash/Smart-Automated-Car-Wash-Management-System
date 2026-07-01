package com.autowash.admin;

import static org.hamcrest.Matchers.contains;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.autowash.entity.User;
import com.autowash.entity.enums.UserRole;
import com.autowash.repository.UserRepository;
import com.autowash.entity.Booking;
import com.autowash.entity.enums.PaymentMethod;
import com.autowash.repository.BookingRepository;
import com.autowash.shared.security.UserPrincipal;
import com.autowash.entity.Vehicle;
import com.autowash.entity.enums.VehicleType;
import com.autowash.repository.VehicleRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminReportingControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository UserRepository;

    @Autowired
    private VehicleRepository VehicleRepository;

    @Autowired
    private BookingRepository BookingRepository;

    @Test
    void adminBookingListSupportsFiltersAndPagination() throws Exception {
        LocalDate matchingDate = LocalDate.of(2026, 6, 15);
        Booking matching = createConfirmedBooking("ADMIN_BK_001", "0901777401", "30H-774401", matchingDate, 270000);
        createConfirmedBooking("ADMIN_BK_002", "0901777402", "30H-774402", LocalDate.of(2026, 7, 10), 150000);

        mockMvc.perform(get("/api/v1/admin/bookings")
                        .with(user("admin").roles("ADMIN"))
                        .param("status", "CONFIRMED")
                        .param("customerId", matching.getCustomer().getId().toString())
                        .param("dateFrom", "2026-06-01")
                        .param("dateTo", "2026-06-30")
                        .param("searchQuery", "774401")
                        .param("page", "1")
                        .param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].bookingId").value(matching.getId().toString()))
                .andExpect(jsonPath("$.data[0].customerId").value(matching.getCustomer().getId().toString()))
                .andExpect(jsonPath("$.data[0].servicePackageName").value("Basic Wash"))
                .andExpect(jsonPath("$.pagination.total").value(1));
    }

    @Test
    void adminBookingListRejectsInvalidStatusAndNonAdminAccess() throws Exception {
        mockMvc.perform(get("/api/v1/admin/bookings")
                        .with(user("admin").roles("ADMIN"))
                        .param("status", "INVALID"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));

        mockMvc.perform(get("/api/v1/admin/bookings")
                        .with(user("customer").roles("CUSTOMER")))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminAccountListSupportsRoleStatusSearchAndPagination() throws Exception {
        User staff = createActiveUser(UserRole.STAFF, uniquePhone("0918"), "Account Staff");
        createActiveUser(UserRole.ADMIN, uniquePhone("0988"), "Account Admin");
        createActiveUser(UserRole.CUSTOMER, uniquePhone("0908"), "Account Customer");

        mockMvc.perform(get("/api/v1/admin/accounts")
                        .with(user("admin").roles("ADMIN"))
                        .param("role", "STAFF")
                        .param("status", "ACTIVE")
                        .param("searchQuery", staff.getPhone())
                        .param("page", "1")
                        .param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].accountId").value(staff.getId().toString()))
                .andExpect(jsonPath("$.data[0].fullName").value("Account Staff"))
                .andExpect(jsonPath("$.data[0].role").value("STAFF"))
                .andExpect(jsonPath("$.data[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$.pagination.total").value(1));
    }

    @Test
    void adminAccountListRejectsInvalidRoleAndNonAdminAccess() throws Exception {
        mockMvc.perform(get("/api/v1/admin/accounts")
                        .with(user("admin").roles("ADMIN"))
                        .param("role", "OWNER"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));

        mockMvc.perform(get("/api/v1/admin/accounts")
                        .with(user("customer").roles("CUSTOMER")))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminAccountDetailReturnsAccountAndRejectsMissingAccount() throws Exception {
        User account = createActiveUser(UserRole.STAFF, uniquePhone("0977"), "Account Detail Staff");

        mockMvc.perform(get("/api/v1/admin/accounts/{accountId}", account.getId())
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accountId").value(account.getId().toString()))
                .andExpect(jsonPath("$.data.role").value("STAFF"))
                .andExpect(jsonPath("$.data.fullName").value("Account Detail Staff"));

        mockMvc.perform(get("/api/v1/admin/accounts/00000000-0000-0000-0000-000000000000")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    void customerDetailWashHistoryAndPointHistoryUseRealBookingOperationsAndLoyaltyData() throws Exception {
        Booking booking = createConfirmedBooking("ADMIN_BK_003", "0901777403", "30H-774403", LocalDate.of(2026, 6, 12), 270000);
        String sessionId = completeSession(booking.getId());
        Booking pendingBooking = createConfirmedBookingForVehicle(
                booking.getCustomer(),
                booking.getVehicle(),
                "ADMIN_BK_004",
                LocalDate.of(2026, 6, 13),
                150000
        );
        String pendingSessionId = createSession(pendingBooking.getId());
        String customerId = booking.getCustomer().getId().toString();

        mockMvc.perform(get("/api/v1/admin/customers/{customerId}", customerId)
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.customerId").value(customerId))
                .andExpect(jsonPath("$.data.profile.phone").value("0901777403"))
                .andExpect(jsonPath("$.data.profile.role").value("CUSTOMER"))
                .andExpect(jsonPath("$.data.loyalty.currentPoints").value(27))
                .andExpect(jsonPath("$.data.summary.totalBookings").value(2))
                .andExpect(jsonPath("$.data.summary.totalWashSessions").value(1))
                .andExpect(jsonPath("$.data.summary.totalPointsEarned").value(27));

        mockMvc.perform(get("/api/v1/admin/customers/{customerId}/wash-sessions", customerId)
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[?(@.sessionId == '%s')].bookingId".formatted(sessionId)).value(contains(booking.getId().toString())))
                .andExpect(jsonPath("$.data[?(@.sessionId == '%s')].Package.name".formatted(sessionId)).value(contains("Basic Wash")))
                .andExpect(jsonPath("$.data[?(@.sessionId == '%s')].pointsAwarded".formatted(sessionId)).value(contains(27)))
                .andExpect(jsonPath("$.data[?(@.sessionId == '%s')].status".formatted(pendingSessionId)).value(contains("PENDING")));

        mockMvc.perform(get("/api/v1/admin/customers/{customerId}/vehicles", customerId)
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].plate").value("30H-774403"))
                .andExpect(jsonPath("$.data[0].totalServices").value(1));

        mockMvc.perform(get("/api/v1/admin/customers/{customerId}/point-transactions", customerId)
                        .with(user("admin").roles("ADMIN"))
                        .param("type", "EARN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].type").value("EARN"))
                .andExpect(jsonPath("$.data[0].points").value(27))
                .andExpect(jsonPath("$.data[0].referenceId").value(booking.getId().toString()));

        mockMvc.perform(get("/api/v1/admin/customers/{customerId}/tier-history", customerId)
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test
    void customerHistoryEmptyStateAndNotFoundAreHandled() throws Exception {
        User customer = createActiveCustomer("0901777404");

        mockMvc.perform(get("/api/v1/admin/customers/{customerId}/wash-sessions", customer.getId())
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0))
                .andExpect(jsonPath("$.pagination.total").value(0));

        mockMvc.perform(get("/api/v1/admin/customers/00000000-0000-0000-0000-000000000000")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    void adminCanUpdateCustomerRoleAndCustomerDetailStopsResolvingAfterward() throws Exception {
        User customer = createActiveCustomer("0901777405");

        mockMvc.perform(put("/api/v1/admin/customers/{customerId}/role", customer.getId())
                        .with(user("admin").roles("ADMIN"))
                        .contentType("application/json")
                        .content("""
                                {
                                  "role": "STAFF"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.customerId").value(customer.getId().toString()))
                .andExpect(jsonPath("$.data.role").value("STAFF"));

        mockMvc.perform(get("/api/v1/admin/customers/{customerId}", customer.getId())
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    void updateCustomerRoleRejectsInvalidRoleAndNonAdminAccess() throws Exception {
        User customer = createActiveCustomer("0901777406");

        mockMvc.perform(put("/api/v1/admin/customers/{customerId}/role", customer.getId())
                        .with(user("admin").roles("ADMIN"))
                        .contentType("application/json")
                        .content("""
                                {
                                  "role": "OWNER"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));

        mockMvc.perform(put("/api/v1/admin/customers/{customerId}/role", customer.getId())
                        .with(user("customer").roles("CUSTOMER"))
                        .contentType("application/json")
                        .content("""
                                {
                                  "role": "STAFF"
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    void openApiDocumentsAdminReportingSchemas() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/v1/admin/accounts']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/admin/bookings']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/admin/customers/{customerId}']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/admin/customers/{customerId}/vehicles']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/admin/customers/{customerId}/wash-sessions']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/admin/customers/{customerId}/point-transactions']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/admin/customers/{customerId}/tier-history']").exists())
                .andExpect(jsonPath("$.components.schemas.AdminAccountResponse.properties.accountId.type").value("string"))
                .andExpect(jsonPath("$.components.schemas.AdminBookingResponse.properties.bookingId.type").value("string"))
                .andExpect(jsonPath("$.components.schemas.AdminCustomerDetailResponse.properties.customerId.type").value("string"))
                .andExpect(jsonPath("$.components.schemas.AdminCustomerVehicleResponse.properties.vehicleId.type").value("string"))
                .andExpect(jsonPath("$.components.schemas.AdminTierHistoryResponse.properties.id.type").value("integer"))
                .andExpect(jsonPath("$.components.schemas.AdminWashHistoryResponse.properties.sessionId.type").value("string"));
    }

    private String completeSession(UUID bookingId) throws Exception {
        String sessionId = createSession(bookingId);
        mockMvc.perform(post("/api/v1/operations/sessions/{sessionId}/queue", sessionId)
                        .with(authenticatedAdmin()))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/operations/sessions/{sessionId}/check-in", sessionId)
                        .with(authenticatedAdmin()))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/operations/sessions/{sessionId}/start", sessionId)
                        .with(authenticatedAdmin()))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/operations/sessions/{sessionId}/complete", sessionId)
                        .with(authenticatedAdmin()))
                .andExpect(status().isOk());
        return sessionId;
    }

    private String createSession(UUID bookingId) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/operations/sessions")
                        .with(authenticatedAdmin())
                        .contentType("application/json")
                        .content("""
                                {
                                  "bookingId": "%s",
                                  "notes": "Admin reporting integration test"
                                }
                                """.formatted(bookingId)))
                .andExpect(status().isCreated())
                .andReturn();
        return readJson(result).path("data").path("sessionId").asText();
    }

    private RequestPostProcessor authenticatedAdmin() {
        User admin = new User("Reporting Admin", uniquePhone("0987"), "reporting-admin-" + java.util.UUID.randomUUID() + "@example.com", "hash");
        admin.activate();
        ReflectionTestUtils.setField(admin, "role", UserRole.ADMIN);
        UserRepository.saveAndFlush(admin);
        UserPrincipal principal = new UserPrincipal(admin);
        UsernamePasswordAuthenticationToken token =
                new UsernamePasswordAuthenticationToken(principal, principal.getPassword(), principal.getAuthorities());
        return authentication(token);
    }

    private String uniquePhone(String prefix) {
        String digits = java.util.UUID.randomUUID().toString().replaceAll("\\D", "");
        while (digits.length() < 6) {
            digits += "0";
        }
        return prefix + digits.substring(0, 6);
    }

    private Booking createConfirmedBooking(String bookingId, String phone, String plate, LocalDate bookingDate, long finalAmount) {
        User user = createActiveCustomer(phone);
        return createConfirmedBookingForCustomer(user, bookingId, plate, bookingDate, finalAmount);
    }

    private Booking createConfirmedBookingForCustomer(User user, String bookingId, String plate, LocalDate bookingDate, long finalAmount) {
        Vehicle vehicle = VehicleRepository.save(new Vehicle(
                user,
                plate,
                VehicleType.CAR,
                "Toyota",
                "Camry",
                2023,
                "Silver",
                true
        ));
        return createConfirmedBookingForVehicle(user, vehicle, bookingId, bookingDate, finalAmount);
    }

    private Booking createConfirmedBookingForVehicle(User user, Vehicle vehicle, String bookingId, LocalDate bookingDate, long finalAmount) {
        Booking booking = new Booking(
                UUID.randomUUID(),
                user,
                vehicle,
                UUID.fromString("12345678-1234-1234-1234-123456789012"),
                null,
                null,
                bookingDate.atStartOfDay().toInstant(java.time.ZoneOffset.UTC),
                LocalTime.of(14, 0),
                PaymentMethod.E_WALLET,
                finalAmount,
                0,
                0,
                finalAmount,
                30
        );
        booking.confirmByOtp();
        return BookingRepository.saveAndFlush(booking);
    }

    private User createActiveCustomer(String phone) {
        User user = new User("Nguyen Van A", phone, phone + "@example.com", "hash");
        user.activate();
        return UserRepository.saveAndFlush(user);
    }

    private User createActiveUser(UserRole role, String phone, String fullName) {
        User user = new User(fullName, phone, phone + "@example.com", "hash");
        user.activate();
        ReflectionTestUtils.setField(user, "role", role);
        return UserRepository.saveAndFlush(user);
    }

    private JsonNode readJson(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }
}
