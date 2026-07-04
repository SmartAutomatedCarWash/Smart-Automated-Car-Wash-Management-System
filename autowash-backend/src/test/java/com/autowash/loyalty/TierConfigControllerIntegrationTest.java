package com.autowash.loyalty;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TierConfigControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void publicCanGetTierConfigs() throws Exception {
        mockMvc.perform(get("/api/v1/tiers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data.length()").value(5))
                .andExpect(jsonPath("$.data[0].tier").value("BRONZE"))
                .andExpect(jsonPath("$.data[1].tier").value("SILVER"))
                .andExpect(jsonPath("$.data[4].tier").value("DIAMOND"));
    }
}
