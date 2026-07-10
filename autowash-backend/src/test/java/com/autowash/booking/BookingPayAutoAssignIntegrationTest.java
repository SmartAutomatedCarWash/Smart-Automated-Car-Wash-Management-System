package com.autowash.booking;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.autowash.entity.User;
import com.autowash.entity.enums.UserRole;
import com.autowash.repository.BookingRepository;
import com.autowash.repository.UserRepository;
import com.autowash.shared.security.UserPrincipal;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BookingPayAutoAssignIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BookingRepository bookingRepository;

    private User operationsStaff;

    @BeforeEach
    void ensureActiveStaffExists() {
        User staff = new User(
                "Pay Auto Assign Staff",
                uniquePhone("0919"),
                "pay-auto-assign-" + UUID.randomUUID() + "@example.com",
                "hash"
        );
        staff.activate();
        ReflectionTestUtils.setField(staff, "role", UserRole.STAFF);
        operationsStaff = userRepository.saveAndFlush(staff);
    }

    @Test
    void checkInSessionAutoAssignsStaffWhenCustomerArrives() throws Exception {
        String accessToken = registerActivateAndLogin("0901234799");
        String vehicleId = createVehicle(accessToken, "30H-229999");

        JsonNode createResponse = readJson(mockMvc.perform(post("/api/v1/customers/bookings")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "vehicleId": "%s",
                                  "packageId": "12345678-1234-1234-1234-123456789012",
                                  "bookingDate": "%s",
                                  "bookingTime": "14:00",
                                  "paymentMethod": "CASH_AT_COUNTER"
                                }
                                """.formatted(vehicleId, futureBookingDate())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andReturn());

        String bookingId = createResponse.path("data").path("bookingId").asText();

        mockMvc.perform(post("/api/v1/operations/bookings/{bookingId}/pay", bookingId)
                        .with(authenticatedStaff())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "transactionRef": "TEST-PAY-001" }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.bookingStatus").value("CONFIRMED"))
                .andExpect(jsonPath("$.data.assignedStaffId").value(nullValue()))
                .andExpect(jsonPath("$.data.assignedStaffName").value(nullValue()));

        var booking = bookingRepository.findById(UUID.fromString(bookingId)).orElseThrow();
        assertThat(booking.getAssignedStaff()).isNull();

        mockMvc.perform(post("/api/v1/operations/sessions")
                        .with(authenticatedStaff())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "bookingId": "%s",
                                  "notes": "Customer arrived for check-in"
                                }
                                """.formatted(bookingId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.assignedStaffId").isNotEmpty())
                .andExpect(jsonPath("$.data.assignedStaffName").isNotEmpty());

        booking = bookingRepository.findById(UUID.fromString(bookingId)).orElseThrow();
        assertThat(booking.getAssignedStaff()).isNotNull();
    }

    private String registerActivateAndLogin(String phone) throws Exception {
        String email = phone + "@example.com";
        MvcResult registerResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName": "Pay Auto Assign Customer",
                                  "email": "%s",
                                  "password": "SecurePass1!",
                                  "passwordConfirm": "SecurePass1!"
                                }
                                """.formatted(email)))
                .andExpect(status().isCreated())
                .andReturn();

        String otp = readJson(registerResult).path("data").path("devOtp").asText();

        MvcResult verifyOtpResult = mockMvc.perform(post("/api/v1/auth/otp/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "%s",
                                  "otp": "%s"
                                }
                                """.formatted(email, otp)))
                .andExpect(status().isOk())
                .andReturn();

        return readJson(verifyOtpResult).path("data").path("accessToken").asText();
    }

    private String createVehicle(String accessToken, String plate) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/customers/vehicles")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "plate": "%s",
                                  "type": "CAR",
                                  "brand": "Toyota",
                                  "model": "Camry",
                                  "year": 2023,
                                  "color": "Silver"
                                }
                                """.formatted(plate)))
                .andExpect(status().isCreated())
                .andReturn();
        return readJson(result).path("data").path("vehicleId").asText();
    }

    private JsonNode readJson(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private RequestPostProcessor authenticatedStaff() {
        UserPrincipal principal = new UserPrincipal(operationsStaff);
        UsernamePasswordAuthenticationToken token =
                new UsernamePasswordAuthenticationToken(principal, principal.getPassword(), principal.getAuthorities());
        return authentication(token);
    }

    private String futureBookingDate() {
        return LocalDate.now().plusDays(3).toString();
    }

    private String uniquePhone(String prefix) {
        String digits = UUID.randomUUID().toString().replaceAll("\\D", "");
        while (digits.length() < 6) {
            digits += "0";
        }
        return prefix + digits.substring(0, 6);
    }
}
