package com.autowash.service.impl;

import com.autowash.dto.ManagerNotificationTemplatePayload;
import com.autowash.dto.ManagerOperationSettingsPayload;
import com.autowash.dto.ManagerSettingAuditLogResponse;
import com.autowash.dto.ManagerSettingsResponse;
import com.autowash.dto.UpdateManagerSettingsRequest;
import com.autowash.dto.UpdateWeeklyStaffKpiTargetRequest;
import com.autowash.entity.ManagerNotificationTemplate;
import com.autowash.entity.ManagerOperationSettings;
import com.autowash.entity.ManagerSettingAuditLog;
import com.autowash.entity.User;
import com.autowash.repository.ManagerNotificationTemplateRepository;
import com.autowash.repository.ManagerOperationSettingsRepository;
import com.autowash.repository.ManagerSettingAuditLogRepository;
import com.autowash.service.CurrentUserService;
import com.autowash.service.ManagerSettingsService;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ManagerSettingsServiceImpl implements ManagerSettingsService {

    private final ManagerOperationSettingsRepository settingsRepository;
    private final ManagerNotificationTemplateRepository templateRepository;
    private final ManagerSettingAuditLogRepository auditLogRepository;
    private final CurrentUserService currentUserService;

    public ManagerSettingsServiceImpl(
            ManagerOperationSettingsRepository settingsRepository,
            ManagerNotificationTemplateRepository templateRepository,
            ManagerSettingAuditLogRepository auditLogRepository,
            CurrentUserService currentUserService
    ) {
        this.settingsRepository = settingsRepository;
        this.templateRepository = templateRepository;
        this.auditLogRepository = auditLogRepository;
        this.currentUserService = currentUserService;
    }

    @Override
    @Transactional(readOnly = true)
    public ManagerSettingsResponse getSettings() {
        return toResponse(loadSettings());
    }

    @Override
    @Transactional(readOnly = true)
    public ManagerOperationSettingsPayload getOperationSettings() {
        return toSettingsPayload(loadSettings());
    }

    @Override
    @Transactional
    public ManagerSettingsResponse updateSettings(UpdateManagerSettingsRequest request) {
        ManagerOperationSettings settings = loadSettings();
        ManagerOperationSettingsPayload payload = request.settings();
        settings.update(
                payload.autoAssignEnabled(),
                payload.leastBusyStaffFirst(),
                payload.respectStaffCapacity(),
                payload.maxActiveSessionsPerStaff(),
                payload.weeklyStaffKpiTarget(),
                payload.paidBookingPriority(),
                payload.tierPriorityEnabled(),
                payload.primaryVehiclePriority(),
                payload.earlyCheckInMinutes(),
                payload.lateGraceMinutes(),
                payload.waitingAlertMinutes(),
                payload.delayAlertMinutes(),
                payload.overloadAlertSessions(),
                payload.cancellationRateAlert(),
                payload.notifyNewBooking(),
                payload.notifyDelayedSession(),
                payload.notifyStaffTransfer(),
                payload.notifyCompletion()
        );
        settingsRepository.save(settings);

        request.templates().forEach(template -> {
            ManagerNotificationTemplate entity = templateRepository.findById(template.templateKey())
                    .orElseGet(() -> new ManagerNotificationTemplate(
                            template.templateKey(),
                            template.displayName(),
                            template.description(),
                            template.message(),
                            template.preview()
                    ));
            entity.update(template.displayName(), template.description(), template.message(), template.preview());
            templateRepository.save(entity);
        });

        User actor = currentUserService.getCurrentUser();
        auditLogRepository.save(new ManagerSettingAuditLog(
                actor,
                "Operational settings saved",
                "Manager saved assignment, alert, check-in, priority, and notification settings."
        ));

        return toResponse(settings);
    }

    @Override
    @Transactional
    public ManagerSettingsResponse updateWeeklyStaffKpiTarget(UpdateWeeklyStaffKpiTargetRequest request) {
        ManagerOperationSettings settings = loadSettings();
        settings.update(
                settings.isAutoAssignEnabled(),
                settings.isLeastBusyStaffFirst(),
                settings.isRespectStaffCapacity(),
                settings.getMaxActiveSessionsPerStaff(),
                request.weeklyStaffKpiTarget(),
                settings.isPaidBookingPriority(),
                settings.isTierPriorityEnabled(),
                settings.isPrimaryVehiclePriority(),
                settings.getEarlyCheckInMinutes(),
                settings.getLateGraceMinutes(),
                settings.getWaitingAlertMinutes(),
                settings.getDelayAlertMinutes(),
                settings.getOverloadAlertSessions(),
                settings.getCancellationRateAlert(),
                settings.isNotifyNewBooking(),
                settings.isNotifyDelayedSession(),
                settings.isNotifyStaffTransfer(),
                settings.isNotifyCompletion()
        );
        settingsRepository.save(settings);

        User actor = currentUserService.getCurrentUser();
        auditLogRepository.save(new ManagerSettingAuditLog(
                actor,
                "Weekly staff KPI target updated",
                "Manager updated the weekly staff KPI target."
        ));

        return toResponse(settings);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ManagerSettingAuditLogResponse> getAuditLogs() {
        return auditLogRepository.findTop20ByOrderByCreatedAtDesc().stream()
                .map(this::toAuditResponse)
                .toList();
    }

    private ManagerOperationSettings loadSettings() {
        return settingsRepository.findById(1)
                .orElseGet(() -> settingsRepository.save(ManagerOperationSettings.createDefault()));
    }

    private ManagerSettingsResponse toResponse(ManagerOperationSettings settings) {
        return new ManagerSettingsResponse(
                toSettingsPayload(settings),
                templateRepository.findAll().stream()
                        .sorted(Comparator.comparing(ManagerNotificationTemplate::getTemplateKey))
                        .map(this::toTemplatePayload)
                        .toList(),
                getAuditLogs(),
                settings.getUpdatedAt().toString()
        );
    }

    private ManagerOperationSettingsPayload toSettingsPayload(ManagerOperationSettings settings) {
        return new ManagerOperationSettingsPayload(
                settings.isAutoAssignEnabled(),
                settings.isLeastBusyStaffFirst(),
                settings.isRespectStaffCapacity(),
                settings.getMaxActiveSessionsPerStaff(),
                settings.getWeeklyStaffKpiTarget(),
                settings.isPaidBookingPriority(),
                settings.isTierPriorityEnabled(),
                settings.isPrimaryVehiclePriority(),
                settings.getEarlyCheckInMinutes(),
                settings.getLateGraceMinutes(),
                settings.getWaitingAlertMinutes(),
                settings.getDelayAlertMinutes(),
                settings.getOverloadAlertSessions(),
                settings.getCancellationRateAlert(),
                settings.isNotifyNewBooking(),
                settings.isNotifyDelayedSession(),
                settings.isNotifyStaffTransfer(),
                settings.isNotifyCompletion()
        );
    }

    private ManagerNotificationTemplatePayload toTemplatePayload(ManagerNotificationTemplate template) {
        return new ManagerNotificationTemplatePayload(
                template.getTemplateKey(),
                template.getDisplayName(),
                template.getDescription(),
                template.getMessage(),
                template.getPreview()
        );
    }

    private ManagerSettingAuditLogResponse toAuditResponse(ManagerSettingAuditLog auditLog) {
        User actor = auditLog.getActor();
        return new ManagerSettingAuditLogResponse(
                auditLog.getId(),
                auditLog.getTitle(),
                auditLog.getDetail(),
                actor != null ? actor.getFullName() : null,
                auditLog.getCreatedAt().toString()
        );
    }
}
