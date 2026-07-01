package com.autowash.user;

import com.autowash.entity.User;
import com.autowash.entity.enums.UserStatus;
import com.autowash.repository.UserRepository;
import com.autowash.service.AvatarStorageService;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import static org.hamcrest.Matchers.nullValue;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UserProfileControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @MockBean
    private AvatarStorageService avatarStorageService;

    @Test
    void getProfileReturnsAuthenticatedCustomerProfile() throws Exception {
        String accessToken = registerActivateAndLogin("customer4680");

        mockMvc.perform(get("/api/v1/users/profile")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.avatarUrl").value(nullValue()))
                .andExpect(jsonPath("$.data.phone").value(nullValue()))
                .andExpect(jsonPath("$.data.hasGoogleAuth").value(false))
                .andExpect(jsonPath("$.data.role").value("CUSTOMER"))
                .andExpect(jsonPath("$.data.tier").value("MEMBER"))
                .andExpect(jsonPath("$.data.loyaltyBalance").value(0))
                .andExpect(jsonPath("$.data.preferences.language").value("VI"))
                .andExpect(jsonPath("$.data.preferences.theme").value("LIGHT"));
    }

    @Test
    void getProfileRejectsUnauthenticatedRequest() throws Exception {
        mockMvc.perform(get("/api/v1/users/profile"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void updateProfileUpdatesFullNameEmailAndPhone() throws Exception {
        String accessToken = registerActivateAndLogin("customer4681");

        mockMvc.perform(put("/api/v1/users/profile")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "fullName": "Nguyen Van Updated",
                                  "email": "updated@example.com",
                                  "phone": "0901234699"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.fullName").value("Nguyen Van Updated"))
                .andExpect(jsonPath("$.data.email").value("updated@example.com"))
                .andExpect(jsonPath("$.data.phone").value("0901234699"));
    }

    @Test
    void createAvatarUploadUrlReturnsSignedUploadTarget() throws Exception {
        String accessToken = registerActivateAndLogin("customer4688");
        Mockito.when(avatarStorageService.createAvatarUpload(Mockito.any(), Mockito.anyString(), Mockito.anyString()))
                .thenReturn(new AvatarStorageService.AvatarUploadTarget(
                        "avatars/customer/avatar-1.png",
                        "https://storage.example.com/upload/avatar-1",
                        "https://cdn.example.com/avatars/customer/avatar-1.png"
                ));

        mockMvc.perform(post("/api/v1/users/profile/avatar/upload-url")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "fileName": "avatar.png",
                                  "contentType": "image/png"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.objectKey").value("avatars/customer/avatar-1.png"))
                .andExpect(jsonPath("$.data.uploadUrl").value("https://storage.example.com/upload/avatar-1"))
                .andExpect(jsonPath("$.data.publicUrl").value("https://cdn.example.com/avatars/customer/avatar-1.png"));
    }

    @Test
    void updateAvatarPersistsAvatarUrlForCurrentUser() throws Exception {
        String accessToken = registerActivateAndLogin("customer4689");
        User user = userRepository.findByEmailIgnoreCase("customer4689@example.com").orElseThrow();

        Mockito.when(avatarStorageService.resolveAvatarUrl(user.getId(), "avatars/%s/avatar-2.png".formatted(user.getId())))
                .thenReturn("https://cdn.example.com/avatars/%s/avatar-2.png".formatted(user.getId()));

        mockMvc.perform(put("/api/v1/users/profile/avatar")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "objectKey": "avatars/%s/avatar-2.png"
                                }
                                """.formatted(user.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.avatarUrl").value("https://cdn.example.com/avatars/%s/avatar-2.png".formatted(user.getId())));

        mockMvc.perform(get("/api/v1/users/profile")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.avatarUrl").value("https://cdn.example.com/avatars/%s/avatar-2.png".formatted(user.getId())));
    }

    @Test
    void updateProfileRejectsDuplicatePhone() throws Exception {
        String firstAccessToken = registerActivateAndLogin("customer4585");
        String secondAccessToken = registerActivateAndLogin("customer4586");

        mockMvc.perform(put("/api/v1/users/profile")
                        .header("Authorization", "Bearer " + secondAccessToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "fullName": "Nguyen Van Existing",
                                  "email": "customer4586@example.com",
                                  "phone": "0901234586"
                                }
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(put("/api/v1/users/profile")
                        .header("Authorization", "Bearer " + firstAccessToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "fullName": "Nguyen Van Updated",
                                  "email": "customer4585.updated@example.com",
                                  "phone": "0901234586"
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("DUPLICATE_PHONE"));
    }

    @Test
    void updateProfileRejectsInvalidEmail() throws Exception {
        String accessToken = registerActivateAndLogin("customer4682");

        mockMvc.perform(put("/api/v1/users/profile")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "fullName": "Nguyen Van Updated",
                                  "email": "not-an-email"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void getPreferencesReturnsCurrentUserPreferences() throws Exception {
        String accessToken = registerActivateAndLogin("customer4683");

        mockMvc.perform(get("/api/v1/users/preferences")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.language").value("VI"))
                .andExpect(jsonPath("$.data.theme").value("LIGHT"))
                .andExpect(jsonPath("$.data.notificationsEnabled").value(true));
    }

    @Test
    void updatePreferencesPersistsNewValues() throws Exception {
        String accessToken = registerActivateAndLogin("customer4684");

        mockMvc.perform(put("/api/v1/users/preferences")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "language": "EN",
                                  "theme": "DARK",
                                  "notificationsEnabled": true,
                                  "emailNotifications": true,
                                  "smsNotifications": false
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.language").value("EN"))
                .andExpect(jsonPath("$.data.theme").value("DARK"))
                .andExpect(jsonPath("$.data.notificationsEnabled").value(true))
                .andExpect(jsonPath("$.data.updatedAt").isString())
                .andExpect(jsonPath("$.data.userId").doesNotExist())
                .andExpect(jsonPath("$.data.emailNotifications").doesNotExist())
                .andExpect(jsonPath("$.data.smsNotifications").doesNotExist());
    }

    @Test
    void getProfileRequiresValidBearerToken() throws Exception {
        mockMvc.perform(get("/api/v1/users/profile")
                        .header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getProfileRejectsTokenWhenUserIsNoLongerActive() throws Exception {
        String accessToken = registerActivateAndLogin("customer4687");
        User user = userRepository.findByEmailIgnoreCase("customer4687@example.com").orElseThrow();
        user.updateStatus(UserStatus.BLOCKED);
        userRepository.save(user);

        mockMvc.perform(get("/api/v1/users/profile")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void openApiDocumentsProfileAndPreferencesSchemas() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.components.schemas.UpdateUserProfileRequest.properties.fullName.type").value("string"))
                .andExpect(jsonPath("$.components.schemas.UpdateUserProfileRequest.properties.email.type").value("string"))
                .andExpect(jsonPath("$.components.schemas.UpdateUserProfileRequest.properties.phone.type").value("string"))
                .andExpect(jsonPath("$.components.schemas.UserProfileResponse.properties.avatarUrl.type").value("string"))
                .andExpect(jsonPath("$.components.schemas.UpdateUserPreferencesResponse.properties.language.type").value("string"))
                .andExpect(jsonPath("$.components.schemas.UpdateUserPreferencesResponse.properties.theme.type").value("string"))
                .andExpect(jsonPath("$.components.schemas.UpdateUserPreferencesResponse.properties.notificationsEnabled.type").value("boolean"))
                .andExpect(jsonPath("$.components.schemas.UpdateUserPreferencesResponse.properties.updatedAt.type").value("string"))
                .andExpect(jsonPath("$.components.schemas.UpdateUserPreferencesResponse.properties.userId").doesNotExist())
                .andExpect(jsonPath("$.components.schemas.UpdateUserPreferencesResponse.properties.emailNotifications").doesNotExist())
                .andExpect(jsonPath("$.components.schemas.UpdateUserPreferencesResponse.properties.smsNotifications").doesNotExist())
                .andExpect(jsonPath("$.paths['/api/v1/users/profile/avatar/upload-url']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/users/profile/avatar']").exists());
    }

    private String registerActivateAndLogin(String emailLocalPart) throws Exception {
        String email = emailLocalPart + "@example.com";

        MvcResult registerResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType("application/json")
                        .content("""
                                {
                                  "fullName": "Nguyen Van A",
                                  "email": "%s@example.com",
                                  "password": "SecurePass1!",
                                  "passwordConfirm": "SecurePass1!"
                                }
                                """.formatted(emailLocalPart)))
                .andReturn();

        String otp = readJson(registerResult).path("data").path("devOtp").asText();

        MvcResult verifyOtpResult = mockMvc.perform(post("/api/v1/auth/otp/verify")
                        .contentType("application/json")
                        .content("""
                                {
                                  "email": "%s",
                                  "otp": "%s"
                                }
                                """.formatted(email, otp)))
                .andExpect(status().isOk())
                .andReturn();

        return readJson(verifyOtpResult).path("data").path("accessToken").asText();
    }

    private JsonNode readJson(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }
}
