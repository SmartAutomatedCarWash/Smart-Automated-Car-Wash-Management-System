package com.autowash.dto;

import com.autowash.entity.enums.CampaignTargetAudience;
import com.autowash.entity.enums.NotificationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public record NotificationCampaignRequest(
        @NotBlank(message = "Title is required")
        String title,

        @NotBlank(message = "Message is required")
        String message,

        @NotNull(message = "Type is required")
        NotificationType type,

        @NotNull(message = "Target audience is required")
        CampaignTargetAudience targetAudience,

        String targetDetails,

        Instant scheduledAt
) {
}
