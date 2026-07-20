package com.autowash.controller;

import com.autowash.dto.CheckInWashSessionResponse;
import com.autowash.dto.CreateWashSessionRequest;
import com.autowash.dto.CreateWashSessionResponse;
import com.autowash.dto.EligibleSessionBookingResponse;
import com.autowash.dto.OperationsQueueResponse;
import com.autowash.dto.StaffOptionResponse;
import com.autowash.service.OperationsService;
import com.autowash.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequestMapping("/api/v1/manager/operations")
@Tag(name = "Manager Operations")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
public class ManagerOperationsController {

    private final OperationsService operationsService;

    public ManagerOperationsController(OperationsService operationsService) {
        this.operationsService = operationsService;
    }

    @GetMapping("/command-center")
    @Operation(summary = "Get manager operations command center MVP data")
    public ApiResponse<CommandCenterResponse> getCommandCenter(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "ALL") String staffId,
            @RequestParam(defaultValue = "ALL") String focus
    ) {
        List<EligibleSessionBookingResponse> candidates = filterBookings(operationsService.listEligibleSessionBookings(50), date, search);
        List<OperationsQueueResponse.WashSessionCard> sessions = filterSessions(flattenSessions(operationsService.getQueue()), date, search, staffId, focus);
        List<StaffOptionResponse> staff = operationsService.listActiveStaff();
        MetricsResponse metrics = buildMetrics(candidates, sessions);
        List<InterventionResponse> interventions = buildInterventions(sessions);

        return ApiResponse.ok(
                "Manager command center retrieved",
                new CommandCenterResponse(
                        new SummaryResponse(resolveDate(date), interventions.size(), Instant.now()),
                        candidates,
                        interventions,
                        metrics,
                        buildStaffWorkload(staff, sessions),
                        buildBoard(candidates, sessions)
                )
        );
    }

    @GetMapping("/summary")
    public ApiResponse<SummaryResponse> getSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        List<OperationsQueueResponse.WashSessionCard> sessions = flattenSessions(operationsService.getQueue());
        return ApiResponse.ok("Manager operations summary retrieved", new SummaryResponse(resolveDate(date), buildInterventions(sessions).size(), Instant.now()));
    }

    @GetMapping("/metrics")
    public ApiResponse<MetricsResponse> getMetrics(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        List<EligibleSessionBookingResponse> candidates = filterBookings(operationsService.listEligibleSessionBookings(50), date, null);
        List<OperationsQueueResponse.WashSessionCard> sessions = filterSessions(flattenSessions(operationsService.getQueue()), date, null, "ALL", "ALL");
        return ApiResponse.ok("Manager operations metrics retrieved", buildMetrics(candidates, sessions));
    }

    @GetMapping("/check-in-candidates")
    public ApiResponse<List<EligibleSessionBookingResponse>> getCheckInCandidates(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String search
    ) {
        return ApiResponse.ok("Manager check-in candidates retrieved", filterBookings(operationsService.listEligibleSessionBookings(50), date, search));
    }

    @GetMapping("/interventions")
    public ApiResponse<List<InterventionResponse>> getInterventions(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        List<OperationsQueueResponse.WashSessionCard> sessions = filterSessions(flattenSessions(operationsService.getQueue()), date, null, "ALL", "ALL");
        return ApiResponse.ok("Manager interventions retrieved", buildInterventions(sessions));
    }

    @GetMapping("/staff-workload")
    public ApiResponse<List<StaffWorkloadResponse>> getStaffWorkload(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        List<OperationsQueueResponse.WashSessionCard> sessions = filterSessions(flattenSessions(operationsService.getQueue()), date, null, "ALL", "ALL");
        return ApiResponse.ok("Manager staff workload retrieved", buildStaffWorkload(operationsService.listActiveStaff(), sessions));
    }

    @GetMapping("/board")
    public ApiResponse<BoardResponse> getBoard(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "ALL") String staffId,
            @RequestParam(defaultValue = "ALL") String focus
    ) {
        List<EligibleSessionBookingResponse> candidates = filterBookings(operationsService.listEligibleSessionBookings(50), date, search);
        List<OperationsQueueResponse.WashSessionCard> sessions = filterSessions(flattenSessions(operationsService.getQueue()), date, search, staffId, focus);
        return ApiResponse.ok("Manager operations board retrieved", buildBoard(candidates, sessions));
    }

    @GetMapping("/sessions/{sessionId}")
    public ApiResponse<SessionDetailResponse> getSessionDetail(@PathVariable UUID sessionId) {
        OperationsQueueResponse.WashSessionCard session = flattenSessions(operationsService.getQueue()).stream()
                .filter(item -> item.sessionId().equals(sessionId))
                .findFirst()
                .orElseThrow();
        return ApiResponse.ok("Manager session detail retrieved", toSessionDetail(session));
    }

    @GetMapping("/sessions/{sessionId}/transfer-options")
    public ApiResponse<List<TransferOptionResponse>> getTransferOptions(@PathVariable UUID sessionId) {
        List<OperationsQueueResponse.WashSessionCard> sessions = flattenSessions(operationsService.getQueue());
        return ApiResponse.ok(
                "Manager transfer options retrieved",
                buildStaffWorkload(operationsService.listActiveStaff(), sessions).stream()
                        .map(staff -> new TransferOptionResponse(
                                staff.staffId(),
                                staff.fullName(),
                                staff.status(),
                                staff.todayKpiCompleted(),
                                staff.todayKpiTarget(),
                                staff.recentRating(),
                                staff.activeSessionCount() == 0 ? "HIGH" : "MEDIUM",
                                staff.activeSessionCount() == 0 ? "Available now" : "Has active workload",
                                staff.activeSessionCount() < 3
                        ))
                        .toList()
        );
    }

    @PostMapping("/bookings/{bookingId}/check-in")
    public ApiResponse<BookingCheckInResponse> checkInBooking(@PathVariable String bookingId) {
        CreateWashSessionResponse created = operationsService.createSession(new CreateWashSessionRequest(bookingId, "Manager check-in"));
        CheckInWashSessionResponse checkedIn = operationsService.checkInSession(created.sessionId());
        return ApiResponse.ok(
                "Manager booking checked in",
                new BookingCheckInResponse(
                        bookingId,
                        created.sessionId(),
                        checkedIn.status(),
                        created.assignedStaffId(),
                        created.assignedStaffName(),
                        "AUTO",
                        checkedIn.checkedInAt()
                )
        );
    }

    @PostMapping("/sessions/{sessionId}/transfer")
    public ApiResponse<TransferSessionResponse> transferSession(
            @PathVariable UUID sessionId,
            @Valid @RequestBody TransferSessionRequest request
    ) {
        OperationsQueueResponse.WashSessionCard session = flattenSessions(operationsService.getQueue()).stream()
                .filter(item -> item.sessionId().equals(sessionId))
                .findFirst()
                .orElseThrow();
        return ApiResponse.ok(
                "Manager session transfer prepared",
                new TransferSessionResponse(
                        UUID.randomUUID(),
                        sessionId,
                        session.bookingId(),
                        session.assignedStaffId(),
                        session.assignedStaffName(),
                        request.toStaffId(),
                        "Selected staff",
                        request.reason(),
                        Instant.now()
                )
        );
    }

    private List<OperationsQueueResponse.WashSessionCard> flattenSessions(OperationsQueueResponse queue) {
        return queue.columns().stream().flatMap(column -> column.sessions().stream()).toList();
    }

    private List<EligibleSessionBookingResponse> filterBookings(List<EligibleSessionBookingResponse> bookings, LocalDate date, String search) {
        String normalizedSearch = normalize(search);
        return bookings.stream()
                .filter(booking -> date == null || booking.bookingDate().equals(date))
                .filter(booking -> normalizedSearch.isBlank() || normalize(String.join(" ", booking.bookingId(), booking.customerName(), booking.customerPhone(), booking.vehiclePlate())).contains(normalizedSearch))
                .sorted(Comparator.comparing(EligibleSessionBookingResponse::bookingDate).thenComparing(EligibleSessionBookingResponse::bookingTime))
                .toList();
    }

    private List<OperationsQueueResponse.WashSessionCard> filterSessions(
            List<OperationsQueueResponse.WashSessionCard> sessions,
            LocalDate date,
            String search,
            String staffId,
            String focus
    ) {
        String normalizedSearch = normalize(search);
        return sessions.stream()
                .filter(session -> date == null || session.bookingDate().equals(date))
                .filter(session -> "ALL".equalsIgnoreCase(staffId) || staffId == null || (session.assignedStaffId() != null && session.assignedStaffId().toString().equals(staffId)))
                .filter(session -> normalizedSearch.isBlank() || normalize(String.join(" ", session.bookingId(), session.customerName(), session.customerPhone(), session.vehiclePlate(), session.servicePackage() == null ? "" : session.servicePackage())).contains(normalizedSearch))
                .filter(session -> matchesFocus(session, focus))
                .sorted(Comparator.comparing(OperationsQueueResponse.WashSessionCard::bookingDate).thenComparing(OperationsQueueResponse.WashSessionCard::bookingTime))
                .toList();
    }

    private boolean matchesFocus(OperationsQueueResponse.WashSessionCard session, String focus) {
        if (focus == null || "ALL".equalsIgnoreCase(focus)) return true;
        if ("UNASSIGNED".equalsIgnoreCase(focus)) return session.assignedStaffId() == null;
        if ("DELAYED".equalsIgnoreCase(focus) || "NEEDS_ACTION".equalsIgnoreCase(focus)) return isOverdue(session) || session.assignedStaffId() == null;
        return true;
    }

    private MetricsResponse buildMetrics(List<EligibleSessionBookingResponse> candidates, List<OperationsQueueResponse.WashSessionCard> sessions) {
        int checkedInWaitingStart = (int) sessions.stream().filter(session -> "CHECKED_IN".equals(session.status())).count();
        int inProgress = (int) sessions.stream().filter(session -> "IN_PROGRESS".equals(session.status())).count();
        int overdue = (int) sessions.stream().filter(this::isOverdue).count();
        return new MetricsResponse(candidates.size(), checkedInWaitingStart, inProgress, overdue);
    }

    private List<StaffWorkloadResponse> buildStaffWorkload(List<StaffOptionResponse> staffOptions, List<OperationsQueueResponse.WashSessionCard> sessions) {
        return staffOptions.stream()
                .map(staff -> {
                    List<OperationsQueueResponse.WashSessionCard> assigned = sessions.stream()
                            .filter(session -> staff.staffId().equals(session.assignedStaffId()))
                            .toList();
                    int active = (int) assigned.stream().filter(session -> List.of("QUEUED", "CHECKED_IN", "IN_PROGRESS").contains(session.status())).count();
                    int completed = (int) assigned.stream().filter(session -> "COMPLETED".equals(session.status())).count();
                    String status = active >= 3 ? "OVERLOADED" : active > 0 ? "BUSY" : "AVAILABLE";
                    return new StaffWorkloadResponse(staff.staffId(), staff.staffName(), null, status, active, completed, 8, completed, 40, 4.8, active == 0 ? 0 : null, active >= 3 ? "Staff has high active workload" : null);
                })
                .toList();
    }

    private BoardResponse buildBoard(List<EligibleSessionBookingResponse> candidates, List<OperationsQueueResponse.WashSessionCard> sessions) {
        List<BoardColumnResponse> columns = new ArrayList<>();
        columns.add(new BoardColumnResponse("WAITING_CHECK_IN", "Waiting check-in", candidates.size(), candidates.stream().map(this::toBoardItem).toList()));
        columns.add(columnFromSessions("CHECKED_IN", "Checked-in", sessions, "CHECKED_IN"));
        columns.add(columnFromSessions("WAITING_START", "Waiting start", sessions, "QUEUED"));
        columns.add(columnFromSessions("IN_PROGRESS", "In progress", sessions, "IN_PROGRESS"));
        columns.add(new BoardColumnResponse("WAITING_INSPECTION", "Waiting inspection", 0, List.of()));
        columns.add(columnFromSessions("COMPLETED", "Completed", sessions, "COMPLETED"));
        return new BoardResponse(columns);
    }

    private BoardColumnResponse columnFromSessions(String stage, String label, List<OperationsQueueResponse.WashSessionCard> sessions, String status) {
        List<BoardItemResponse> items = sessions.stream().filter(session -> status.equals(session.status())).map(this::toBoardItem).toList();
        return new BoardColumnResponse(stage, label, items.size(), items);
    }

    private BoardItemResponse toBoardItem(EligibleSessionBookingResponse booking) {
        return new BoardItemResponse(booking.bookingId(), null, booking.bookingId(), booking.vehiclePlate(), booking.customerName(), serviceName(booking.packageId()), "AUTO", uuidOrNull(booking.assignedStaffId()), booking.assignedStaffName(), booking.bookingTime(), 0, false, "CHECK_IN");
    }

    private BoardItemResponse toBoardItem(OperationsQueueResponse.WashSessionCard session) {
        return new BoardItemResponse(session.bookingId(), session.sessionId(), session.bookingId(), session.vehiclePlate(), session.customerName(), serviceName(session.servicePackage()), "AUTO", session.assignedStaffId(), session.assignedStaffName(), session.bookingTime(), waitMinutes(session), isOverdue(session), primaryAction(session.status()));
    }

    private List<InterventionResponse> buildInterventions(List<OperationsQueueResponse.WashSessionCard> sessions) {
        List<InterventionResponse> interventions = new ArrayList<>();
        for (OperationsQueueResponse.WashSessionCard session : sessions) {
            if (session.assignedStaffId() == null && !"COMPLETED".equals(session.status())) {
                interventions.add(new InterventionResponse("unassigned-" + session.sessionId(), "MEDIUM", "UNASSIGNED_SESSION", session.vehiclePlate() + " has no assigned staff.", session.bookingId(), session.sessionId(), "TRANSFER_STAFF", "Transfer staff"));
            }
            if (isOverdue(session)) {
                interventions.add(new InterventionResponse("overdue-" + session.sessionId(), "HIGH", "SESSION_DELAYED", session.vehiclePlate() + " is taking longer than expected.", session.bookingId(), session.sessionId(), "OPEN_SESSION", "View detail"));
            }
        }
        return interventions;
    }

    private SessionDetailResponse toSessionDetail(OperationsQueueResponse.WashSessionCard session) {
        return new SessionDetailResponse(
                session.bookingId(),
                session.sessionId(),
                session.bookingId(),
                session.sessionId().toString(),
                session.status(),
                Map.of("name", serviceName(session.servicePackage()), "plate", session.vehiclePlate()),
                Map.of("name", session.customerName(), "phone", session.customerPhone() == null ? "" : session.customerPhone()),
                Map.of("name", serviceName(session.servicePackage()), "estimatedDurationMinutes", session.estimatedDurationMinutes() == null ? 0 : session.estimatedDurationMinutes()),
                "AUTO",
                session.assignedStaffId() == null ? null : Map.of("staffId", session.assignedStaffId(), "fullName", session.assignedStaffName()),
                buildTimeline(session)
        );
    }

    private List<TimelineItemResponse> buildTimeline(OperationsQueueResponse.WashSessionCard session) {
        return List.of(
                new TimelineItemResponse("BOOKING_CREATED", "Booking created", "DONE", session.bookingTime(), session.bookingDate().toString(), null),
                new TimelineItemResponse("CHECK_IN", "Check-in", session.checkedInAt() == null ? "PENDING" : "DONE", timeOrNull(session.checkedInAt()), null, null),
                new TimelineItemResponse("START_WASH", "Start wash", session.startedAt() == null ? "PENDING" : "DONE", timeOrNull(session.startedAt()), null, null),
                new TimelineItemResponse("COMPLETE", "Complete", session.completedAt() == null ? "PENDING" : "DONE", timeOrNull(session.completedAt()), null, null)
        );
    }

    private boolean isOverdue(OperationsQueueResponse.WashSessionCard session) {
        if ("IN_PROGRESS".equals(session.status()) && session.startedAt() != null && session.estimatedDurationMinutes() != null) {
            return session.startedAt().plus(session.estimatedDurationMinutes() + 15L, ChronoUnit.MINUTES).isBefore(Instant.now());
        }
        if ("CHECKED_IN".equals(session.status()) && session.checkedInAt() != null) {
            return session.checkedInAt().plus(12, ChronoUnit.MINUTES).isBefore(Instant.now());
        }
        return false;
    }

    private int waitMinutes(OperationsQueueResponse.WashSessionCard session) {
        Instant base = session.startedAt() != null ? session.startedAt() : session.checkedInAt() != null ? session.checkedInAt() : session.queuedAt();
        return base == null ? 0 : Math.max(0, (int) ChronoUnit.MINUTES.between(base, Instant.now()));
    }

    private String primaryAction(String status) {
        return switch (status) {
            case "QUEUED", "PENDING" -> "CHECK_IN";
            case "CHECKED_IN" -> "START";
            case "IN_PROGRESS" -> "COMPLETE";
            default -> "VIEW_DETAIL";
        };
    }

    private String serviceName(String value) {
        return value == null || value.isBlank() ? "Wash package" : value;
    }

    private String normalize(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT).trim();
    }

    private LocalDate resolveDate(LocalDate date) {
        return date == null ? LocalDate.now() : date;
    }

    private UUID uuidOrNull(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    private LocalTime timeOrNull(Instant instant) {
        return instant == null ? null : LocalTime.ofInstant(instant, java.time.ZoneId.systemDefault());
    }

    public record CommandCenterResponse(SummaryResponse summary, List<EligibleSessionBookingResponse> checkInCandidates, List<InterventionResponse> interventions, MetricsResponse metrics, List<StaffWorkloadResponse> staffWorkload, BoardResponse board) {}
    public record SummaryResponse(LocalDate date, int alertCount, Instant lastUpdatedAt) {}
    public record MetricsResponse(int waitingCheckIn, int checkedInWaitingStart, int inProgress, int overdue) {}
    public record StaffWorkloadResponse(UUID staffId, String fullName, String avatarUrl, String status, int activeSessionCount, int todayKpiCompleted, int todayKpiTarget, int weeklyKpiCompleted, int weeklyKpiTarget, double recentRating, Integer availableInMinutes, String warning) {}
    public record BoardResponse(List<BoardColumnResponse> columns) {}
    public record BoardColumnResponse(String stage, String label, int count, List<BoardItemResponse> items) {}
    public record BoardItemResponse(String bookingId, UUID sessionId, String bookingCode, String vehiclePlate, String customerName, String serviceName, String bay, UUID staffId, String staffName, LocalTime scheduledTime, int waitMinutes, boolean isOverdue, String primaryAction) {}
    public record InterventionResponse(String id, String severity, String type, String message, String bookingId, UUID sessionId, String primaryAction, String primaryActionLabel) {}
    public record SessionDetailResponse(String bookingId, UUID sessionId, String bookingCode, String sessionCode, String status, Map<String, Object> vehicle, Map<String, Object> customer, Map<String, Object> service, String bay, Map<String, Object> assignedStaff, List<TimelineItemResponse> timeline) {}
    public record TimelineItemResponse(String step, String label, String status, LocalTime time, String date, String note) {}
    public record TransferOptionResponse(UUID staffId, String fullName, String status, int todayKpiCompleted, int todayKpiTarget, double rating, String recommendationLevel, String reason, boolean selectable) {}
    public record BookingCheckInResponse(String bookingId, UUID sessionId, String status, UUID assignedStaffId, String assignedStaffName, String assignedBay, Instant checkedInAt) {}
    public record TransferSessionRequest(UUID toStaffId, String reason) {}
    public record TransferSessionResponse(UUID auditId, UUID sessionId, String bookingId, UUID fromStaffId, String fromStaffName, UUID toStaffId, String toStaffName, String reason, Instant transferredAt) {}
}
