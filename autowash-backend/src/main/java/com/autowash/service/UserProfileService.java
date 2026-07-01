package com.autowash.service;

import com.autowash.dto.CreateAvatarUploadUrlRequest;
import com.autowash.dto.CreateAvatarUploadUrlResponse;
import com.autowash.dto.UpdateUserProfileRequest;
import com.autowash.dto.UpdateUserAvatarRequest;
import com.autowash.dto.UpdateUserAvatarResponse;
import com.autowash.dto.UpdateUserProfileResponse;
import com.autowash.dto.UpdateUserPreferencesRequest;
import com.autowash.dto.UpdateUserPreferencesResponse;
import com.autowash.dto.UserPreferencesDto;
import com.autowash.dto.UserProfileResponse;

public interface UserProfileService {
    UserProfileResponse getCurrentUserProfile();
    CreateAvatarUploadUrlResponse createAvatarUploadUrl(CreateAvatarUploadUrlRequest request);
    UpdateUserAvatarResponse updateAvatar(UpdateUserAvatarRequest request);
    UpdateUserProfileResponse updateProfile(UpdateUserProfileRequest request);
    UserPreferencesDto getCurrentUserPreferences();
    UpdateUserPreferencesResponse updatePreferences(UpdateUserPreferencesRequest request);
}
