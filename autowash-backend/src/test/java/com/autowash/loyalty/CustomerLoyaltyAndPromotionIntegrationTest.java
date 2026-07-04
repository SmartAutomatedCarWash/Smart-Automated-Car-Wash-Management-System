package com.autowash.loyalty;  
import java.time.Instant;
import java.util.UUID;

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.autowash.entity.User;
import com.autowash.entity.LoyaltyAccount;
import com.autowash.entity.enums.LoyaltyTier;
import com.autowash.entity.enums.UserRole;
import com.autowash.repository.UserRepository;
import com.autowash.entity.Booking;
import com.autowash.entity.Promotion;
import com.autowash.entity.enums.PaymentMethod;
import com.autowash.repository.BookingRepository;
import com.autowash.repository.LoyaltyAccountRepository;
import com.autowash.repository.PromotionRepository;
import com.autowash.repository.PromotionTierRepository;
import com.autowash.entity.PromotionTier;
import com.autowash.entity.enums.PromotionTargetingMode;
import com.autowash.entity.enums.ActiveStatus;
import java.math.BigDecimal;
import com.autowash.shared.security.UserPrincipal;
import com.autowash.entity.Vehicle;
import com.autowash.entity.enums.VehicleType;
import com.autowash.repository.VehicleRepository;
import java.time.LocalTime;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CustomerLoyaltyAndPromotionIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository UserRepository;

    @Autowired
    private VehicleRepository VehicleRepository;

    @Autowired
    private BookingRepository BookingRepository;

    @Autowired
    private LoyaltyAccountRepository loyaltyAccountRepository;

    @Autowired
    private PromotionRepository promotionRepository;

    @Autowired
    private PromotionTierRepository promotionTierRepository;

    @Test
    void loyaltyAccountAndTransactionsReflectCompletedWashPoints() throws Exception {
        String phone = "0901777101";
        Booking booking = createConfirmedBooking("LOYALTY_BK_001", phone, 270000);
        createCompletedSession(booking.getId());
        User customer = UserRepository.findByPhone(phone).orElseThrow();

        mockMvc.perform(get("/api/v1/loyalty/account")
                        .with(authenticatedCustomer(customer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tier").value("BRONZE"))
                .andExpect(jsonPath("$.data.currentPoints").value(27))
                .andExpect(jsonPath("$.data.completedWashCount").value(1))
                .andExpect(jsonPath("$.data.totalEarnedPoints").value(27));

        mockMvc.perform(get("/api/v1/loyalty/transactions")
                        .with(authenticatedCustomer(customer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].type").value("EARN"))
                .andExpect(jsonPath("$.data[0].points").value(27))
                .andExpect(jsonPath("$.data[0].bookingId").value(booking.getId().toString()));
    }

    @Test
    void washHistoryReturnsCompletedSessionsWithAwardedPoints() throws Exception {
        String phone = "0901777102";
        Booking booking = createConfirmedBooking("LOYALTY_BK_002", phone, 150000);
        createCompletedSession(booking.getId());
        String vehiclePlate = "30H-" + phone.substring(phone.length() - 6);
        User customer = UserRepository.findByPhone(phone).orElseThrow();

        mockMvc.perform(get("/api/v1/customers/wash-history")
                        .with(authenticatedCustomer(customer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].bookingId").value(booking.getId().toString()))
                .andExpect(jsonPath("$.data[0].vehiclePlate").value(vehiclePlate))
                .andExpect(jsonPath("$.data[0].awardedPoints").value(15))
                .andExpect(jsonPath("$.data[0].status").value("COMPLETED"));
    }

    @Test
    void redeemUpdatesAccountBalanceAndTransactionHistory() throws Exception {
        String phone = "0901777105";
        Booking booking = createConfirmedBooking("LOYALTY_BK_003", phone, 1500000);
        User customer = UserRepository.findByPhone(phone).orElseThrow();
        createCompletedSession(booking.getId());

        mockMvc.perform(post("/api/v1/loyalty/redeem")
                        .with(authenticatedCustomer(customer))
                        .contentType("application/json")
                        .content("""
                                {
                                  "pointsToRedeem": 100,
                                  "referenceId": "silver-100"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.pointsRedeemed").value(100))
                .andExpect(jsonPath("$.data.newBalance").value(50))
                .andExpect(jsonPath("$.data.voucherCode").isString())
                .andExpect(jsonPath("$.data.voucherValue").value(100000))
                .andExpect(jsonPath("$.data.expiresAt").exists())
                .andExpect(jsonPath("$.data.status").value("SUCCESS"));

        mockMvc.perform(get("/api/v1/loyalty/account")
                        .with(authenticatedCustomer(customer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.currentPoints").value(50))
                .andExpect(jsonPath("$.data.totalEarnedPoints").value(150));

        mockMvc.perform(get("/api/v1/loyalty/transactions")
                        .with(authenticatedCustomer(customer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].type").value("REDEEM"))
                .andExpect(jsonPath("$.data[0].points").value(-100))
                .andExpect(jsonPath("$.data[0].description").value(org.hamcrest.Matchers.startsWith("Voucher redemption:")))
                .andExpect(jsonPath("$.data[1].type").value("EARN"))
                .andExpect(jsonPath("$.data[1].points").value(150));
    }

    @Test
    void activePromotionsFilterByCustomerTierAndNewCustomerAudience() throws Exception {
        Promotion p1 = new Promotion("ALL10", "All 10", BigDecimal.valueOf(1.0), Instant.now().minusSeconds(10), Instant.now().plusSeconds(100000), PromotionTargetingMode.ALL_TIERS, ActiveStatus.ACTIVE);
        promotionRepository.saveAndFlush(p1);
        
        Promotion p2 = new Promotion("GOLD15", "Gold 15", BigDecimal.valueOf(1.5), Instant.now().minusSeconds(10), Instant.now().plusSeconds(100000), PromotionTargetingMode.SPECIFIC_TIERS, ActiveStatus.ACTIVE);
        promotionRepository.saveAndFlush(p2);
        promotionTierRepository.saveAndFlush(new PromotionTier(p2.getId(), LoyaltyTier.GOLD));
        User member = createActiveCustomer("0901777103");
        mockMvc.perform(get("/api/v1/promotions/active")
                        .with(authenticatedCustomer(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(3))
                .andExpect(jsonPath("$.data[*].promotionCode", hasItem("All 10% Off")))
                .andExpect(jsonPath("$.data[*].promotionCode", hasItem("ALL10")));

        User gold = createActiveCustomer("0901777104");
        LoyaltyAccount goldAccount = loyaltyAccountRepository.findByCustomerId(gold.getId()).orElseThrow();
        goldAccount.updateTier(LoyaltyTier.GOLD);
        loyaltyAccountRepository.saveAndFlush(goldAccount);

        mockMvc.perform(get("/api/v1/promotions/active")
                        .with(authenticatedCustomer(gold)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(5))
                .andExpect(jsonPath("$.data[*].promotionCode", hasItem("All 10% Off")))
                .andExpect(jsonPath("$.data[*].promotionCode", hasItem("ALL10")))
                .andExpect(jsonPath("$.data[*].promotionCode", hasItem("GOLD15")));
    }

    @Test
    void openApiDocumentsCustomerLoyaltyHistoryAndPromotionSchemas() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/v1/loyalty/account']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/loyalty/transactions']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/customers/wash-history']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/promotions/active']").exists())
                .andExpect(jsonPath("$.components.schemas.LoyaltyAccountResponse.properties.currentPoints.type").value("integer"))
                .andExpect(jsonPath("$.components.schemas.LoyaltyAccountResponse.properties.totalEarnedPoints.type").value("integer"))
                .andExpect(jsonPath("$.components.schemas.RedeemPointsResponse.properties.voucherCode.type").value("string"))
                .andExpect(jsonPath("$.components.schemas.LoyaltyTransactionResponse.properties.points.type").value("integer"))
                .andExpect(jsonPath("$.components.schemas.WashHistoryItemResponse.properties.awardedPoints.type").value("integer"))
                .andExpect(jsonPath("$.components.schemas.CustomerPromotionResponse.properties.promotionCode.type").value("string"));
    }

    private String createCompletedSession(UUID bookingId) throws Exception {
        User staff = createActiveStaff("Loyalty Staff");
        Booking booking = BookingRepository.findById(bookingId).orElseThrow();
        booking.assignStaff(staff);
        BookingRepository.saveAndFlush(booking);

        String sessionId = mockMvc.perform(post("/api/v1/operations/sessions")
                        .with(authenticatedUser(staff))
                        .contentType("application/json")
                        .content("""
                                {
                                  "bookingId": "%s",
                                  "notes": "Ready for wash bay"
                                }
                                """.formatted(bookingId)))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString()
                .replaceAll(".*\"sessionId\":\"([^\"]+)\".*", "$1");

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

    private User createActiveStaff(String fullName) {
        User staff = new User(fullName, uniquePhone("0915"), "loyalty-staff-" + java.util.UUID.randomUUID() + "@example.com", "hash");
        staff.activate();
        ReflectionTestUtils.setField(staff, "role", UserRole.STAFF);
        return UserRepository.saveAndFlush(staff);
    }

    private RequestPostProcessor authenticatedUser(User user) {
        UserPrincipal principal = new UserPrincipal(user);
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

    private Booking createConfirmedBooking(String bookingId, String phone, long finalAmount) {
        User user = createActiveCustomer(phone);

        Vehicle vehicle = VehicleRepository.save(new Vehicle(
                user,
                "30H-" + phone.substring(phone.length() - 6),
                VehicleType.CAR,
                "Toyota",
                "Camry",
                2023,
                "Silver",
                true
        ));

        Booking booking = new Booking(
                UUID.randomUUID(),
                user,
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
        return BookingRepository.saveAndFlush(booking);
    }

    private User createActiveCustomer(String phone) {
        User user = new User("Nguyen Van A", phone, phone + "@example.com", "hash");
        user.activate();
        User savedUser = UserRepository.saveAndFlush(user);
        loyaltyAccountRepository.findByCustomerId(savedUser.getId())
                .orElseGet(() -> loyaltyAccountRepository.saveAndFlush(new LoyaltyAccount(savedUser)));
        return savedUser;
    }

    private org.springframework.test.web.servlet.request.RequestPostProcessor authenticatedCustomer(User user) {
        UserPrincipal principal = new UserPrincipal(user);
        UsernamePasswordAuthenticationToken token =
                new UsernamePasswordAuthenticationToken(principal, principal.getPassword(), principal.getAuthorities());
        return authentication(token);
    }
}
