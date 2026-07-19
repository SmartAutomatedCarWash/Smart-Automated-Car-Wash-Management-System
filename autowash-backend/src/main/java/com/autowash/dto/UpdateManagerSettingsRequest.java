package com.autowash.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record UpdateManagerSettingsRequest(
        @NotNull @Valid ManagerOperationSettingsPayload settings,
        @NotNull List<@Valid ManagerNotificationTemplatePayload> templates
) {
}
