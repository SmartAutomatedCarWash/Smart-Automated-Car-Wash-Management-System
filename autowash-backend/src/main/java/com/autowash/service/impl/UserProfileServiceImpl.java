package com.autowash.service.impl;

import com.autowash.dto.CreateAvatarUploadUrlRequest;
import com.autowash.dto.CreateAvatarUploadUrlResponse;
import com.autowash.entity.User;
import com.autowash.entity.UserPreference;
import com.autowash.repository.UserOAuthAccountRepository;
import com.autowash.repository.UserRepository;
import com.autowash.repository.UserPreferenceRepository;
import com.autowash.service.AvatarStorageService;
import com.autowash.service.CurrentUserService;
import com.autowash.service.CustomerLoyaltyService;
import com.autowash.service.LoyaltyService;
import com.autowash.service.UserProfileService;
import com.autowash.shared.exception.ApiException;
import com.autowash.dto.UpdateUserProfileRequest;
import com.autowash.dto.UpdateUserAvatarRequest;
import com.autowash.dto.UpdateUserAvatarResponse;
import com.autowash.dto.UpdateUserProfileResponse;
import com.autowash.dto.UpdateUserPreferencesRequest;
import com.autowash.dto.UpdateUserPreferencesResponse;
import com.autowash.dto.UserPreferencesDto;
import com.autowash.dto.UserProfileResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserProfileServiceImpl implements UserProfileService {

    private final CurrentUserService currentUserService;
    private final UserRepository UserRepository;
    private final UserOAuthAccountRepository userOAuthAccountRepository;
    private final UserPreferenceRepository userPreferenceRepository;
    private final CustomerLoyaltyService customerLoyaltyService;
    private final LoyaltyService loyaltyService;
    private final AvatarStorageService avatarStorageService;

    public UserProfileServiceImpl(
            CurrentUserService currentUserService,
            UserRepository UserRepository,
            UserOAuthAccountRepository userOAuthAccountRepository,
            UserPreferenceRepository userPreferenceRepository,
            CustomerLoyaltyService customerLoyaltyService,
            LoyaltyService loyaltyService,
            AvatarStorageService avatarStorageService
    ) {
        this.currentUserService = currentUserService;
        this.UserRepository = UserRepository;
        this.userOAuthAccountRepository = userOAuthAccountRepository;
        this.userPreferenceRepository = userPreferenceRepository;
        this.customerLoyaltyService = customerLoyaltyService;
        this.loyaltyService = loyaltyService;
        this.avatarStorageService = avatarStorageService;
    }

    @Override
    @Transactional
    public UserProfileResponse getCurrentUserProfile() {
        User user = currentUserService.getCurrentUser();
        UserPreference preference = loadOrCreatePreference(user);
        boolean hasGoogleAuth = userOAuthAccountRepository.existsByUserId(user.getId());
        return new UserProfileResponse(
                user.getId().toString(),
                user.getFullName(),
                user.getAvatarUrl(),
                user.getPhone(),
                user.getEmail(),
                user.getStatus().name(),
                user.getRole().name(),
                loyaltyService.getAccount(user.getId()).tier(),
                hasGoogleAuth,
                user.isNewCustomer(),
                customerLoyaltyService.getCurrentBalance(user),
                user.getCreatedAt(),
                new UserPreferencesDto(
                        preference.getLanguage().name(),
                        preference.getTheme().name(),
                        preference.isNotificationsEnabled(),
                        preference.isEmailNotifications(),
                        preference.isSmsNotifications()
                )
        );
    }

    @Override
    @Transactional
    public CreateAvatarUploadUrlResponse createAvatarUploadUrl(CreateAvatarUploadUrlRequest request) {
        User user = currentUserService.getCurrentUser();
        AvatarStorageService.AvatarUploadTarget uploadTarget =
                avatarStorageService.createAvatarUpload(user.getId(), request.fileName(), request.contentType());
        return new CreateAvatarUploadUrlResponse(
                uploadTarget.objectKey(),
                uploadTarget.uploadUrl(),
                uploadTarget.publicUrl()
        );
    }

    @Override
    @Transactional
    public UpdateUserAvatarResponse updateAvatar(UpdateUserAvatarRequest request) {
        User user = currentUserService.getCurrentUser();
        String avatarUrl = avatarStorageService.resolveAvatarUrl(user.getId(), request.objectKey());
        user.setAvatarUrl(avatarUrl);
        return new UpdateUserAvatarResponse(
                user.getId().toString(),
                user.getAvatarUrl(),
                user.getUpdatedAt()
        );
    }

    @Override
    @Transactional
    public UpdateUserProfileResponse updateProfile(UpdateUserProfileRequest request) {
        User user = currentUserService.getCurrentUser();
        boolean hasGoogleAuth = userOAuthAccountRepository.existsByUserId(user.getId());
        String normalizedPhone = request.phone() == null || request.phone().isBlank() ? null : request.phone().trim();

        if (normalizedPhone != null && UserRepository.existsByPhoneAndIdNot(normalizedPhone, user.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "Phone number already in use", "DUPLICATE_PHONE");
        }
        if (!hasGoogleAuth
                && request.email() != null
                && UserRepository.existsByEmailIgnoreCaseAndIdNot(request.email(), user.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "Email already in use", "DUPLICATE_EMAIL");
        }

        user.setFullName(request.fullName());
        if (!hasGoogleAuth) {
            user.setEmail(request.email());
        }
        user.setPhone(normalizedPhone);
        user.markNotNewCustomer();

        return new UpdateUserProfileResponse(
                user.getId().toString(),
                user.getFullName(),
                user.getPhone(),
                user.getEmail(),
                user.getUpdatedAt()
        );
    }

    @Override
    @Transactional
    public UserPreferencesDto getCurrentUserPreferences() {
        User user = currentUserService.getCurrentUser();
        UserPreference preference = loadOrCreatePreference(user);
        return new UserPreferencesDto(
                preference.getLanguage().name(),
                preference.getTheme().name(),
                preference.isNotificationsEnabled(),
                preference.isEmailNotifications(),
                preference.isSmsNotifications()
        );
    }

    @Override
    @Transactional
    public UpdateUserPreferencesResponse updatePreferences(UpdateUserPreferencesRequest request) {
        User user = currentUserService.getCurrentUser();
        UserPreference preference = loadOrCreatePreference(user);
        preference.update(
                request.language(),
                request.theme(),
                request.notificationsEnabled(),
                request.emailNotifications(),
                request.smsNotifications()
        );

        return new UpdateUserPreferencesResponse(
                preference.getLanguage().name(),
                preference.getTheme().name(),
                preference.isNotificationsEnabled(),
                user.getUpdatedAt()
        );
    }

    private UserPreference loadOrCreatePreference(User user) {
        return userPreferenceRepository.findById(user.getId())
                .orElseGet(() -> userPreferenceRepository.save(new UserPreference(user)));
    }
}
