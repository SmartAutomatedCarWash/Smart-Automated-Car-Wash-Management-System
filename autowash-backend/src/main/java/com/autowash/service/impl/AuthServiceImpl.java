package com.autowash.service.impl;

import com.autowash.dto.LoginRequest;
import com.autowash.dto.LoginResponse;
import com.autowash.dto.RefreshTokenResponse;
import com.autowash.dto.RegisterRequest;
import com.autowash.dto.RegisterResponse;
import com.autowash.dto.SendOtpResponse;
import com.autowash.entity.LoyaltyAccount;
import com.autowash.entity.UserPreference;
import com.autowash.entity.User;
import com.autowash.entity.enums.OtpPurpose;
import com.autowash.entity.OtpVerification;
import com.autowash.entity.RefreshToken;
import com.autowash.entity.enums.UserStatus;
import com.autowash.repository.LoyaltyAccountRepository;
import com.autowash.repository.UserRepository;
import com.autowash.repository.OtpVerificationRepository;
import com.autowash.repository.RefreshTokenRepository;
import com.autowash.repository.UserPreferenceRepository;
import com.autowash.service.AuthService;
import com.autowash.service.EmailDeliveryService;
import com.autowash.service.JwtService;
import com.autowash.service.OtpService;
import com.autowash.shared.exception.ApiException;
import java.time.Instant;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthServiceImpl implements AuthService {
    private final UserRepository UserRepository;
    private final OtpVerificationRepository OtpVerificationRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserPreferenceRepository userPreferenceRepository;
    private final LoyaltyAccountRepository loyaltyAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final OtpService otpService;
    private final EmailDeliveryService emailDeliveryService;
    private final JwtService jwtService;
    private final long otpExpirationSeconds;
    private final int otpMaxAttempts;
    private final long refreshTokenExpirationSeconds;
    private final boolean otpExposeForDev;

    public AuthServiceImpl(
            UserRepository UserRepository,
            OtpVerificationRepository OtpVerificationRepository,
            RefreshTokenRepository refreshTokenRepository,
            UserPreferenceRepository userPreferenceRepository,
            LoyaltyAccountRepository loyaltyAccountRepository,
            PasswordEncoder passwordEncoder,
            OtpService otpService,
            EmailDeliveryService emailDeliveryService,
            JwtService jwtService,
            @Value("${autowash.auth.otp.expiration-seconds}") long otpExpirationSeconds,
            @Value("${autowash.auth.otp.max-attempts}") int otpMaxAttempts,
            @Value("${autowash.auth.jwt.refresh-token-expiration-seconds}") long refreshTokenExpirationSeconds,
            @Value("${autowash.auth.otp.expose-for-dev}") boolean otpExposeForDev
    ) {
        this.UserRepository = UserRepository;
        this.OtpVerificationRepository = OtpVerificationRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.userPreferenceRepository = userPreferenceRepository;
        this.loyaltyAccountRepository = loyaltyAccountRepository;
        this.passwordEncoder = passwordEncoder;
        this.otpService = otpService;
        this.emailDeliveryService = emailDeliveryService;
        this.jwtService = jwtService;
        this.otpExpirationSeconds = otpExpirationSeconds;
        this.otpMaxAttempts = otpMaxAttempts;
        this.refreshTokenExpirationSeconds = refreshTokenExpirationSeconds;
        this.otpExposeForDev = otpExposeForDev;
    }

    @Transactional
    public RegisterResponse register(RegisterRequest request, RequestMetadata metadata) {
        if (UserRepository.existsByEmailIgnoreCase(request.email())) {
            throw new ApiException(HttpStatus.CONFLICT, "Email already registered", "DUPLICATE_EMAIL");
        }

        User user = new User(
                request.fullName(),
                null,
                request.email(),
                passwordEncoder.encode(request.password())
        );
        user = UserRepository.save(user);
        ensureDefaultCustomerRecords(user);
        SendOtpResponse otpResponse = issueRegistrationOtp(user, metadata, false);

        return new RegisterResponse(
                user.getId().toString(),
                user.getFullName(),
                user.getEmail(),
                user.getStatus().name(),
                true,
                (int) otpExpirationSeconds,
                otpResponse.devOtp()
        );
    }

    @Transactional
    public SendOtpResponse sendRegistrationOtp(String email, RequestMetadata metadata) {
        User user = resolveEmailUser(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Account not found", "RESOURCE_NOT_FOUND"));
        requirePendingUser(user);
        enforceResendLimit(user);

        return issueRegistrationOtp(user, metadata, true);
    }

    private SendOtpResponse issueRegistrationOtp(User user, RequestMetadata metadata, boolean resend) {
        String code = otpService.generateOtp();
        OtpVerification OtpVerification = new OtpVerification(
                user,
                OtpPurpose.EMAIL_REGISTRATION,
                passwordEncoder.encode(code),
                user.getEmail(),
                Instant.now().plusSeconds(otpExpirationSeconds)
        );
        OtpVerificationRepository.save(OtpVerification);
        try {
            emailDeliveryService.sendRegistrationOtp(user.getEmail(), user.getFullName(), code, (int) otpExpirationSeconds);
        } catch (RuntimeException exception) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Unable to send OTP email", "OTP_SEND_FAILED");
        }
        return new SendOtpResponse(
                user.getEmail(),
                user.getPhone(),
                (int) otpExpirationSeconds,
                maskEmail(user.getEmail()),
                maskPhone(user.getPhone()),
                "OTP sent successfully",
                otpExposeForDev ? code : null
        );
    }

    @Transactional(noRollbackFor = ApiException.class)
    public LoginResponse verifyRegistrationOtp(String email, String otp, RequestMetadata metadata) {
        User user = resolveEmailUser(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Account not found", "RESOURCE_NOT_FOUND"));
        requirePendingUser(user);

        OtpVerification OtpVerification = OtpVerificationRepository.findFirstByUserAndPurposeAndVerifiedAtIsNullOrderByCreatedAtDesc(user, OtpPurpose.EMAIL_REGISTRATION)
                .orElseThrow(() -> new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "OTP incorrect or expired", "INVALID_OTP"));

        if (OtpVerification.getExpiresAt().isBefore(Instant.now())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "OTP has expired", "OTP_EXPIRED");
        }

        if (OtpVerification.getAttempts() >= otpMaxAttempts) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Too many failed attempts", "RATE_LIMIT_EXCEEDED");
        }

        if (!passwordEncoder.matches(otp, OtpVerification.getCodeHash())) {
            OtpVerification.incrementAttempts();
            if (OtpVerification.getAttempts() >= otpMaxAttempts) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Too many failed attempts", "RATE_LIMIT_EXCEEDED");
            }
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "OTP incorrect or expired", "INVALID_OTP");
        }

        OtpVerification.markVerified();
        user.activate();

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = createRefreshToken(user).getToken();

        return toLoginResponse(user, accessToken, refreshToken);
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        User user = resolveEmailUser(request.email())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Account not found", "ACCOUNT_NOT_FOUND"));

        if (user.getStatus() == UserStatus.BLOCKED) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Account blocked", "ACCOUNT_BLOCKED");
        }

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Account is not active", "ACCOUNT_NOT_ACTIVE");
        }

        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Incorrect password", "INCORRECT_PASSWORD");
        }

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = createRefreshToken(user).getToken();

        return toLoginResponse(user, accessToken, refreshToken);
    }

    @Transactional
    public SendOtpResponse requestForgotPassword(String email, RequestMetadata metadata) {
        User user = resolveEmailUser(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Account not found", "RESOURCE_NOT_FOUND"));
        requireActiveUser(user);
        enforcePasswordResetResendLimit(user);

        return issueOtp(user, OtpPurpose.PASSWORD_RESET, metadata);
    }

    @Transactional(noRollbackFor = ApiException.class)
    public void verifyForgotPasswordOtp(String email, String otp, RequestMetadata metadata) {
        User user = resolveEmailUser(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Account not found", "RESOURCE_NOT_FOUND"));
        requireActiveUser(user);
        verifyOtpForPurpose(user, OtpPurpose.PASSWORD_RESET, otp);
    }

    @Transactional(noRollbackFor = ApiException.class)
    public void resetForgotPassword(
            String email,
            String otp,
            String newPassword,
            String newPasswordConfirm,
            RequestMetadata metadata
    ) {
        if (!newPassword.equals(newPasswordConfirm)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Passwords do not match", "VALIDATION_ERROR");
        }

        User user = resolveEmailUser(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Account not found", "RESOURCE_NOT_FOUND"));
        requireActiveUser(user);
        verifyOtpForPurpose(user, OtpPurpose.PASSWORD_RESET, otp);
        user.setPasswordHash(passwordEncoder.encode(newPassword));
    }

    @Transactional
    public RefreshTokenResponse refresh(String token) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(token)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid refresh token", "TOKEN_INVALID"));

        if (refreshToken.isRevoked()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid refresh token", "TOKEN_INVALID");
        }

        if (refreshToken.getExpiresAt().isBefore(Instant.now())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Refresh token expired", "TOKEN_EXPIRED");
        }

        return new RefreshTokenResponse(
                jwtService.generateAccessToken(refreshToken.getUser()),
                jwtService.getAccessTokenExpirationSeconds()
        );
    }

    @Transactional
    public void logout(String token) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(token)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid refresh token", "TOKEN_INVALID"));
        refreshToken.revoke();
    }

    @Transactional
    public RefreshToken createRefreshToken(User user) {
        RefreshToken refreshToken = new RefreshToken(
                user,
                UUID.randomUUID().toString(),
                Instant.now().plusSeconds(refreshTokenExpirationSeconds)
        );
        return refreshTokenRepository.save(refreshToken);
    }

    private LoginResponse toLoginResponse(User user, String accessToken, String refreshToken) {
        return new LoginResponse(
                user.getId().toString(),
                user.getFullName(),
                user.getPhone(),
                user.getEmail(),
                user.getRole().name(),
                user.getStatus().name(),
                "BRONZE",
                0,
                user.isNewCustomer(),
                accessToken,
                refreshToken,
                jwtService.getAccessTokenExpirationSeconds()
        );
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 6) {
            return null;
        }
        return phone.substring(0, 4) + "****" + phone.substring(phone.length() - 2);
    }

    private String maskEmail(String email) {
        int atIndex = email.indexOf('@');
        if (atIndex <= 1) {
            return "***" + email.substring(atIndex);
        }
        return email.charAt(0) + "***" + email.substring(atIndex - 1);
    }

    private void requirePendingUser(User user) {
        if (user.getStatus() != UserStatus.PENDING) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Account is not pending OTP verification",
                    "RESOURCE_LOCKED"
            );
        }
    }

    private void requireActiveUser(User user) {
        if (user.getStatus() == UserStatus.BLOCKED) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Account blocked", "ACCOUNT_BLOCKED");
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Account is not active", "RESOURCE_LOCKED");
        }
    }

    private java.util.Optional<User> resolveEmailUser(String email) {
        if (email == null || email.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email is required", "VALIDATION_ERROR");
        }
        return UserRepository.findByEmailIgnoreCase(email.trim());
    }


    private void enforceResendLimit(User user) {
        Instant windowStart = Instant.now().minusSeconds(3600);
        if (OtpVerificationRepository.countByUserAndPurposeAndCreatedAtAfter(user, OtpPurpose.EMAIL_REGISTRATION, windowStart) >= 3) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many OTP resend requests", "RATE_LIMIT_EXCEEDED");
        }
    }

    private void enforcePasswordResetResendLimit(User user) {
        Instant windowStart = Instant.now().minusSeconds(3600);
        if (OtpVerificationRepository.countByUserAndPurposeAndCreatedAtAfter(user, OtpPurpose.PASSWORD_RESET, windowStart) >= 3) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many OTP resend requests", "RATE_LIMIT_EXCEEDED");
        }
    }

    private SendOtpResponse issueOtp(User user, OtpPurpose purpose, RequestMetadata metadata) {
        String code = otpService.generateOtp();
        OtpVerification OtpVerification = new OtpVerification(
                user,
                purpose,
                passwordEncoder.encode(code),
                user.getEmail(),
                Instant.now().plusSeconds(otpExpirationSeconds)
        );
        OtpVerificationRepository.save(OtpVerification);
        try {
            emailDeliveryService.sendRegistrationOtp(user.getEmail(), user.getFullName(), code, (int) otpExpirationSeconds);
        } catch (RuntimeException exception) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Unable to send OTP email", "OTP_SEND_FAILED");
        }
        return new SendOtpResponse(
                user.getEmail(),
                user.getPhone(),
                (int) otpExpirationSeconds,
                maskEmail(user.getEmail()),
                maskPhone(user.getPhone()),
                "OTP sent successfully",
                otpExposeForDev ? code : null
        );
    }

    private void verifyOtpForPurpose(User user, OtpPurpose purpose, String otp) {
        OtpVerification OtpVerification = OtpVerificationRepository.findFirstByUserAndPurposeOrderByCreatedAtDesc(user, purpose)
                .orElseThrow(() -> new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "OTP incorrect or expired", "INVALID_OTP"));

        if (OtpVerification.getExpiresAt().isBefore(Instant.now())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "OTP has expired", "OTP_EXPIRED");
        }

        if (OtpVerification.getAttempts() >= otpMaxAttempts) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Too many failed attempts", "RATE_LIMIT_EXCEEDED");
        }

        if (!passwordEncoder.matches(otp, OtpVerification.getCodeHash())) {
            OtpVerification.incrementAttempts();
            if (OtpVerification.getAttempts() >= otpMaxAttempts) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Too many failed attempts", "RATE_LIMIT_EXCEEDED");
            }
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "OTP incorrect or expired", "INVALID_OTP");
        }

        if (!OtpVerification.isVerified()) {
            OtpVerification.markVerified();
        }
    }

    private void ensureDefaultCustomerRecords(User user) {
        if (!userPreferenceRepository.existsById(user.getId())) {
            userPreferenceRepository.save(new UserPreference(user));
        }
        if (loyaltyAccountRepository.findByCustomerId(user.getId()).isEmpty()) {
            loyaltyAccountRepository.save(new LoyaltyAccount(user));
        }
    }

}

