package com.autowash.booking;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.autowash.entity.User;
import com.autowash.entity.enums.UserRole;
import com.autowash.repository.UserRepository;
import com.autowash.entity.enums.BookingStatus;
import com.autowash.repository.BookingRepository;
import com.autowash.entity.LoyaltyAccount;
import com.autowash.repository.LoyaltyAccountRepository;
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
import java.time.LocalDate;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BookingControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private BookingRepository BookingRepository;


    @Autowired
    private UserRepository UserRepository;

    @Autowired
    private LoyaltyAccountRepository loyaltyAccountRepository;

    @BeforeEach
    void ensureActiveStaffExists() {
        User staff = new User("Booking Assignment Staff", uniquePhone("0914"), "booking-assignment-" + java.util.UUID.randomUUID() + "@example.com", "hash");
        staff.activate();
        ReflectionTestUtils.setField(staff, "role", UserRole.STAFF);
        UserRepository.saveAndFlush(staff);
    }

    @Test
    void getPackagesReturnsPaginatedActivePackages() throws Exception {
        mockMvc.perform(get("/api/v1/packages").param("page", "1").param("limit", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].packageId").value("12345678-1234-1234-1234-123456789012"))
                .andExpect(jsonPath("$.pagination.page").value(1))
                .andExpect(jsonPath("$.pagination.limit").value(20));
    }

    @Test
    void getServicesReturnsActiveServices() throws Exception {
        mockMvc.perform(get("/api/v1/services"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].serviceId").value("33333333-1234-1234-1234-123456789012"));
    }

    @Test
    void getAvailableCombosReturnsActiveCombos() throws Exception {
        mockMvc.perform(get("/api/v1/combos/available"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].comboId").value("55555555-1234-1234-1234-123456789012"));
    }

    @Test
    void validateVoucherReturnsDiscountBreakdown() throws Exception {
        String accessToken = registerActivateAndLogin("0901234701");

        mockMvc.perform(post("/api/v1/bookings/validate-voucher")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "voucherCode": "WELCOME20",
                                  "packageId": "12345678-1234-1234-1234-123456789012",
                                  "amount": 150000
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.voucherCode").value("WELCOME20"))
                .andExpect(jsonPath("$.data.isValid").value(true))
                .andExpect(jsonPath("$.data.discountAmount").value(30000))
                .andExpect(jsonPath("$.data.finalAmount").value(120000));
    }

    @Test
    void validateVoucherReturnsContractErrorForExpiredVoucher() throws Exception {
        String accessToken = registerActivateAndLogin("0901234702");

        mockMvc.perform(post("/api/v1/bookings/validate-voucher")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "voucherCode": "OLD10",
                                  "packageId": "12345678-1234-1234-1234-123456789012",
                                  "amount": 150000
                                }
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errorCode").value("BUSINESS_RULE_VIOLATION"))
                .andExpect(jsonPath("$.error.code").value("VOUCHER_EXPIRED"));
    }

    @Test
    void createBookingCreatesPendingAndPayConfirmsBooking() throws Exception {
        String accessToken = registerActivateAndLogin("0901234703");
        String vehicleId = createVehicle(accessToken, "30H-223456");

        JsonNode createResponse = readJson(mockMvc.perform(post("/api/v1/customers/bookings")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "vehicleId": "%s",
                                  "packageId": "12345678-1234-1234-1234-123456789012",
                                  "bookingDate": "%s",
                                  "bookingTime": "14:00",
                                  "voucherCode": "WELCOME20",
                                  "paymentMethod": "E_WALLET"
                                }
                                """.formatted(vehicleId, futureBookingDate())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.confirmationStatus").value("PENDING"))
                .andExpect(jsonPath("$.data.paymentStatus").value("PENDING_PAYMENT"))
                .andExpect(jsonPath("$.data.vehicleId").value(vehicleId))
                .andExpect(jsonPath("$.data.finalAmount").value(120000))
                .andReturn());

        String bookingId = createResponse.path("data").path("bookingId").asText();
        payBooking(accessToken, bookingId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.bookingStatus").value("CONFIRMED"));
    }

    @Test
    void createComboBookingCreatesOwnedComboAndActiveComboLookup() throws Exception {
        String accessToken = registerActivateAndLogin("0901234720");
        String vehicleId = createVehicle(accessToken, "30H-223468");

        mockMvc.perform(post("/api/v1/customers/bookings")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "vehicleId": "%s",
                                  "comboId": "55555555-1234-1234-1234-123456789012",
                                  "bookingDate": "%s",
                                  "bookingTime": "14:00",
                                  "paymentMethod": "E_WALLET"
                                }
                                """.formatted(vehicleId, futureBookingDate())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.comboId").value("55555555-1234-1234-1234-123456789012"))
                .andExpect(jsonPath("$.data.customerComboId").isNotEmpty())
                .andExpect(jsonPath("$.data.comboPurchased").value(true));

        mockMvc.perform(get("/api/v1/customers/combos/active")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].comboId").value("55555555-1234-1234-1234-123456789012"))
                .andExpect(jsonPath("$.data[0].remainingUsages").value(4));
    }

    @Test
    void activateComboCreatesOwnedCombo() throws Exception {
        String accessToken = registerActivateAndLogin("0901234721");

        mockMvc.perform(post("/api/v1/customers/combos/{comboId}/activate", "55555555-1234-1234-1234-123456789012")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "comboId": "55555555-1234-1234-1234-123456789012",
                                  "paymentMethod": "E_WALLET"
                                }
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.comboId").value("55555555-1234-1234-1234-123456789012"))
                .andExpect(jsonPath("$.data.paymentMethod").value("E_WALLET"))
                .andExpect(jsonPath("$.data.paymentStatus").value("PENDING"));
    }

    @Test
    void createBookingRejectsVehicleOwnedByAnotherCustomer() throws Exception {
        String ownerToken = registerActivateAndLogin("0901234704");
        String otherToken = registerActivateAndLogin("0901234705");
        String vehicleId = createVehicle(ownerToken, "30H-223457");

        mockMvc.perform(post("/api/v1/customers/bookings")
                        .header("Authorization", "Bearer " + otherToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "vehicleId": "%s",
                                  "packageId": "12345678-1234-1234-1234-123456789012",
                                  "bookingDate": "%s",
                                  "bookingTime": "14:00",
                                  "paymentMethod": "E_WALLET"
                                }
                                """.formatted(vehicleId, futureBookingDate())))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    void createBookingRejectsInvalidBookingTimeFormatWithValidationError() throws Exception {
        String accessToken = registerActivateAndLogin("0901234710");
        String vehicleId = createVehicle(accessToken, "30H-223460");

        mockMvc.perform(post("/api/v1/customers/bookings")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "vehicleId": "%s",
                                  "packageId": "12345678-1234-1234-1234-123456789012",
                                  "bookingDate": "%s",
                                  "bookingTime": "2pm",
                                  "paymentMethod": "E_WALLET"
                                }
                                """.formatted(vehicleId, futureBookingDate())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors[0].field").value("bookingTime"));
    }

    @Test
    void createBookingRejectsOutsideOperatingHours() throws Exception {
        String accessToken = registerActivateAndLogin("0901234722");
        String vehicleId = createVehicle(accessToken, "30H-223469");

        mockMvc.perform(post("/api/v1/customers/bookings")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "vehicleId": "%s",
                                  "packageId": "12345678-1234-1234-1234-123456789012",
                                  "bookingDate": "%s",
                                  "bookingTime": "23:00",
                                  "paymentMethod": "E_WALLET"
                                }
                                """.formatted(vehicleId, futureBookingDate())))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errorCode").value("BUSINESS_RULE_VIOLATION"));
    }

    @Test
    void createBookingRejectsDateBeyondAdvanceWindow() throws Exception {
        String accessToken = registerActivateAndLogin("0901234723");
        String vehicleId = createVehicle(accessToken, "30H-223470");

        mockMvc.perform(post("/api/v1/customers/bookings")
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
                                """.formatted(vehicleId, LocalDate.now().plusDays(31))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errorCode").value("BUSINESS_RULE_VIOLATION"));
    }

    @Test
    void newCustomerOnlyVoucherRequiresNoPriorBookings() throws Exception {
        String accessToken = registerActivateAndLogin("0901234724");
        String vehicleId = createVehicle(accessToken, "30H-223471");

        mockMvc.perform(post("/api/v1/customers/bookings")
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
                                """.formatted(vehicleId, futureBookingDate())))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/customers/bookings")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "vehicleId": "%s",
                                  "packageId": "12345678-1234-1234-1234-123456789012",
                                  "bookingDate": "%s",
                                  "bookingTime": "15:00",
                                  "voucherCode": "WELCOME20",
                                  "paymentMethod": "E_WALLET"
                                }
                                """.formatted(vehicleId, futureBookingDate())))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("NEW_CUSTOMER_ONLY"));
    }

    @Test
    void voucherCanOnlyBeUsedOnceBySameCustomer() throws Exception {
        String accessToken = registerActivateAndLogin("0901234725");
        String vehicleId = createVehicle(accessToken, "30H-223472");

        mockMvc.perform(post("/api/v1/customers/bookings")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "vehicleId": "%s",
                                  "packageId": "12345678-1234-1234-1234-123456789012",
                                  "bookingDate": "%s",
                                  "bookingTime": "14:00",
                                  "voucherCode": "ADMINVOUCHER50",
                                  "paymentMethod": "E_WALLET"
                                }
                                """.formatted(vehicleId, futureBookingDate())))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/customers/bookings")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "vehicleId": "%s",
                                  "packageId": "12345678-1234-1234-1234-123456789012",
                                  "bookingDate": "%s",
                                  "bookingTime": "15:00",
                                  "voucherCode": "ADMINVOUCHER50",
                                  "paymentMethod": "E_WALLET"
                                }
                                """.formatted(vehicleId, futureBookingDate())))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("VOUCHER_ALREADY_USED"));
    }

    @Test
    void getBookingsAndDetailAreOwnerScoped() throws Exception {
        String firstToken = registerActivateAndLogin("0901234706");
        String secondToken = registerActivateAndLogin("0901234707");
        String vehicleId = createVehicle(firstToken, "30H-223458");
        String bookingId = createVerifiedBooking(firstToken, vehicleId);

        mockMvc.perform(get("/api/v1/customers/bookings").header("Authorization", "Bearer " + firstToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].bookingId").value(bookingId))
                .andExpect(jsonPath("$.data[0].packageName").value("Basic Wash"));

        mockMvc.perform(get("/api/v1/customers/bookings/{bookingId}", bookingId)
                        .header("Authorization", "Bearer " + firstToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.bookingId").value(bookingId))
                .andExpect(jsonPath("$.data.packageName").value("Basic Wash"));

        mockMvc.perform(get("/api/v1/customers/bookings/{bookingId}", bookingId)
                        .header("Authorization", "Bearer " + secondToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    void getBookingDetailIncludesLinkedWashSession() throws Exception {
        String accessToken = registerActivateAndLogin("0901234712");
        String vehicleId = createVehicle(accessToken, "30H-223461");
        String bookingId = createVerifiedBooking(accessToken, vehicleId);
        String sessionId = createWashSession(bookingId, "Customer arrived at bay 2");

        mockMvc.perform(get("/api/v1/customers/bookings/{bookingId}", bookingId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.bookingId").value(bookingId))
                .andExpect(jsonPath("$.data.washSessionId").value(sessionId))
                .andExpect(jsonPath("$.data.staffName").isString())
                .andExpect(jsonPath("$.data.washStatus").value("PENDING"))
                .andExpect(jsonPath("$.data.notes").value("Customer arrived at bay 2"));
    }

    @Test
    void customerWashTrackingReturnsActiveSessionAndOwnerScopedDetail() throws Exception {
        String firstToken = registerActivateAndLogin("0901234716");
        String secondToken = registerActivateAndLogin("0901234717");
        String vehicleId = createVehicle(firstToken, "30H-223465");
        String bookingId = createVerifiedBooking(firstToken, vehicleId);
        String sessionId = createWashSession(bookingId, "Tracking from customer app");

        mockMvc.perform(get("/api/v1/customers/wash-tracking/active")
                        .header("Authorization", "Bearer " + firstToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.washSessionId").value(sessionId))
                .andExpect(jsonPath("$.data.bookingId").value(bookingId))
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.vehiclePlate").value("30H-223465"));

        mockMvc.perform(get("/api/v1/customers/wash-tracking/{washSessionId}", sessionId)
                        .header("Authorization", "Bearer " + firstToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.notes").value("Tracking from customer app"));

        mockMvc.perform(get("/api/v1/customers/wash-tracking/{washSessionId}", sessionId)
                        .header("Authorization", "Bearer " + secondToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    void listBookingsRejectsInvalidStatusWithValidationError() throws Exception {
        String accessToken = registerActivateAndLogin("0901234711");

        mockMvc.perform(get("/api/v1/customers/bookings")
                        .header("Authorization", "Bearer " + accessToken)
                        .param("status", "INVALID_STATUS"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors[0].field").value("status"));
    }

    @Test
    void cancelBookingTransitionsConfirmedBookingToCancelled() throws Exception {
        String accessToken = registerActivateAndLogin("0901234708");
        String vehicleId = createVehicle(accessToken, "30H-223459");
        String bookingId = createVerifiedBooking(accessToken, vehicleId);

        mockMvc.perform(post("/api/v1/customers/bookings/{bookingId}/cancel", bookingId)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "reason": "Cannot make it to appointment"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"))
                .andExpect(jsonPath("$.data.refundStatus").value("NONE"));
    }

    @Test
    void cancelBookingAllowsPendingBooking() throws Exception {
        String accessToken = registerActivateAndLogin("0901234713");
        String vehicleId = createVehicle(accessToken, "30H-223462");
        String bookingId = createBooking(accessToken, vehicleId).path("data").path("bookingId").asText();
        setBookingStatus(bookingId, BookingStatus.PENDING);

        mockMvc.perform(post("/api/v1/customers/bookings/{bookingId}/cancel", bookingId)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "reason": "Pending booking no longer needed"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"))
                .andExpect(jsonPath("$.data.refundStatus").value("NONE"));
    }

    @Test
    void cancelBookingRejectsInProgressBookingWithResourceLocked() throws Exception {
        String accessToken = registerActivateAndLogin("0901234714");
        String vehicleId = createVehicle(accessToken, "30H-223463");
        String bookingId = createVerifiedBooking(accessToken, vehicleId);
        setBookingStatus(bookingId, BookingStatus.IN_PROGRESS);

        mockMvc.perform(post("/api/v1/customers/bookings/{bookingId}/cancel", bookingId)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "reason": "Trying to cancel after wash started"
                                }
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errorCode").value("RESOURCE_LOCKED"));
    }

    @Test
    void cancelBookingRejectsCompletedBookingWithResourceLocked() throws Exception {
        String accessToken = registerActivateAndLogin("0901234715");
        String vehicleId = createVehicle(accessToken, "30H-223464");
        String bookingId = createVerifiedBooking(accessToken, vehicleId);
        setBookingStatus(bookingId, BookingStatus.COMPLETED);

        mockMvc.perform(post("/api/v1/customers/bookings/{bookingId}/cancel", bookingId)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "reason": "Trying to cancel completed service"
                                }
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errorCode").value("RESOURCE_LOCKED"));
    }

    @Test
    void openApiDocumentsBookingAndCatalogSchemas() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.components.schemas.ValidateVoucherRequest.properties.voucherCode.type").value("string"))
                .andExpect(jsonPath("$.components.schemas.CreateBookingRequest.properties.vehicleId.type").value("string"))
                .andExpect(jsonPath("$.components.schemas.CreateBookingResponse.properties.bookingId.type").value("string"))
                .andExpect(jsonPath("$.components.schemas.CancelBookingResponse.properties.refundStatus.type").value("string"));
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/v1/customers/wash-tracking/active']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/customers/wash-tracking/{washSessionId}']").exists());
    }



    private JsonNode createBooking(String accessToken, String vehicleId) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/customers/bookings")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "vehicleId": "%s",
                                  "packageId": "12345678-1234-1234-1234-123456789012",
                                  "options": ["33333333-1234-1234-1234-123456789012"],
                                  "bookingDate": "%s",
                                  "bookingTime": "14:00",
                                  "voucherCode": "WELCOME20",
                                  "paymentMethod": "E_WALLET"
                                }
                                """.formatted(vehicleId, futureBookingDate())))
                .andReturn();
        return readJson(result);
    }

    private String createVerifiedBooking(String accessToken, String vehicleId) throws Exception {
        String bookingId = createBooking(accessToken, vehicleId).path("data").path("bookingId").asText();
        payBooking(accessToken, bookingId).andExpect(status().isOk());
        return bookingId;
    }

    private org.springframework.test.web.servlet.ResultActions payBooking(String accessToken, String bookingId) throws Exception {
        return mockMvc.perform(post("/api/v1/customers/bookings/{bookingId}/pay", bookingId)
                .header("Authorization", "Bearer " + accessToken)
                .contentType("application/json")
                .content("""
                        {
                          "transactionRef": "TXN_123"
                        }
                        """));
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

    private RequestPostProcessor authenticatedAdmin() {
        User admin = new User("Booking Admin", uniquePhone("0986"), "booking-admin-" + java.util.UUID.randomUUID() + "@example.com", "hash");
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

    private String futureBookingDate() {
        return LocalDate.now().plusDays(7).toString();
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

    private void setBookingStatus(String bookingId, BookingStatus status) {
        var booking = BookingRepository.findById(java.util.UUID.fromString(bookingId)).orElseThrow();
        booking.updateStatus(status);
        BookingRepository.saveAndFlush(booking);
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
