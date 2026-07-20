package com.autowash.controller;

import com.autowash.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/manager/settings/operations")
@Tag(name = "Manager Settings")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
public class ManagerSettingsController {

    @GetMapping
    public ApiResponse<ManagerSettingsResponse> getSettings() {
        return ApiResponse.ok("Manager operation settings retrieved", defaultSettings());
    }

    @PutMapping
    public ApiResponse<ManagerSettingsResponse> updateSettings(@RequestBody ManagerSettingsResponse request) {
        return ApiResponse.ok("Manager operation settings updated", request.withUpdatedAt(Instant.now()));
    }

    @PostMapping("/reset-default")
    public ApiResponse<ManagerSettingsResponse> resetDefault() {
        return ApiResponse.ok("Manager operation settings reset", defaultSettings());
    }

    @PostMapping("/preview-impact")
    public ApiResponse<ImpactPreviewResponse> previewImpact(@RequestBody(required = false) ManagerSettingsResponse request) {
        return ApiResponse.ok(
                "Manager setting impact preview retrieved",
                new ImpactPreviewResponse(0, 0, List.of("Preview is currently calculated as MVP stub data."))
        );
    }

    @GetMapping("/audit-logs")
    public ApiResponse<List<AuditLogResponse>> getAuditLogs(
            @RequestParam(defaultValue = "ALL") String type,
            @RequestParam(defaultValue = "TODAY") String range
    ) {
        return ApiResponse.ok(
                "Manager operation audit logs retrieved",
                List.of(new AuditLogResponse("settings-default", Instant.now(), "System", "Default settings loaded", "MVP settings endpoint ready", "CONFIG"))
        );
    }

    @GetMapping("/summary")
    public ApiResponse<SettingsSummaryResponse> getSummary() {
        return ApiResponse.ok("Manager settings summary retrieved", new SettingsSummaryResponse(0, 0, 0, 0));
    }

    private ManagerSettingsResponse defaultSettings() {
        return new ManagerSettingsResponse(
                new SettingsSummaryResponse(0, 0, 0, 0),
                new ImpactPreviewResponse(0, 0, List.of()),
                Map.of(
                        "autoAssignStaff", true,
                        "prioritizeAvailableStaff", true,
                        "prioritizeLowKpiStaff", false,
                        "avoidOverloadedStaff", true,
                        "respectCustomerRequestedStaff", true,
                        "blockLowRatedStaffForPremiumServices", false,
                        "premiumServiceMinRating", 4.0,
                        "maxActiveSessionsPerStaff", 3,
                        "overloadWarningThreshold", 3
                ),
                Map.of(
                        "lateCheckInMinutes", 10,
                        "waitingStartMinutes", 12,
                        "washOvertimeMinutes", 15,
                        "unassignedBookingMinutes", 5,
                        "staffOverloadActiveSessions", 3,
                        "lowKpiPercent", 60
                ),
                Map.of(
                        "earlyCheckInAllowedMinutes", 15,
                        "autoCreateSessionOnCheckIn", true,
                        "autoAssignStaffOnCheckIn", true,
                        "paymentConfirmationMode", "BEFORE_CHECK_IN",
                        "allowLateCheckIn", true
                ),
                Map.of(
                        "canTransferStaff", true,
                        "canOverrideAutoAssignment", true,
                        "canMarkPriority", true,
                        "canCancelSession", false,
                        "requireTransferReason", true
                ),
                List.of(
                        new NotificationTemplateResponse("default-reminder", "REMINDER", "Reminder", "Please update the wash session status.", true),
                        new NotificationTemplateResponse("default-priority", "PRIORITY", "Priority vehicle", "Please prioritize this vehicle in the queue.", true)
                ),
                List.of(),
                Instant.now()
        );
    }

    public record ManagerSettingsResponse(
            SettingsSummaryResponse summary,
            ImpactPreviewResponse impactPreview,
            Map<String, Object> assignmentRules,
            Map<String, Object> alertThresholds,
            Map<String, Object> checkInConfig,
            Map<String, Object> operationPermissions,
            List<NotificationTemplateResponse> notificationTemplates,
            List<AuditLogResponse> auditLogs,
            Instant updatedAt
    ) {
        ManagerSettingsResponse withUpdatedAt(Instant value) {
            return new ManagerSettingsResponse(summary, impactPreview, assignmentRules, alertThresholds, checkInConfig, operationPermissions, notificationTemplates, auditLogs, value);
        }
    }

    public record SettingsSummaryResponse(int notifiableStaffCount, int trackingVehicleCount, int priorityBookingCount, int todayNotificationCount) {}
    public record ImpactPreviewResponse(int overloadedStaffCount, int reassignmentBookingCount, List<String> warnings) {}
    public record NotificationTemplateResponse(String id, String type, String name, String content, boolean defaultTemplate) {}
    public record AuditLogResponse(String id, Instant time, String actorName, String action, String detail, String type) {}
}
