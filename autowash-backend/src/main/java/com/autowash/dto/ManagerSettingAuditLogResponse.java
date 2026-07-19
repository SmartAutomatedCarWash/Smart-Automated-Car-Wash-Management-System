package com.autowash.dto;

import java.util.UUID;

public record ManagerSettingAuditLogResponse(
        UUID id,
        String title,
        String detail,
        String actorName,
        String createdAt
) {
}
