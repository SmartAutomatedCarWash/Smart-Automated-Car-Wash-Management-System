package com.autowash.vehicle;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class VehicleControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void createVehicleMakesFirstVehiclePrimary() throws Exception {
        String accessToken = registerActivateAndLogin("0901234601");

        mockMvc.perform(post("/api/v1/customers/vehicles")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "plate": "30H-123456",
                                  "type": "CAR",
                                  "brand": "Toyota",
                                  "model": "Camry",
                                  "year": 2023,
                                  "color": "Silver"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.plate").value("30H-123456"))
                .andExpect(jsonPath("$.data.isPrimary").value(true))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    @Test
    void createVehicleRejectsDuplicatePlateForSameCustomer() throws Exception {
        String accessToken = registerActivateAndLogin("0901234602");
        createVehicle(accessToken, "30H-123457", "Toyota", "Camry");

        mockMvc.perform(post("/api/v1/customers/vehicles")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "plate": "30H-123457",
                                  "type": "CAR",
                                  "brand": "Honda",
                                  "model": "Civic",
                                  "year": 2024,
                                  "color": "Black"
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("DUPLICATE_PLATE"));
    }

    @Test
    void createVehicleRejectsDuplicatePlateAcrossCustomers() throws Exception {
        String firstToken = registerActivateAndLogin("0901234611");
        String secondToken = registerActivateAndLogin("0901234612");
        createVehicle(firstToken, "30H-123466", "Toyota", "Camry");

        mockMvc.perform(post("/api/v1/customers/vehicles")
                        .header("Authorization", "Bearer " + secondToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "plate": "30H-123466",
                                  "type": "CAR",
                                  "brand": "Honda",
                                  "model": "Civic",
                                  "year": 2024,
                                  "color": "Black"
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("DUPLICATE_PLATE"));
    }

    @Test
    void listVehiclesReturnsOnlyCurrentCustomerVehiclesWithPagination() throws Exception {
        String firstToken = registerActivateAndLogin("0901234603");
        String secondToken = registerActivateAndLogin("0901234604");
        createVehicle(firstToken, "30H-123458", "Toyota", "Camry");
        createVehicle(firstToken, "51B-456789", "Honda", "CR-V");
        createVehicle(secondToken, "43A-111111", "Mazda", "CX5");

        mockMvc.perform(get("/api/v1/customers/vehicles")
                        .header("Authorization", "Bearer " + firstToken)
                        .param("page", "1")
                        .param("limit", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].plate").exists())
                .andExpect(jsonPath("$.pagination.page").value(1))
                .andExpect(jsonPath("$.pagination.limit").value(20))
                .andExpect(jsonPath("$.pagination.total").value(2))
                .andExpect(jsonPath("$.pagination.totalPages").value(1))
                .andExpect(jsonPath("$.pagination.hasMore").value(false));
    }

    @Test
    void getVehicleDetailRejectsAccessToAnotherCustomersVehicle() throws Exception {
        String ownerToken = registerActivateAndLogin("0901234605");
        String otherToken = registerActivateAndLogin("0901234606");
        String vehicleId = createVehicle(ownerToken, "30H-123459", "Toyota", "Camry");

        mockMvc.perform(get("/api/v1/customers/vehicles/{vehicleId}", vehicleId)
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    void updateVehicleChangesAllowedFieldsButNotPlate() throws Exception {
        String accessToken = registerActivateAndLogin("0901234607");
        String vehicleId = createVehicle(accessToken, "30H-123460", "Toyota", "Camry");

        mockMvc.perform(put("/api/v1/customers/vehicles/{vehicleId}", vehicleId)
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "brand": "Toyota",
                                  "model": "Corolla",
                                  "year": 2024,
                                  "color": "Red"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.plate").value("30H-123460"))
                .andExpect(jsonPath("$.data.model").value("Corolla"))
                .andExpect(jsonPath("$.data.year").value(2024))
                .andExpect(jsonPath("$.data.color").value("Red"));
    }

    @Test
    void setPrimaryKeepsExactlyOnePrimaryVehicle() throws Exception {
        String accessToken = registerActivateAndLogin("0901234608");
        String firstVehicleId = createVehicle(accessToken, "30H-123461", "Toyota", "Camry");
        String secondVehicleId = createVehicle(accessToken, "30H-123462", "Honda", "Civic");

        mockMvc.perform(post("/api/v1/customers/vehicles/{vehicleId}/set-primary", secondVehicleId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.vehicleId").value(secondVehicleId))
                .andExpect(jsonPath("$.data.isPrimary").value(true));

        mockMvc.perform(get("/api/v1/customers/vehicles")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].vehicleId").value(firstVehicleId))
                .andExpect(jsonPath("$.data[0].isPrimary").value(false))
                .andExpect(jsonPath("$.data[1].vehicleId").value(secondVehicleId))
                .andExpect(jsonPath("$.data[1].isPrimary").value(true));
    }

    @Test
    void deleteVehicleSoftDeletesAndPromotesAnotherPrimaryVehicle() throws Exception {
        String accessToken = registerActivateAndLogin("0901234609");
        String firstVehicleId = createVehicle(accessToken, "30H-123463", "Toyota", "Camry");
        String secondVehicleId = createVehicle(accessToken, "30H-123464", "Honda", "Civic");

        mockMvc.perform(delete("/api/v1/customers/vehicles/{vehicleId}", firstVehicleId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/customers/vehicles")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].vehicleId").value(secondVehicleId))
                .andExpect(jsonPath("$.data[0].isPrimary").value(true));
    }

    @Test
    void createVehicleRejectsReusingDeletedPlateForSameCustomer() throws Exception {
        String accessToken = registerActivateAndLogin("0901234610");
        String vehicleId = createVehicle(accessToken, "30H-123465", "Toyota", "Camry");

        mockMvc.perform(delete("/api/v1/customers/vehicles/{vehicleId}", vehicleId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/v1/customers/vehicles")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "plate": "30H-123465",
                                  "type": "CAR",
                                  "brand": "Honda",
                                  "model": "Civic",
                                  "year": 2024,
                                  "color": "Black"
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("DUPLICATE_PLATE"));
    }

    @Test
    void openApiDocumentsVehicleSchemas() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.components.schemas.CreateVehicleRequest.properties.plate.type").value("string"))
                .andExpect(jsonPath("$.components.schemas.CreateVehicleRequest.properties.type.type").value("string"))
                .andExpect(jsonPath("$.components.schemas.UpdateVehicleRequest.properties.brand.type").value("string"))
                .andExpect(jsonPath("$.components.schemas.CreateVehicleResponse.properties.vehicleId.type").value("string"))
                .andExpect(jsonPath("$.components.schemas.VehicleListItemResponse.properties.isPrimary.type").value("boolean"))
                .andExpect(jsonPath("$.components.schemas.SetPrimaryVehicleResponse.properties.updatedAt.type").value("string"));
    }

    private String createVehicle(String accessToken, String plate, String brand, String model) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/customers/vehicles")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content("""
                                {
                                  "plate": "%s",
                                  "type": "CAR",
                                  "brand": "%s",
                                  "model": "%s",
                                  "year": 2023,
                                  "color": "Silver"
                                }
                                """.formatted(plate, brand, model)))
                .andReturn();
        return readJson(result).path("data").path("vehicleId").asText();
    }

    private String registerActivateAndLogin(String emailLocalPart) throws Exception {
        String email = emailLocalPart + "@example.com";

        MvcResult registerResult = mockMvc.perform(post("/api/v1/auth/register")
                        .contentType("application/json")
                        .content("""
                                {
                                  "fullName": "Nguyen Van A",
                                  "email": "%s",
                                  "password": "SecurePass1!",
                                  "passwordConfirm": "SecurePass1!"
                                }
                                """.formatted(email)))
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
