package com.autowash.admin;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;


import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;

import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminTierConfigControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;


    @Test
    void adminCanGetTierConfigs() throws Exception {
        mockMvc.perform(get("/api/v1/admin/tiers")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(5))
                .andExpect(jsonPath("$.data[0].tier").value("BRONZE"))
                .andExpect(jsonPath("$.data[1].tier").value("SILVER"));
    }

    @Test
    void adminCanUpdateTierConfig() throws Exception {
        String updateJson = """
                {
                    "minPoints": 1600,
                    "pointMultiplier": 1.6,
                    "priorityScore": 100
                }
                """;

        mockMvc.perform(put("/api/v1/admin/tiers/GOLD")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tier").value("GOLD"))
                .andExpect(jsonPath("$.data.minPoints").value(1600))
                .andExpect(jsonPath("$.data.pointMultiplier").value(1.6))
                .andExpect(jsonPath("$.data.priorityScore").value(100));
        
        // Revert back for other tests just in case
        String revertJson = """
                {
                    "minPoints": 1500,
                    "pointMultiplier": 1.5,
                    "priorityScore": 0
                }
                """;
        mockMvc.perform(put("/api/v1/admin/tiers/GOLD")
                        .with(user("admin").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(revertJson))
                .andExpect(status().isOk());
    }

    @Test
    void customerCannotAccessAdminTierEndpoints() throws Exception {
        mockMvc.perform(get("/api/v1/admin/tiers")
                        .with(user("customer").roles("CUSTOMER")))
                .andExpect(status().isForbidden());

        String validJson = """
                {
                    "minPoints": 1600,
                    "pointMultiplier": 1.6,
                    "priorityScore": 100
                }
                """;

        mockMvc.perform(put("/api/v1/admin/tiers/SILVER")
                        .with(user("customer").roles("CUSTOMER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validJson))
                .andExpect(status().isForbidden());
    }
}
