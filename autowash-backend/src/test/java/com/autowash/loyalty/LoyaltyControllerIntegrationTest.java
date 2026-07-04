package com.autowash.loyalty; 
import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.autowash.entity.User;
import com.autowash.repository.UserRepository;
import com.autowash.entity.Booking;
import com.autowash.entity.enums.PaymentMethod;
import com.autowash.repository.BookingRepository;
import com.autowash.entity.WashSession;
import com.autowash.repository.WashSessionRepository;
import com.autowash.entity.Vehicle;
import com.autowash.entity.enums.VehicleType;
import com.autowash.repository.VehicleRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;

import java.time.LocalTime;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LoyaltyControllerIntegrationTest {

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

    @Autowired
    private WashSessionRepository washSessionRepository;

    @Test
    void accountHistoryRedeemAndOpenApiUseCustomerScope() throws Exception {
        String phone = "0901888010";
        String accessToken = registerActivateAndLogin(phone);
        User customer = UserRepository.findByEmailIgnoreCase(phone + "@example.com").orElseThrow();
        WashSession session = createCompletedSession(customer, "LOY_CTL_001", 1500000);

        mockMvc.perform(get("/api/v1/loyalty/account")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.customerId").value(customer.getId().toString()))
                .andExpect(jsonPath("$.data.currentPoints").value(0))
                .andExpect(jsonPath("$.data.tier").value("BRONZE"));

        mockMvc.perform(post("/api/v1/loyalty/earn")
                        .with(user("admin").roles("ADMIN"))
                        .contentType("application/json")
                        .content("""
                                {
                                  "customerId": "%s",
                                  "sessionId": "%s"
                                }
                                """.formatted(customer.getId(), session.getId())))
                .andExpect(status().isOk())
                  .andExpect(jsonPath("$.data.pointsAwarded").value(150))
                  .andExpect(jsonPath("$.data.newBalance").value(150));

        mockMvc.perform(get("/api/v1/loyalty/history")
                        .header("Authorization", "Bearer " + accessToken)
                        .param("type", "EARN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].type").value("EARN"))
                .andExpect(jsonPath("$.pagination.page").value(1));

        mockMvc.perform(post("/api/v1/loyalty/redeem")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                { "pointsToRedeem": 100, "referenceId": "silver-100" }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.pointsRedeemed").value(100))
                .andExpect(jsonPath("$.data.newBalance").value(50))
                .andExpect(jsonPath("$.data.voucherCode").isString())
                .andExpect(jsonPath("$.data.voucherValue").value(100000))
                .andExpect(jsonPath("$.data.expiresAt").exists())
                .andExpect(jsonPath("$.data.status").value("SUCCESS"));

        mockMvc.perform(get("/api/v1/loyalty/account")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.currentPoints").value(50))
                .andExpect(jsonPath("$.data.totalEarnedPoints").value(150));

        mockMvc.perform(get("/api/v1/loyalty/history")
                        .header("Authorization", "Bearer " + accessToken)
                        .param("type", "REDEEM"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].type").value("REDEEM"))
                .andExpect(jsonPath("$.data[0].reason").value(org.hamcrest.Matchers.startsWith("Voucher redemption:")));

        mockMvc.perform(post("/api/v1/loyalty/redeem")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                { "pointsToRedeem": 201, "referenceId": "LOY_CTL_001" }
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value("Maximum redemption is 200 points"));

        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/v1/loyalty/account']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/loyalty/earn']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/loyalty/redeem']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/loyalty/history']").exists());
    }

    @Test
    void historyRejectsInvalidTypeAndEarnIsAdminOnly() throws Exception {
        String accessToken = registerActivateAndLogin("0901888011");

        mockMvc.perform(get("/api/v1/loyalty/history")
                        .header("Authorization", "Bearer " + accessToken)
                        .param("type", "INVALID"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));

        mockMvc.perform(post("/api/v1/loyalty/earn")
                        .with(user("customer").roles("CUSTOMER"))
                        .contentType("application/json")
                        .content("""
                                {
                                  "customerId": "00000000-0000-0000-0000-000000000000",
                                  "sessionId": "00000000-0000-0000-0000-000000000000"
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    private WashSession createCompletedSession(User customer, String bookingId, long finalAmount) {
        String plateSuffixSource = customer.getPhone() != null
                ? customer.getPhone()
                : customer.getEmail();
        String plateSuffix = plateSuffixSource.substring(Math.max(0, plateSuffixSource.length() - 6));

        Vehicle vehicle = VehicleRepository.save(new Vehicle(
                customer,
                "30H-" + plateSuffix,
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
                Instant.now().plusSeconds(86400),
                LocalTime.of(14, 0),
                PaymentMethod.E_WALLET,
                finalAmount,
                0,
                0,
                finalAmount,
                30
        );
        booking.confirmByOtp();
        BookingRepository.save(booking);
        WashSession session = WashSession.create(booking, "Loyalty controller test", null);
        Instant now = Instant.now();
        session.queue(now);
        session.checkIn(now, finalAmount, "VND", 0);
        session.start(now);
        session.complete(now, 0);
        return washSessionRepository.saveAndFlush(session);
    }

    private String registerActivateAndLogin(String emailLocalPart) throws Exception {
        String email = emailLocalPart + "@example.com";

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

        MvcResult verifyOtpResult = mockMvc.perform(post("/api/v1/auth/otp/verify")
                        .contentType("application/json")
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

    private JsonNode readJson(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }
}
