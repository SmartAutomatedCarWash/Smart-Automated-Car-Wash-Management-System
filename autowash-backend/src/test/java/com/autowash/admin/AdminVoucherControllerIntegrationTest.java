package com.autowash.admin; 
import java.util.UUID;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminVoucherControllerIntegrationTest {

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
    void adminCanListVoucherCatalog() throws Exception {
        mockMvc.perform(get("/api/v1/admin/vouchers")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()", greaterThan(0)))
                .andExpect(jsonPath("$.data[*].code", hasItem("WELCOME20")));
    }

    @Test
    void adminCanInspectVoucherRedemptionHistory() throws Exception {
        String voucherCode = "silver-100";
        User customer = createActiveCustomer("0901999001");
        User staff = createActiveStaff("Staff Voucher Admin");
        Booking booking = createConfirmedBooking(customer, staff, "ADMIN_VOUCHER_BK_001", "30H-999001", LocalDate.of(2026, 6, 14), 1500000);
        completeSession(booking.getId(), staff);

        MvcResult redeemResult = mockMvc.perform(post("/api/v1/loyalty/redeem")
                        .with(authenticatedCustomer(customer))
                        .contentType("application/json")
                        .content("""
                                {
                                  "pointsToRedeem": 100,
                                  "referenceId": "%s"
                                }
                                """.formatted(voucherCode)))
                .andExpect(status().isOk())
                .andReturn();

        String issuedVoucherCode = readJson(redeemResult).path("data").path("voucherCode").asText();

        mockMvc.perform(get("/api/v1/admin/vouchers/redemptions")
                        .with(user("admin").roles("ADMIN"))
                        .param("searchQuery", issuedVoucherCode))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()", greaterThan(0)))
                .andExpect(jsonPath("$.data[0].customerId").value(customer.getId().toString()))
                .andExpect(jsonPath("$.data[0].customerName").value("Nguyen Van A"))
                .andExpect(jsonPath("$.data[0].voucherCode").value(issuedVoucherCode))
                .andExpect(jsonPath("$.data[0].pointsRedeemed").value(100))
                .andExpect(jsonPath("$.data[0].balanceAfter").value(50));
    }

    private String completeSession(UUID bookingId, User staff) throws Exception {
        String sessionId = createSession(bookingId, staff);
        mockMvc.perform(post("/api/v1/operations/sessions/{sessionId}/queue", sessionId)
                        .with(authenticatedUser(staff)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/operations/sessions/{sessionId}/check-in", sessionId)
                        .with(authenticatedUser(staff)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/operations/sessions/{sessionId}/start", sessionId)
                        .with(authenticatedUser(staff)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/operations/sessions/{sessionId}/complete", sessionId)
                        .with(authenticatedUser(staff)))
                .andExpect(status().isOk());
        return sessionId;
    }

    private String createSession(UUID bookingId, User staff) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/operations/sessions")
                        .with(authenticatedUser(staff))
                        .contentType("application/json")
                        .content("""
                                {
                                  "bookingId": "%s",
                                  "notes": "Admin voucher integration test"
                                }
                                """.formatted(bookingId)))
                .andExpect(status().isCreated())
                .andReturn();
        return readJson(result).path("data").path("sessionId").asText();
    }

    private Booking createConfirmedBooking(
            User customer,
            User assignedStaff,
            String bookingId,
            String plate,
            LocalDate bookingDate,
            long finalAmount
    ) {
        Vehicle vehicle = VehicleRepository.save(new Vehicle(
                customer,
                plate,
                VehicleType.CAR,
                "Toyota",
                "Camry",
                2023,
                "Silver",
                true
        ));
        Booking booking = new Booking(
                UUID.randomUUID(),
                customer,
                vehicle,
                null,
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
        booking.assignStaff(assignedStaff);
        booking.confirmByOtp();
        return BookingRepository.saveAndFlush(booking);
    }

    private User createActiveCustomer(String phone) {
        User user = new User("Nguyen Van A", phone, phone + "@example.com", "hash");
        user.activate();
        return UserRepository.saveAndFlush(user);
    }

    private User createActiveStaff(String fullName) {
        User staff = new User(fullName, uniquePhone("0918"), "staff-" + plateSafe(fullName) + "@example.com", "hash");
        staff.activate();
        ReflectionTestUtils.setField(staff, "role", UserRole.STAFF);
        return UserRepository.saveAndFlush(staff);
    }

    private org.springframework.test.web.servlet.request.RequestPostProcessor authenticatedUser(User user) {
        UserPrincipal principal = new UserPrincipal(user);
        UsernamePasswordAuthenticationToken token =
                new UsernamePasswordAuthenticationToken(principal, principal.getPassword(), principal.getAuthorities());
        return authentication(token);
    }

    private org.springframework.test.web.servlet.request.RequestPostProcessor authenticatedCustomer(User user) {
        return authenticatedUser(user);
    }

    private String uniquePhone(String prefix) {
        String digits = java.util.UUID.randomUUID().toString().replaceAll("\\D", "");
        while (digits.length() < 6) {
            digits += "0";
        }
        return prefix + digits.substring(0, 6);
    }

    private String plateSafe(String value) {
        return value.toLowerCase().replaceAll("[^a-z0-9]+", "-");
    }

    private JsonNode readJson(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }
}
