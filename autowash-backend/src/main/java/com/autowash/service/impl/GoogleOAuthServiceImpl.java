package com.autowash.service.impl;

import com.autowash.dto.GoogleAuthTicketResponse;
import com.autowash.dto.GoogleOAuthUserInfo;
import com.autowash.dto.LoginResponse;
import com.autowash.entity.GoogleAuthTicket;
import com.autowash.entity.LoyaltyAccount;
import com.autowash.entity.RefreshToken;
import com.autowash.entity.User;
import com.autowash.entity.UserOAuthAccount;
import com.autowash.entity.UserPreference;
import com.autowash.entity.enums.OAuthProvider;
import com.autowash.repository.GoogleAuthTicketRepository;
import com.autowash.repository.LoyaltyAccountRepository;
import com.autowash.repository.RefreshTokenRepository;
import com.autowash.repository.UserOAuthAccountRepository;
import com.autowash.repository.UserPreferenceRepository;
import com.autowash.repository.UserRepository;
import com.autowash.service.GoogleOAuthClient;
import com.autowash.service.GoogleOAuthService;
import com.autowash.service.JwtService;
import com.autowash.shared.exception.ApiException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GoogleOAuthServiceImpl implements GoogleOAuthService {

    private final GoogleOAuthClient googleOAuthClient;
    private final GoogleAuthTicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final UserOAuthAccountRepository oauthAccountRepository;
    private final UserPreferenceRepository userPreferenceRepository;
    private final LoyaltyAccountRepository loyaltyAccountRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final long refreshTokenExpirationSeconds;
    private final long ticketTtlSeconds;

    public GoogleOAuthServiceImpl(
            GoogleOAuthClient googleOAuthClient,
            GoogleAuthTicketRepository ticketRepository,
            UserRepository userRepository,
            UserOAuthAccountRepository oauthAccountRepository,
            UserPreferenceRepository userPreferenceRepository,
            LoyaltyAccountRepository loyaltyAccountRepository,
            RefreshTokenRepository refreshTokenRepository,
            JwtService jwtService,
            PasswordEncoder passwordEncoder,
            @Value("${autowash.auth.jwt.refresh-token-expiration-seconds}") long refreshTokenExpirationSeconds,
            @Value("${autowash.auth.google.ticket-ttl-seconds:300}") long ticketTtlSeconds
    ) {
        this.googleOAuthClient = googleOAuthClient;
        this.ticketRepository = ticketRepository;
        this.userRepository = userRepository;
        this.oauthAccountRepository = oauthAccountRepository;
        this.userPreferenceRepository = userPreferenceRepository;
        this.loyaltyAccountRepository = loyaltyAccountRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.refreshTokenExpirationSeconds = refreshTokenExpirationSeconds;
        this.ticketTtlSeconds = ticketTtlSeconds;
    }

    // -----------------------------------------------------------------------
    // Step 1: Create ticket + redirect to Google
    // -----------------------------------------------------------------------

    @Override
    @Transactional
    public String buildAuthorizationUrl(String returnUrl) {
        String state = UUID.randomUUID().toString().replace("-", "");
        GoogleAuthTicket ticket = new GoogleAuthTicket(
                state,
                returnUrl,
                Instant.now().plusSeconds(ticketTtlSeconds)
        );
        ticketRepository.save(ticket);
        return googleOAuthClient.buildAuthorizationUrl(state, returnUrl);
    }

    // -----------------------------------------------------------------------
    // Step 2: Google redirects back → exchange code → update ticket → redirect frontend
    // -----------------------------------------------------------------------

    @Override
    @Transactional
    public String handleCallback(String code, String state) {
        GoogleAuthTicket ticket = ticketRepository.findByState(state)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Invalid OAuth state", "INVALID_STATE"));

        if (ticket.isExpired()) {
            ticket.markExpired();
            return buildErrorRedirect(ticket.getReturnUrl(), "OAuth session expired");
        }

        // Exchange code for Google user info
        GoogleOAuthUserInfo googleUser;
        try {
            googleUser = googleOAuthClient.exchangeCode(code);
        } catch (Exception e) {
            return buildErrorRedirect(ticket.getReturnUrl(), "Failed to exchange Google code");
        }

        if (googleUser.subject() == null || googleUser.email() == null) {
            return buildErrorRedirect(ticket.getReturnUrl(), "Incomplete Google profile");
        }

        // Check if returning Google-linked user
        Optional<UserOAuthAccount> existingOAuth =
                oauthAccountRepository.findByProviderAndProviderUserId(OAuthProvider.GOOGLE, googleUser.subject());

        if (existingOAuth.isPresent()) {
            // Sync profile and mark READY immediately
            User user = existingOAuth.get().getUser();
            if (googleUser.avatarUrl() != null) user.setAvatarUrl(googleUser.avatarUrl());
            ticket.markReady(googleUser.subject(), googleUser.email(),
                    googleUser.fullName(), googleUser.avatarUrl());
        } else {
            // Check if local account exists with same email
            Optional<User> existingUser = userRepository.findByEmailIgnoreCase(googleUser.email());
            if (existingUser.isPresent()) {
                // Needs confirmation from user
                ticket.markLinkRequired(googleUser.subject(), googleUser.email(),
                        googleUser.fullName(), googleUser.avatarUrl(), existingUser.get().getId());
            } else {
                // Brand-new user — mark READY, account created at exchange time
                ticket.markReady(googleUser.subject(), googleUser.email(),
                        googleUser.fullName(), googleUser.avatarUrl());
            }
        }

        // Redirect frontend to callback page with state param
        String callbackUrl = ticket.getReturnUrl();
        String separator = callbackUrl.contains("?") ? "&" : "?";
        return callbackUrl + separator + "state=" + encode(state);
    }

    // -----------------------------------------------------------------------
    // Step 3a: Frontend polls ticket status
    // -----------------------------------------------------------------------

    @Override
    @Transactional(readOnly = true)
    public GoogleAuthTicketResponse getTicket(String state) {
        GoogleAuthTicket ticket = ticketRepository.findByState(state)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Ticket not found", "RESOURCE_NOT_FOUND"));

        boolean expired = ticket.isExpired();
        return new GoogleAuthTicketResponse(
                ticket.getState(),
                expired ? "EXPIRED" : ticket.getStatus().name(),
                ticket.getProviderEmail(),
                ticket.getProviderFullName(),
                ticket.getProviderAvatarUrl(),
                ticket.getReturnUrl(),
                ticket.getUserId() != null ? ticket.getUserId().toString() : null,
                ticket.getStatus().name().equals("LINK_REQUIRED"),
                expired
        );
    }

    // -----------------------------------------------------------------------
    // Step 3b: Exchange READY ticket for JWT
    // -----------------------------------------------------------------------

    @Override
    @Transactional
    public LoginResponse exchangeTicket(String state) {
        GoogleAuthTicket ticket = requireValidTicket(state);

        if (ticket.getStatus().name().equals("LINK_REQUIRED")) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Account link confirmation required", "LINK_REQUIRED");
        }
        if (!ticket.getStatus().name().equals("READY")) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Ticket is not ready", "TICKET_NOT_READY");
        }

        User user;
        boolean isNew;

        // Check if already linked (returning user)
        Optional<UserOAuthAccount> existingOAuth =
                oauthAccountRepository.findByProviderAndProviderUserId(
                        OAuthProvider.GOOGLE, ticket.getProviderSubject());

        if (existingOAuth.isPresent()) {
            user = existingOAuth.get().getUser();
            isNew = false;
        } else {
            // Create brand-new user from Google profile
            user = User.fromGoogle(ticket.getProviderFullName(),
                    ticket.getProviderEmail(), ticket.getProviderAvatarUrl());
            user.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
            user = userRepository.save(user);
            ensureDefaultCustomerRecords(user);

            oauthAccountRepository.save(new UserOAuthAccount(
                    user, OAuthProvider.GOOGLE, ticket.getProviderSubject()
            ));
            isNew = true;
        }

        requireNotBlocked(user);
        ticket.markConsumed();
        return issueLoginResponse(user, isNew);
    }

    // -----------------------------------------------------------------------
    // Step 3c: Confirm link for existing account
    // -----------------------------------------------------------------------

    @Override
    @Transactional
    public LoginResponse confirmLink(String state) {
        GoogleAuthTicket ticket = requireValidTicket(state);

        if (!ticket.getStatus().name().equals("LINK_REQUIRED") || ticket.getUserId() == null) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "No link confirmation required for this ticket", "INVALID_STATE");
        }

        User user = userRepository.findById(ticket.getUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Account not found", "RESOURCE_NOT_FOUND"));

        requireNotBlocked(user);

        // Link Google to existing account
        oauthAccountRepository.save(new UserOAuthAccount(
                user, OAuthProvider.GOOGLE, ticket.getProviderSubject()
        ));

        // Sync name/avatar from Google
        if (ticket.getProviderFullName() != null) user.setFullName(ticket.getProviderFullName());
        if (ticket.getProviderAvatarUrl() != null) user.setAvatarUrl(ticket.getProviderAvatarUrl());

        ticket.markConsumed();
        return issueLoginResponse(user, false);
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private GoogleAuthTicket requireValidTicket(String state) {
        GoogleAuthTicket ticket = ticketRepository.findByState(state)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Ticket not found", "RESOURCE_NOT_FOUND"));
        if (ticket.isExpired()) {
            ticket.markExpired();
            throw new ApiException(HttpStatus.GONE, "OAuth ticket has expired", "TICKET_EXPIRED");
        }
        if (ticket.getStatus().name().equals("CONSUMED")) {
            throw new ApiException(HttpStatus.CONFLICT, "Ticket already used", "TICKET_CONSUMED");
        }
        return ticket;
    }

    private LoginResponse issueLoginResponse(User user, boolean isNew) {
        String accessToken = jwtService.generateAccessToken(user);
        RefreshToken refreshToken = new RefreshToken(
                user,
                UUID.randomUUID().toString(),
                Instant.now().plusSeconds(refreshTokenExpirationSeconds)
        );
        refreshTokenRepository.save(refreshToken);

        return new LoginResponse(
                user.getId().toString(),
                user.getFullName(),
                user.getPhone(),
                user.getEmail(),
                user.getRole().name(),
                user.getStatus().name(),
                "BRONZE",
                0,
                isNew,
                accessToken,
                refreshToken.getToken(),
                jwtService.getAccessTokenExpirationSeconds()
        );
    }

    private void ensureDefaultCustomerRecords(User user) {
        if (!userPreferenceRepository.existsById(user.getId())) {
            userPreferenceRepository.save(new UserPreference(user));
        }
        if (loyaltyAccountRepository.findByCustomerId(user.getId()).isEmpty()) {
            loyaltyAccountRepository.save(new LoyaltyAccount(user));
        }
    }

    private void requireNotBlocked(User user) {
        if ("BLOCKED".equals(user.getStatus().name())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Account is blocked", "ACCOUNT_BLOCKED");
        }
    }

    private String buildErrorRedirect(String returnUrl, String error) {
        String separator = returnUrl.contains("?") ? "&" : "?";
        return returnUrl + separator + "status=error&error=" + encode(error);
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
