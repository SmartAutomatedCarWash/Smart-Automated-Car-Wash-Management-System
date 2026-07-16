package com.autowash.dto;

import com.autowash.entity.enums.CampaignStatus;
import com.autowash.entity.enums.CampaignTargetAudience;
import com.autowash.entity.enums.NotificationType;
import java.time.Instant;
import java.util.UUID;
import lombok.Builder;

@Builder
public record NotificationCampaignResponse(
        UUID id,
        String title,
        String message,
        NotificationType type,
        CampaignTargetAudience targetAudience,
        String targetDetails,
        CampaignStatus status,
        Instant scheduledAt,
        Instant sentAt,
        int successCount,
        int failedCount,
        Instant createdAt
) {
}
