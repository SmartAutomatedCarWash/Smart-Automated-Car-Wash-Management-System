package com.autowash.dto;

import java.util.List;

public record ManagerSettingsResponse(
        ManagerOperationSettingsPayload settings,
        List<ManagerNotificationTemplatePayload> templates,
        List<ManagerSettingAuditLogResponse> auditLogs,
        String updatedAt
) {
}
