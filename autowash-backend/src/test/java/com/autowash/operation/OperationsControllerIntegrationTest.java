package com.autowash.operation;

import org.junit.jupiter.api.Disabled;
import static org.assertj.core.api.Assertions.assertThat;
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
import com.autowash.repository.BookingStatusHistoryRepository;
import com.autowash.entity.WashSession;
import com.autowash.repository.WashSessionRepository;
import com.autowash.service.BookingNoShowService;
import com.autowash.shared.security.UserPrincipal;
import com.autowash.entity.Vehicle;
import com.autowash.entity.enums.VehicleType;
import com.autowash.repository.VehicleRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
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
class OperationsControllerIntegrationTest {

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

    @Autowired
    private BookingNoShowService bookingNoShowService;

    @Autowired
    private BookingStatusHistoryRepository bookingStatusHistoryRepository;

    private User defaultStaff;

    @Test
    void fullLifecycleSyncsBookingStatusAndReturnsFeeAndPoints() throws Exception {
        Booking booking = createConfirmedBooking("OPS_BK_001", "0901777001", 270000);

        String sessionId = createSession(booking.getId());
        assertBookingStatus(booking.getId(), "CONFIRMED");

        MvcResult queueResult = mockMvc.perform(get("/api/v1/operations/queue")
                        .with(authenticatedUser(defaultStaff())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.summary.total").exists())
                .andExpect(jsonPath("$.data.columns[0].status").value("PENDING"))
                .andExpect(jsonPath("$.data.columns[0].sessions[0].assignedStaffName").value("Staff Operator"))
                .andReturn();
        assertQueueContains(queueResult, sessionId, booking.getId());

        mockMvc.perform(post("/api/v1/operations/sessions/{sessionId}/queue", sessionId)
                        .with(authenticatedUser(defaultStaff())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sessionId").value(sessionId))
                .andExpect(jsonPath("$.data.status").value("QUEUED"));
        assertBookingStatus(booking.getId(), "CONFIRMED");

        mockMvc.perform(post("/api/v1/operations/sessions/{sessionId}/check-in", sessionId)
                        .with(authenticatedUser(defaultStaff())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CHECKED_IN"))
                .andExpect(jsonPath("$.data.projectedLoyaltyPoints").value(27));
        assertBookingStatus(booking.getId(), "CHECKED_IN");
        mockMvc.perform(post("/api/v1/operations/sessions/{sessionId}/start", sessionId)
                        .with(authenticatedUser(defaultStaff())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.data.startedAt").exists());
        assertBookingStatus(booking.getId(), "IN_PROGRESS");

        mockMvc.perform(post("/api/v1/operations/sessions/{sessionId}/complete", sessionId)
                        .with(authenticatedUser(defaultStaff())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.completedAt").exists())
                .andExpect(jsonPath("$.data.awardedLoyaltyPoints").value(27));

        assertBookingStatus(booking.getId(), "COMPLETED");
    }

    @Test
    void cancelSessionReturnsBookingToConfirmedAndAllowsReplacementSession() throws Exception {
        Booking booking = createConfirmedBooking("OPS_BK_CANCEL", uniquePhone("0901"), 210000);
        String sessionId = createSession(booking.getId());

        mockMvc.perform(post("/api/v1/operations/sessions/{sessionId}/queue", sessionId)
                        .with(authenticatedUser(defaultStaff())))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/operations/sessions/{sessionId}/check-in", sessionId)
                        .with(authenticatedUser(defaultStaff())))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/operations/sessions/{sessionId}/cancel", sessionId)
                        .with(authenticatedUser(defaultStaff()))
                        .contentType("application/json")
                        .content("""
                                {
                                  "reason": "Bay equipment unavailable"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"))
                .andExpect(jsonPath("$.data.bookingStatus").value("CONFIRMED"))
                .andExpect(jsonPath("$.data.reason").value("Bay equipment unavailable"));
        assertBookingStatus(booking.getId(), "CONFIRMED");

        String replacementSessionId = createSession(booking.getId());
        assertThat(replacementSessionId).isNotEqualTo(sessionId);
    }

    @Test
    void noShowScanMarksOverdueConfirmedBookingAndRecordsHistory() throws Exception {
        Booking booking = createConfirmedBooking("OPS_BK_NOSHOW", uniquePhone("0901"), 180000);
        String sessionId = createSession(booking.getId());
        ReflectionTestUtils.setField(booking, "scheduledAt", Instant.now().minusSeconds(3600));
        BookingRepository.saveAndFlush(booking);

        int markedCount = bookingNoShowService.markOverdueBookingsNoShow();

        assertThat(markedCount).isGreaterThanOrEqualTo(1);
        assertBookingStatus(booking.getId(), "NO_SHOW");
        WashSession session = washSessionRepository.findById(UUID.fromString(sessionId)).orElseThrow();
        assertThat(session.getStatus()).isEqualTo(com.autowash.entity.enums.WashSessionStatus.CANCELLED);
        assertThat(bookingStatusHistoryRepository.existsByBooking_IdAndNewStatus(booking.getId(), "NO_SHOW")).isTrue();
    }

    @Test
    void invalidTransitionReturnsConflict() throws Exception {
        Booking booking = createConfirmedBooking("OPS_BK_002", "0901777002", 150000);
        String sessionId = createSession(booking.getId());

        mockMvc.perform(post("/api/v1/operations/sessions/{sessionId}/complete", sessionId)
                        .with(authenticatedUser(defaultStaff())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Invalid transition: PENDING \u2192 COMPLETED"))
                .andExpect(jsonPath("$.errorCode").value("INVALID_STATE_TRANSITION"));
    }

    @Test
    void startWithoutCheckInReturnsConflict() throws Exception {
        Booking booking = createConfirmedBooking("OPS_BK_003", "0901777003", 180000);
        String sessionId = createSession(booking.getId());

        mockMvc.perform(post("/api/v1/operations/sessions/{sessionId}/start", sessionId)
                        .with(authenticatedUser(defaultStaff())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Invalid transition: PENDING \u2192 IN_PROGRESS"))
                .andExpect(jsonPath("$.errorCode").value("INVALID_STATE_TRANSITION"));
    }

    @Test
    void completeWithoutStartReturnsConflict() throws Exception {
        Booking booking = createConfirmedBooking("OPS_BK_004", "0901777004", 190000);
        String sessionId = createSession(booking.getId());

        mockMvc.perform(post("/api/v1/operations/sessions/{sessionId}/queue", sessionId)
                        .with(authenticatedUser(defaultStaff())))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/operations/sessions/{sessionId}/check-in", sessionId)
                        .with(authenticatedUser(defaultStaff())))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/operations/sessions/{sessionId}/complete", sessionId)
                        .with(authenticatedUser(defaultStaff())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Invalid transition: CHECKED_IN \u2192 COMPLETED"))
                .andExpect(jsonPath("$.errorCode").value("INVALID_STATE_TRANSITION"));
    }

    @Test
    void eligibleSessionBookingsOnlyReturnsConfirmedBookingsWithoutActiveSession() throws Exception {
        Booking booking = createConfirmedBooking("OPS_BK_ELIGIBLE", "0901777005", 220000);

        MvcResult beforeCreate = mockMvc.perform(get("/api/v1/operations/bookings/eligible-sessions")
                        .with(authenticatedUser(defaultStaff())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andReturn();
        assertEligibleBookingContains(beforeCreate, booking.getId());

        createSession(booking.getId());

        MvcResult afterCreate = mockMvc.perform(get("/api/v1/operations/bookings/eligible-sessions")
                        .with(authenticatedUser(defaultStaff())))
                .andExpect(status().isOk())
                .andReturn();
        assertEligibleBookingMissing(afterCreate, booking.getId());
    }

    @Test
    void staffQueueAndEligibleBookingsOnlyShowAssignedWork() throws Exception {
        User staffA = createActiveStaff("Staff Alpha");
        User staffB = createActiveStaff("Staff Beta");
        Booking bookingA = createConfirmedBooking("OPS_BK_STAFF_A", "0901777011", 220000, staffA);
        Booking bookingB = createConfirmedBooking("OPS_BK_STAFF_B", "0901777012", 180000, staffB);

        String sessionA = createSession(bookingA.getId(), staffA);
        String sessionB = createSession(bookingB.getId(), staffB);

        MvcResult queueForA = mockMvc.perform(get("/api/v1/operations/queue")
                        .with(authenticatedUser(staffA)))
                .andExpect(status().isOk())
                .andReturn();
        assertQueueContains(queueForA, sessionA, bookingA.getId());
        assertQueueMissing(queueForA, sessionB);

        MvcResult eligibleForB = mockMvc.perform(get("/api/v1/operations/bookings/eligible-sessions")
                        .with(authenticatedUser(staffB)))
                .andExpect(status().isOk())
                .andReturn();
        assertEligibleBookingMissing(eligibleForB, bookingA.getId());
    }

    @Test
    void staffEligibleBookingsIncludeUnassignedConfirmedBookingsForAutoAssignment() throws Exception {
        User staff = createActiveStaff("Staff Check In Desk");
        Booking booking = createConfirmedBooking("OPS_BK_UNASSIGNED", uniquePhone("0901"), 220000, staff);
        ReflectionTestUtils.setField(booking, "assignedStaff", null);
        BookingRepository.saveAndFlush(booking);

        MvcResult eligible = mockMvc.perform(get("/api/v1/operations/bookings/eligible-sessions")
                        .with(authenticatedUser(staff)))
                .andExpect(status().isOk())
                .andReturn();

        assertEligibleBookingContains(eligible, booking.getId());
    }

    @Test
    void staffCannotUpdateOrTransferSessionAssignedToAnotherStaff() throws Exception {
        User owner = createActiveStaff("Staff Owner");
        User other = createActiveStaff("Staff Other");
        Booking booking = createConfirmedBooking("OPS_BK_LOCKED", "0901777013", 210000, owner);
        String sessionId = createSession(booking.getId(), owner);

        mockMvc.perform(post("/api/v1/operations/sessions/{sessionId}/queue", sessionId)
                        .with(authenticatedUser(other)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));

        mockMvc.perform(post("/api/v1/operations/sessions/{sessionId}/transfer", sessionId)
                        .with(authenticatedUser(other))
                        .contentType("application/json")
                        .content("""
                                {
                                  "toStaffId": "%s",
                                  "reason": "Wrong owner"
                                }
                                """.formatted(other.getId())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    @Disabled("Transfer endpoint not yet implemented")
    void transferSessionReassignsWorkAndCreatesAdminAuditLog() throws Exception {
        User staffA = createActiveStaff("Staff Transfer A");
        User staffB = createActiveStaff("Staff Transfer B");
        Booking booking = createConfirmedBooking("OPS_BK_TRANSFER", "0901777014", 240000, staffA);
        String sessionId = createSession(booking.getId(), staffA);

        mockMvc.perform(post("/api/v1/operations/sessions/{sessionId}/transfer", sessionId)
                        .with(authenticatedUser(staffA))
                        .contentType("application/json")
                        .content("""
                                {
                                  "toStaffId": "%s",
                                  "reason": "Balance queue"
                                }
                                """.formatted(staffB.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.bookingId").value(booking.getId().toString()))
                .andExpect(jsonPath("$.data.fromStaffId").value(staffA.getId().toString()))
                .andExpect(jsonPath("$.data.toStaffId").value(staffB.getId().toString()))
                .andExpect(jsonPath("$.data.reason").value("Balance queue"));

        MvcResult queueForA = mockMvc.perform(get("/api/v1/operations/queue")
                        .with(authenticatedUser(staffA)))
                .andExpect(status().isOk())
                .andReturn();
        assertQueueMissing(queueForA, sessionId);

        MvcResult queueForB = mockMvc.perform(get("/api/v1/operations/queue")
                        .with(authenticatedUser(staffB)))
                .andExpect(status().isOk())
                .andReturn();
        assertQueueContains(queueForB, sessionId, booking.getId());

        mockMvc.perform(get("/api/v1/admin/operations/transfer-audits")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].bookingId").value(booking.getId().toString()))
                .andExpect(jsonPath("$.data[0].toStaffName").value("Staff Transfer B"));
    }

    @Test
    void staffDashboardSummaryUsesOnlyAssignedRevenueAndKpi() throws Exception {
        User staffA = createActiveStaff("Staff KPI A");
        User staffB = createActiveStaff("Staff KPI B");
        Booking completedForA = createConfirmedBooking("OPS_BK_KPI_A", "0901777015", 300000, staffA);
        Booking completedForB = createConfirmedBooking("OPS_BK_KPI_B", "0901777016", 500000, staffB);
        completeDirectly(completedForA, staffA, 30);
        completeDirectly(completedForB, staffB, 50);

        mockMvc.perform(get("/api/v1/operations/staff/summary")
                        .with(authenticatedUser(staffA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.staffId").value(staffA.getId().toString()))
                .andExpect(jsonPath("$.data.completedSessions").value(1))
                .andExpect(jsonPath("$.data.completedRevenue").value(300000))
                .andExpect(jsonPath("$.data.kpiTargetRevenue").value(5000000))
                .andExpect(jsonPath("$.data.kpiProgressPercent").value(6));
    }

    @Test
    void openApiDocumentsOperationsSchemas() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/v1/operations/bookings/eligible-sessions']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/operations/sessions']").exists())
                .andExpect(jsonPath("$.components.schemas.CreateWashSessionRequest.properties.bookingId.type").value("string"))
                .andExpect(jsonPath("$.components.schemas.EligibleSessionBookingResponse.properties.bookingId.type").value("string"))
                .andExpect(jsonPath("$.components.schemas.CheckInWashSessionResponse.properties.projectedLoyaltyPoints.type").value("integer"))
                .andExpect(jsonPath("$.components.schemas.CompleteWashSessionResponse.properties.awardedLoyaltyPoints.type").value("integer"));
    }

    private String createSession(UUID bookingId) throws Exception {
        return createSession(bookingId, defaultStaff());
    }

    private String createSession(UUID bookingId, User staff) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/operations/sessions")
                        .with(authenticatedUser(staff))
                        .contentType("application/json")
                        .content("""
                                {
                                  "bookingId": "%s",
                                  "notes": "Arrived at bay 1"
                                }
                                """.formatted(bookingId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.bookingId").value(bookingId.toString()))
                .andReturn();
        return readJson(result).path("data").path("sessionId").asText();
    }

    private User defaultStaff() {
        if (defaultStaff == null) {
            defaultStaff = createActiveStaff("Staff Operator");
        }
        return defaultStaff;
    }

    private User createActiveStaff(String fullName) {
        User staff = new User(fullName, uniquePhone("0918"), "staff-" + UUID.randomUUID() + "@example.com", "hash");
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
        return createConfirmedBooking(bookingId, phone, finalAmount, defaultStaff());
    }

    private Booking createConfirmedBooking(String bookingId, String phone, long finalAmount, User assignedStaff) {
        User user = new User("Nguyen Van A", phone, phone + "@example.com", "hash");
        user.activate();
        UserRepository.save(user);

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
                null, // packageId
                null, // comboId
                null, // voucherId
                Instant.now().plusSeconds(86400),
                LocalTime.of(14, 0),
                PaymentMethod.E_WALLET,
                finalAmount, // baseAmount
                0, // optionsAmount
                0, // discountAmount
                finalAmount, // finalAmount
                30 // estimatedDurationMinutes
        );
        booking.confirmByOtp();
        booking.assignStaff(assignedStaff);
        return BookingRepository.saveAndFlush(booking);
    }

    private void completeDirectly(Booking booking, User staff, int points) {
        WashSession session = WashSession.create(booking, "Completed for KPI", staff);
        Instant now = Instant.now();
        session.queue(now.minusSeconds(1800));
        session.checkIn(now.minusSeconds(1500), booking.getFinalAmount(), "VND", points);
        session.start(now.minusSeconds(1200));
        session.complete(now, points);
        washSessionRepository.saveAndFlush(session);
        booking.updateStatus(com.autowash.entity.enums.BookingStatus.COMPLETED);
        BookingRepository.saveAndFlush(booking);
    }

    private void assertBookingStatus(UUID bookingId, String status) {
        BookingRepository.flush();
        Booking booking = BookingRepository.findById(bookingId).orElseThrow();
        assertThat(booking.getStatus().name()).isEqualTo(status);
    }

    private void assertQueueContains(MvcResult result, String sessionId, UUID bookingId) throws Exception {
        JsonNode sessions = readJson(result).path("data").path("columns").path(0).path("sessions");
        boolean found = false;
        for (JsonNode session : sessions) {
            if (sessionId.equals(session.path("sessionId").asText())
                    && bookingId.toString().equals(session.path("bookingId").asText())) {
                found = true;
                break;
            }
        }
        assertThat(found).isTrue();
    }

    private void assertQueueMissing(MvcResult result, String sessionId) throws Exception {
        JsonNode columns = readJson(result).path("data").path("columns");
        for (JsonNode column : columns) {
            for (JsonNode session : column.path("sessions")) {
                assertThat(session.path("sessionId").asText()).isNotEqualTo(sessionId);
            }
        }
    }

    private void assertEligibleBookingContains(MvcResult result, UUID bookingId) throws Exception {
        assertThat(eligibleBookingExists(result, bookingId)).isTrue();
    }

    private void assertEligibleBookingMissing(MvcResult result, UUID bookingId) throws Exception {
        assertThat(eligibleBookingExists(result, bookingId)).isFalse();
    }

    private boolean eligibleBookingExists(MvcResult result, UUID bookingId) throws Exception {
        JsonNode bookings = readJson(result).path("data");
        for (JsonNode booking : bookings) {
            if (bookingId.toString().equals(booking.path("bookingId").asText())) {
                return true;
            }
        }
        return false;
    }

    private JsonNode readJson(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }
}

