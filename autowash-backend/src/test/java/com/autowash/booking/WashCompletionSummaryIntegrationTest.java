package com.autowash.booking;

import com.autowash.entity.User;
import com.autowash.entity.WashSession;
import com.autowash.entity.enums.UserRole;
import com.autowash.repository.UserRepository;
import com.autowash.repository.WashSessionRepository;

import com.autowash.shared.security.UserPrincipal;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
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
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class WashCompletionSummaryIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private WashSessionRepository washSessionRepository;


    @BeforeEach
    void ensureActiveStaffExists() {
        User staff = new User("Completion Staff", uniquePhone("0915"), "completion-staff-" + UUID.randomUUID() + "@example.com", "hash");
        staff.activate();
        ReflectionTestUtils.setField(staff, "role", UserRole.STAFF);
        userRepository.saveAndFlush(staff);
    }

    @Test
    void completionSummaryReturnsCorrectDataAfterSessionCompleted() throws Exception {
        String accessToken = registerActivateAndLogin("0901234800");
        String vehicleId = createVehicle(accessToken, "30H-300001");
        String bookingId = createVerifiedBooking(accessToken, vehicleId);
        String sessionId = createWashSession(bookingId, "Completion summary test");

        // complete session trực tiếp qua repository
        completeWashSession(sessionId, 50);

        mockMvc.perform(get("/api/v1/customers/wash-tracking/{washSessionId}/completion-summary", sessionId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.washSessionId").value(sessionId))
                .andExpect(jsonPath("$.data.bookingId").value(bookingId))
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.vehiclePlate").value("30H-300001"))
                .andExpect(jsonPath("$.data.awardedLoyaltyPoints").value(50));
    }

    @Test
    void completionSummaryReturns422ForNonCompletedSession() throws Exception {
        String accessToken = registerActivateAndLogin("0901234801");
        String vehicleId = createVehicle(accessToken, "30H-300002");
        String bookingId = createVerifiedBooking(accessToken, vehicleId);
        String sessionId = createWashSession(bookingId, "Not completed yet");

        mockMvc.perform(get("/api/v1/customers/wash-tracking/{washSessionId}/completion-summary", sessionId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errorCode").value("BUSINESS_RULE_VIOLATION"));
    }

    @Test
    void completionSummaryReturns404ForOtherCustomer() throws Exception {
        String ownerToken = registerActivateAndLogin("0901234802");
        String otherToken = registerActivateAndLogin("0901234803");
        String vehicleId = createVehicle(ownerToken, "30H-300003");
        String bookingId = createVerifiedBooking(ownerToken, vehicleId);
        String sessionId = createWashSession(bookingId, "Owner session");
        completeWashSession(sessionId, 30);

        mockMvc.perform(get("/api/v1/customers/wash-tracking/{washSessionId}/completion-summary", sessionId)
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
    }

    private void completeWashSession(String sessionId, int awardedPoints) {
        WashSession session = washSessionRepository.findById(UUID.fromString(sessionId)).orElseThrow();
        session.complete(Instant.now(), awardedPoints);
        washSessionRepository.saveAndFlush(session);
    }

    private String createWashSession(String bookingId, String notes) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/operations/sessions")
                        .with(authenticatedAdmin())
                        .contentType("application/json")
                        .content("""
                                {
                                  "bookingId": "%s",
                                  "notes": "%s"
                                }
                                """.formatted(bookingId, notes)))
                .andExpect(status().isCreated())
                .andReturn();
        return readJson(result).path("data").path("sessionId").asText();
    }

    private String createVerifiedBooking(String accessToken, String vehicleId) throws Exception {
        String bookingId = createBooking(accessToken, vehicleId).path("data").path("bookingId").asText();
        mockMvc.perform(post("/api/v1/customers/bookings/{bookingId}/pay", bookingId)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
        { "transactionRef": "TXN_COMPLETION" }
        """))
                .andExpect(status().isOk());
        return bookingId;
    }

    private JsonNode createBooking(String accessToken, String vehicleId) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/customers/bookings")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "vehicleId": "%s",
                                  "packageId": "12345678-1234-1234-1234-123456789012",
                                  "bookingDate": "%s",
                                  "bookingTime": "14:00",
                                  "paymentMethod": "E_WALLET"
                                }
                                """.formatted(vehicleId, LocalDate.now().plusDays(7))))
                .andReturn();
        return readJson(result);
    }

    private String createVehicle(String accessToken, String plate) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/customers/vehicles")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
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

    private RequestPostProcessor authenticatedAdmin() {
        User admin = new User("Completion Admin", uniquePhone("0987"), "completion-admin-" + UUID.randomUUID() + "@example.com", "hash");
        admin.activate();
        ReflectionTestUtils.setField(admin, "role", UserRole.ADMIN);
        userRepository.saveAndFlush(admin);
        UserPrincipal principal = new UserPrincipal(admin);
        UsernamePasswordAuthenticationToken token =
                new UsernamePasswordAuthenticationToken(principal, principal.getPassword(), principal.getAuthorities());
        return authentication(token);
    }

    private String registerActivateAndLogin(String phone) throws Exception {
        String email = phone + "@example.com";
        MvcResult registerResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType("application/json")
                        .content("""
                                {
                                  "fullName": "Nguyen Van A",
                                  "email": "%s",
                                  "password": "SecurePass1!",
                                  "passwordConfirm": "SecurePass1!"
                                }
                                """.formatted(email)))
                .andReturn();
        String otp = readJson(registerResult).path("data").path("devOtp").asText();
        MvcResult verifyResult = mockMvc.perform(post("/api/v1/auth/otp/verify")
                        .contentType("application/json")
                        .content("""
                                {
                                  "email": "%s",
                                  "otp": "%s"
                                }
                                """.formatted(email, otp)))
                .andExpect(status().isOk())
                .andReturn();
        return readJson(verifyResult).path("data").path("accessToken").asText();
    }

    private String uniquePhone(String prefix) {
        String digits = UUID.randomUUID().toString().replaceAll("\\D", "");
        while (digits.length() < 6) digits += "0";
        return prefix + digits.substring(0, 6);
    }

    private JsonNode readJson(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }
}
