package com.autowash.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import com.autowash.entity.User;
import com.autowash.entity.enums.OtpPurpose;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.autowash.repository.LoyaltyAccountRepository;
import com.autowash.repository.UserRepository;
import com.autowash.repository.OtpVerificationRepository;
import com.autowash.repository.UserPreferenceRepository;

import java.util.Base64;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest(properties = "autowash.auth.otp.max-attempts=5")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;


    @Autowired
    private UserRepository UserRepository;

    @Autowired
    private OtpVerificationRepository OtpVerificationRepository;

    @Autowired
    private UserPreferenceRepository userPreferenceRepository;

    @Autowired
    private LoyaltyAccountRepository loyaltyAccountRepository;

    @MockBean
    private com.autowash.service.GoogleOAuthClient googleOAuthClient;

    @Test
    void registerCreatesPendingCustomerWithDefaultMemberTier() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType("application/json")
                        .content("""
                                {
                                  "fullName": "Nguyen Van A",
                                  "email": "pending@example.com",
                                  "password": "SecurePass1!",
                                  "passwordConfirm": "SecurePass1!"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.requiresOtpVerification").value(true));

        User user = UserRepository.findByEmailIgnoreCase("pending@example.com").orElseThrow();
        Assertions.assertTrue(userPreferenceRepository.existsById(user.getId()));
        Assertions.assertTrue(loyaltyAccountRepository.findByCustomerId(user.getId()).isPresent());
    }

    @Test
    void registerRejectsDuplicateEmail() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType("application/json")
                        .content("""
                                {
                                  "fullName": "Nguyen Van A",
                                  "email": "duplicate-email@example.com",
                                  "password": "SecurePass1!",
                                  "passwordConfirm": "SecurePass1!"
                                }
                                """))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType("application/json")
                        .content("""
                                {
                                  "fullName": "Duplicate User",
                                  "email": "duplicate-email@example.com",
                                  "password": "SecurePass1!",
                                  "passwordConfirm": "SecurePass1!"
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("DUPLICATE_EMAIL"));
    }

    @Test
    void sendOtpReturnsDevOtpForPendingAccount() throws Exception {
        registerCustomer("0901234569@example.com");

        mockMvc.perform(post("/api/v1/auth/otp/send")
                        .contentType("application/json")
                        .content("""
                                { "email": "0901234569@example.com" }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.otpExpiresIn").value(300))
                .andExpect(jsonPath("$.data.devOtp").isString());
    }

    @Test
    void registrationOtpIsSentToEmailAndStoredHashed() throws Exception {
        registerCustomer("0901234590@example.com");
        String email = "0901234590@example.com";
        String otp = sendOtpByEmailAndExtractDevOtp(email);

        User user = UserRepository.findByEmailIgnoreCase(email).orElseThrow();
        String storedCode = OtpVerificationRepository.findFirstByUserAndPurposeAndVerifiedAtIsNullOrderByCreatedAtDesc(
                        user,
                        OtpPurpose.EMAIL_REGISTRATION
                )
                .orElseThrow()
                .getCodeHash();

        Assertions.assertNotEquals(otp, storedCode);
        Assertions.assertTrue(storedCode.length() > 6);
    }

    @Test
    void resendOtpIsLimitedToThreeTimesPerEmailWindow() throws Exception {
        registerCustomer("0901234591@example.com");
        String email = "0901234591@example.com";

        sendOtpByEmailAndExtractDevOtp(email);
        sendOtpByEmailAndExtractDevOtp(email);

        mockMvc.perform(post("/api/v1/auth/otp/send")
                        .contentType("application/json")
                        .content("""
                                { "email": "%s" }
                                """.formatted(email)))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.errorCode").value("RATE_LIMIT_EXCEEDED"));
    }

    @Test
    void failedOtpAttemptsLockCurrentOtpButAllowNewOtp() throws Exception {
        registerCustomer("0901234592@example.com");
        String email = "0901234592@example.com";
        sendOtpByEmailAndExtractDevOtp(email);

        for (int attempt = 1; attempt <= 4; attempt++) {
            mockMvc.perform(post("/api/v1/auth/otp/verify")
                            .contentType("application/json")
                            .content("""
                                    {
                                      "email": "%s",
                                      "otp": "000000"
                                    }
                                    """.formatted(email)))
                    .andExpect(status().isUnprocessableEntity())
                    .andExpect(jsonPath("$.errorCode").value("INVALID_OTP"));
        }

        mockMvc.perform(post("/api/v1/auth/otp/verify")
                        .contentType("application/json")
                        .content("""
                                {
                                  "email": "%s",
                                  "otp": "000000"
                                }
                                """.formatted(email)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errorCode").value("RATE_LIMIT_EXCEEDED"));

        sendOtpByEmailAndExtractDevOtp(email);
    }

    @Test
    void verifyOtpActivatesAccountAndReturnsTokens() throws Exception {
        registerCustomer("0901234570@example.com");
        String otp = sendOtpByEmailAndExtractDevOtp("0901234570@example.com");

        mockMvc.perform(post("/api/v1/auth/otp/verify")
                        .contentType("application/json")
                        .content("""
                                {
                                  "email": "0901234570@example.com",
                                  "otp": "%s"
                                }
                                """.formatted(otp)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role").value("CUSTOMER"))
                .andExpect(jsonPath("$.data.tier").value("BRONZE"))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.accessToken").isString())
                .andExpect(jsonPath("$.data.refreshToken").isString());
    }

    @Test
    void accessTokenContainsSharedUserClaims() throws Exception {
        registerCustomer("0901234593@example.com");
        String otp = sendOtpByEmailAndExtractDevOtp("0901234593@example.com");
        String accessToken = verifyOtp("0901234593@example.com", otp).path("data").path("accessToken").asText();

        JsonNode claims = decodeJwtPayload(accessToken);

        Assertions.assertEquals(claims.path("sub").asText(), claims.path("userId").asText());
        Assertions.assertEquals("CUSTOMER", claims.path("role").asText());
        Assertions.assertEquals("ACTIVE", claims.path("status").asText());
    }

    @Test
    void forgotPasswordRequestAndResetAllowLoginWithNewPassword() throws Exception {
        registerCustomer("0901234594@example.com");
        String registrationOtp = sendOtpByEmailAndExtractDevOtp("0901234594@example.com");
        verifyOtp("0901234594@example.com", registrationOtp);

        MvcResult forgotPasswordResult = mockMvc.perform(post("/api/v1/auth/forgot-password/request")
                        .contentType("application/json")
                        .content("""
                                { "email": "0901234594@example.com" }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.devOtp").isString())
                .andReturn();

        String resetOtp = readJson(forgotPasswordResult).path("data").path("devOtp").asText();

        mockMvc.perform(post("/api/v1/auth/forgot-password/reset")
                        .contentType("application/json")
                        .content("""
                                {
                                  "email": "0901234594@example.com",
                                  "otp": "%s",
                                  "newPassword": "NewSecurePass1!",
                                  "newPasswordConfirm": "NewSecurePass1!"
                                }
                                """.formatted(resetOtp)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content("""
                                {
                                  "email": "0901234594@example.com",
                                  "password": "NewSecurePass1!",
                                  "rememberMe": false
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isString());
    }

    @Test
    void forgotPasswordRequestRejectsPhoneOnlyPayload() throws Exception {
        registerCustomer("0901234595@example.com");
        String registrationOtp = sendOtpByEmailAndExtractDevOtp("0901234595@example.com");
        verifyOtp("0901234595@example.com", registrationOtp);

        mockMvc.perform(post("/api/v1/auth/forgot-password/request")
                        .contentType("application/json")
                        .content("""
                                { "phone": "0901234595" }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void forgotPasswordResetRejectsPhoneOnlyPayload() throws Exception {
        mockMvc.perform(post("/api/v1/auth/forgot-password/reset")
                        .contentType("application/json")
                        .content("""
                                {
                                  "phone": "0901234595",
                                  "otp": "123456",
                                  "newPassword": "NewSecurePass1!",
                                  "newPasswordConfirm": "NewSecurePass1!"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void loginReturnsTokensForActiveAccount() throws Exception {
        registerCustomer("0901234571@example.com");
        String otp = sendOtpByEmailAndExtractDevOtp("0901234571@example.com");
        verifyOtp("0901234571@example.com", otp);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content("""
                                {
                                  "email": "0901234571@example.com",
                                  "password": "SecurePass1!",
                                  "rememberMe": false
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isString())
                .andExpect(jsonPath("$.data.refreshToken").isString());
    }

    @Test
    void loginRejectsPhoneIdentifierForActiveAccount() throws Exception {
        registerCustomer("0901234578@example.com");
        String otp = sendOtpByEmailAndExtractDevOtp("0901234578@example.com");
        verifyOtp("0901234578@example.com", otp);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content("""
                                {
                                  "email": "0901234578",
                                  "password": "SecurePass1!",
                                  "rememberMe": false
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void refreshReturnsNewAccessToken() throws Exception {
        registerCustomer("0901234572@example.com");
        String otp = sendOtpByEmailAndExtractDevOtp("0901234572@example.com");
        String refreshToken = verifyOtp("0901234572@example.com", otp).path("data").path("refreshToken").asText();

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType("application/json")
                        .content("""
                                { "refreshToken": "%s" }
                                """.formatted(refreshToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isString());
    }

    @Test
    void logoutRevokesRefreshToken() throws Exception {
        registerCustomer("0901234573@example.com");
        String otp = sendOtpByEmailAndExtractDevOtp("0901234573@example.com");
        String refreshToken = verifyOtp("0901234573@example.com", otp).path("data").path("refreshToken").asText();

        mockMvc.perform(post("/api/v1/auth/logout")
                        .contentType("application/json")
                        .content("""
                                { "refreshToken": "%s" }
                                """.formatted(refreshToken)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType("application/json")
                        .content("""
                                { "refreshToken": "%s" }
                                """.formatted(refreshToken)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("TOKEN_INVALID"));
    }

    @Test
    void loginRejectsPendingAccount() throws Exception {
        registerCustomer("0901234574@example.com");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content("""
                                {
                                  "email": "0901234574@example.com",
                                  "password": "SecurePass1!",
                                  "rememberMe": false
                                }
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errorCode").value("ACCOUNT_NOT_ACTIVE"));
    }

    @Test
    void sendOtpRejectsActiveAccount() throws Exception {
        registerCustomer("0901234579@example.com");
        String otp = sendOtpByEmailAndExtractDevOtp("0901234579@example.com");
        verifyOtp("0901234579@example.com", otp);

        mockMvc.perform(post("/api/v1/auth/otp/send")
                        .contentType("application/json")
                        .content("""
                                { "email": "0901234579@example.com" }
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errorCode").value("RESOURCE_LOCKED"));
    }

    @Test
    void verifyOtpRejectsActiveAccount() throws Exception {
        registerCustomer("0901234580@example.com");
        String otp = sendOtpByEmailAndExtractDevOtp("0901234580@example.com");
        verifyOtp("0901234580@example.com", otp);

        mockMvc.perform(post("/api/v1/auth/otp/verify")
                        .contentType("application/json")
                        .content("""
                                {
                                  "email": "0901234580@example.com",
                                  "otp": "%s"
                                }
                                """.formatted(otp)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errorCode").value("RESOURCE_LOCKED"));
    }

    @Test
    void registerRejectsMissingEmailWithValidationErrorShape() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType("application/json")
                        .content("""
                                {
                                  "fullName": "Missing Email",
                                  "password": "SecurePass1!",
                                  "passwordConfirm": "SecurePass1!"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.errors[0].field").exists());
    }

    @Test
    void loginPreflightAllowsFrontendOrigin() throws Exception {
        mockMvc.perform(options("/api/v1/auth/login")
                        .header("Origin", "http://localhost:3000")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "content-type,authorization"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"));
    }

    @Test
    void googleAccountCanSetLocalPasswordThroughForgotPassword() throws Exception {
        when(googleOAuthClient.exchangeCode(anyString()))
                .thenReturn(new com.autowash.dto.GoogleOAuthUserInfo(
                        "google-sub-001",
                        "google-only@example.com",
                        "Google User",
                        "https://example.com/avatar.png",
                        true
                ));

        String state = mockMvc.perform(get("/api/v1/auth/google/callback")
                        .param("code", "google-code")
                        .param("state", createGoogleState("http://localhost:3000/auth/google/callback")))
                .andExpect(status().is3xxRedirection())
                .andReturn()
                .getResponse()
                .getRedirectedUrl()
                .replace("http://localhost:3000/auth/google/callback?state=", "");

        mockMvc.perform(post("/api/v1/auth/google/tickets/exchange")
                        .contentType("application/json")
                        .content("""
                                { "state": "%s" }
                                """.formatted(state)))
                .andExpect(status().isOk());

        MvcResult forgotPasswordResult = mockMvc.perform(post("/api/v1/auth/forgot-password/request")
                        .contentType("application/json")
                        .content("""
                                { "email": "google-only@example.com" }
                                """))
                .andExpect(status().isOk())
                .andReturn();

        String resetOtp = readJson(forgotPasswordResult).path("data").path("devOtp").asText();

        mockMvc.perform(post("/api/v1/auth/forgot-password/reset")
                        .contentType("application/json")
                        .content("""
                                {
                                  "email": "google-only@example.com",
                                  "otp": "%s",
                                  "newPassword": "NewSecurePass1!",
                                  "newPasswordConfirm": "NewSecurePass1!"
                                }
                                """.formatted(resetOtp)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content("""
                                {
                                  "email": "google-only@example.com",
                                  "password": "NewSecurePass1!",
                                  "rememberMe": false
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isString());
    }


    private void registerCustomer(String email) throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType("application/json")
                        .content("""
                                {
                                  "fullName": "Nguyen Van A",
                                  "email": "%s",
                                  "password": "SecurePass1!",
                                  "passwordConfirm": "SecurePass1!"
                                }
                                """.formatted(email)))
                .andExpect(status().isCreated());
    }

    private String sendOtpByEmailAndExtractDevOtp(String email) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/otp/send")
                        .contentType("application/json")
                        .content("""
                                { "email": "%s" }
                                """.formatted(email)))
                .andExpect(status().isOk())
                .andReturn();
        return readJson(result).path("data").path("devOtp").asText();
    }

    private JsonNode verifyOtp(String email, String otp) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/otp/verify")
                        .contentType("application/json")
                        .content("""
                                {
                                  "email": "%s",
                                  "otp": "%s"
                                }
                                """.formatted(email, otp)))
                .andExpect(status().isOk())
                .andReturn();
        return readJson(result);
    }

    private String createGoogleState(String returnUrl) throws Exception {
        when(googleOAuthClient.buildAuthorizationUrl(anyString(), anyString()))
                .thenAnswer(invocation -> {
                    String state = invocation.getArgument(0, String.class);
                    String nextReturnUrl = invocation.getArgument(1, String.class);
                    return "https://accounts.google.com/o/oauth2/v2/auth?state=" + state
                            + "&redirect_uri=" + java.net.URLEncoder.encode(nextReturnUrl, java.nio.charset.StandardCharsets.UTF_8);
                });

        MvcResult result = mockMvc.perform(get("/api/v1/auth/google/start")
                        .param("returnUrl", returnUrl))
                .andExpect(status().is3xxRedirection())
                .andReturn();

        String location = result.getResponse().getRedirectedUrl();
        int stateIndex = location.indexOf("state=");
        String tail = location.substring(stateIndex + 6);
        int separator = tail.indexOf('&');
        return separator >= 0 ? tail.substring(0, separator) : tail;
    }

    private JsonNode readJson(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private JsonNode decodeJwtPayload(String token) throws Exception {
        String payload = token.split("\\.")[1];
        byte[] decoded = Base64.getUrlDecoder().decode(payload);
        return objectMapper.readTree(decoded);
    }
}
