package com.autowash.catalog;

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.autowash.entity.User;
import com.autowash.entity.enums.LoyaltyTier;
import com.autowash.repository.UserRepository;
import com.autowash.shared.security.UserPrincipal;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PromotionControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository UserRepository;

    @Autowired
    private com.autowash.repository.LoyaltyAccountRepository loyaltyAccountRepository;

    @Test
    void adminCanCreateReadUpdateAndDeletePromotion() throws Exception {
        String promotionId = createPromotion("ADMIN_SPRING_SALE", "SPECIFIC_TIERS", """
                ["SILVER","GOLD"]
                """);

        mockMvc.perform(get("/api/v1/admin/promotions/{promotionId}", promotionId)
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.promotionId").value(promotionId))
                .andExpect(jsonPath("$.data.name").value("ADMIN_SPRING_SALE"))
                .andExpect(jsonPath("$.data.targetingMode").value("SPECIFIC_TIERS"))
                .andExpect(jsonPath("$.data.applicableTiers", hasItem("SILVER")));

        mockMvc.perform(put("/api/v1/admin/promotions/{promotionId}", promotionId)
                        .with(user("admin").roles("ADMIN"))
                        .contentType("application/json")
                        .content("""
                                {
                                  "name": "ADMIN_SPRING_SALE_UPDATED",
                                  "description": "Updated campaign",
                                  "pointMultiplier": 2.0,
                                  "startDate": "2026-01-01T00:00:00Z",
                                  "endDate": "2026-12-31T23:59:59Z",
                                  "targetingMode": "ALL_TIERS",
                                  "maxUsagePerCustomer": 2,
                                  "status": "ACTIVE"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("ADMIN_SPRING_SALE_UPDATED"))
                .andExpect(jsonPath("$.data.pointMultiplier").value(2.0))
                .andExpect(jsonPath("$.data.targetingMode").value("ALL_TIERS"));

        mockMvc.perform(delete("/api/v1/admin/promotions/{promotionId}", promotionId)
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.promotionId").value(promotionId));

        mockMvc.perform(get("/api/v1/admin/promotions/{promotionId}", promotionId)
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isNotFound());
    }

    @Test
    void createRejectsInvalidPromotionName() throws Exception {
        mockMvc.perform(post("/api/v1/admin/promotions")
                        .with(user("admin").roles("ADMIN"))
                        .contentType("application/json")
                        .content("""
                                {
                                  "name": "summer sale",
                                  "pointMultiplier": 1.5,
                                  "startDate": "2026-01-01T00:00:00Z",
                                  "endDate": "2026-12-31T23:59:59Z",
                                  "targetingMode": "ALL_TIERS"
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createRejectsInvalidDateRangeAndMissingSelectedTiers() throws Exception {
        mockMvc.perform(post("/api/v1/admin/promotions")
                        .with(user("admin").roles("ADMIN"))
                        .contentType("application/json")
                        .content("""
                                {
                                  "name": "BAD_DATE",
                                  "pointMultiplier": 1.5,
                                  "startDate": "2026-12-31T23:59:59Z",
                                  "endDate": "2026-01-01T00:00:00Z",
                                  "targetingMode": "ALL_TIERS"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));

        mockMvc.perform(post("/api/v1/admin/promotions")
                        .with(user("admin").roles("ADMIN"))
                        .contentType("application/json")
                        .content("""
                                {
                                  "name": "MISSING_TIERS",
                                  "pointMultiplier": 1.5,
                                  "startDate": "2026-01-01T00:00:00Z",
                                  "endDate": "2026-12-31T23:59:59Z",
                                  "targetingMode": "SELECTED_TIERS"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void customerPromotionsReturnOnlyActiveEligibleCampaigns() throws Exception {
        User member = createActiveCustomer("0901777301", LoyaltyTier.BRONZE);
        mockMvc.perform(get("/api/v1/promotions")
                        .with(authenticatedCustomer(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].promotionId", hasItem("88888888-1234-1234-1234-123456789012")));

        User gold = createActiveCustomer("0901777302", LoyaltyTier.GOLD);
        mockMvc.perform(get("/api/v1/promotions")
                        .with(authenticatedCustomer(gold)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].promotionId", hasItem("88888888-1234-1234-1234-123456789012")));
    }

    @Test
    void promotionEndpointsAreRoleProtectedAndDocumented() throws Exception {
        mockMvc.perform(post("/api/v1/admin/promotions")
                        .with(user("customer").roles("CUSTOMER"))
                        .contentType("application/json")
                        .content("""
                                {
                                  "name": "FORBIDDEN",
                                  "pointMultiplier": 1.5,
                                  "startDate": "2026-01-01T00:00:00Z",
                                  "endDate": "2026-12-31T23:59:59Z",
                                  "targetingMode": "ALL_TIERS"
                                }
                                """))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/v1/admin/promotions']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/admin/promotions/{promotionId}']").exists())
                .andExpect(jsonPath("$.paths['/api/v1/promotions']").exists())
                .andExpect(jsonPath("$.components.schemas.PromotionResponse.properties.promotionId.type").value("string"));
    }

    private String createPromotion(String name, String targetingMode, String applicableTiersJson) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/admin/promotions")
                        .with(user("admin").roles("ADMIN"))
                        .contentType("application/json")
                        .content("""
                                {
                                  "name": "%s",
                                  "description": "Campaign description",
                                  "pointMultiplier": 1.5,
                                  "startDate": "2026-01-01T00:00:00Z",
                                  "endDate": "2026-12-31T23:59:59Z",
                                  "targetingMode": "%s",
                                  "applicableTiers": %s,
                                  "maxUsagePerCustomer": 1,
                                  "status": "ACTIVE"
                                }
                                """.formatted(name, targetingMode, applicableTiersJson)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.promotionId").isString())
                .andReturn();
        return readJson(result).path("data").path("promotionId").asText();
    }

    private User createActiveCustomer(String phone, LoyaltyTier tier) {
        User user = new User("Nguyen Van A", phone, phone + "@example.com", "hash");
        user.activate();
        user = UserRepository.saveAndFlush(user);
        com.autowash.entity.LoyaltyAccount account = new com.autowash.entity.LoyaltyAccount(user);
        account.updateTier(tier);
        loyaltyAccountRepository.saveAndFlush(account);
        return user;
    }

    private org.springframework.test.web.servlet.request.RequestPostProcessor authenticatedCustomer(User user) {
        UserPrincipal principal = new UserPrincipal(user);
        UsernamePasswordAuthenticationToken token =
                new UsernamePasswordAuthenticationToken(principal, principal.getPassword(), principal.getAuthorities());
        return authentication(token);
    }

    private JsonNode readJson(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }
}
