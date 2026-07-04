package com.autowash.dto;

import com.autowash.entity.enums.LanguagePreference;
import com.autowash.entity.enums.ThemePreference;
import jakarta.validation.constraints.NotNull;

public record UpdateUserPreferencesRequest(
        @NotNull(message = "Language is required")
        LanguagePreference language,

        @NotNull(message = "Theme is required")
        ThemePreference theme,

        @NotNull(message = "Notifications enabled is required")
        Boolean notificationsEnabled,

        @NotNull(message = "Email notifications is required")
        Boolean emailNotifications,

        @NotNull(message = "SMS notifications is required")
        Boolean smsNotifications
) {
}

