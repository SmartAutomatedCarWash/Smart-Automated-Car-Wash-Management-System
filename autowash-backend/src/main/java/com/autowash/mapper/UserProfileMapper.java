package com.autowash.mapper;

import com.autowash.dto.UpdateUserAvatarResponse;
import com.autowash.dto.UpdateUserPreferencesResponse;
import com.autowash.dto.UpdateUserProfileResponse;
import com.autowash.dto.UserPreferencesDto;
import com.autowash.entity.User;
import com.autowash.entity.UserPreference;
import com.autowash.entity.enums.LanguagePreference;
import com.autowash.entity.enums.ThemePreference;
import java.util.UUID;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(config = CentralMapperConfig.class)
public interface UserProfileMapper {

    UserPreferencesDto toPreferencesDto(UserPreference preference);

    @Mapping(target = "userId", source = "id")
    UpdateUserAvatarResponse toAvatarResponse(User user);

    @Mapping(target = "userId", source = "id")
    UpdateUserProfileResponse toUpdateProfileResponse(User user);

    @Mapping(target = "language", source = "preference.language")
    @Mapping(target = "theme", source = "preference.theme")
    @Mapping(target = "notificationsEnabled", source = "preference.notificationsEnabled")
    @Mapping(target = "updatedAt", source = "user.updatedAt")
    UpdateUserPreferencesResponse toUpdatePreferencesResponse(UserPreference preference, User user);

    default String map(UUID value) {
        return value == null ? null : value.toString();
    }

    default String map(LanguagePreference value) {
        return value == null ? null : value.name();
    }

    default String map(ThemePreference value) {
        return value == null ? null : value.name();
    }
}
