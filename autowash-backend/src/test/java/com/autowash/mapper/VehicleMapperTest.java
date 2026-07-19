package com.autowash.mapper;

import static org.assertj.core.api.Assertions.assertThat;

import com.autowash.dto.CreateVehicleResponse;
import com.autowash.dto.VehicleDetailResponse;
import com.autowash.dto.VehicleListItemResponse;
import com.autowash.entity.User;
import com.autowash.entity.Vehicle;
import com.autowash.entity.enums.UserRole;
import com.autowash.entity.enums.UserStatus;
import com.autowash.entity.enums.VehicleType;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class VehicleMapperTest {

    private final VehicleMapper mapper = Mappers.getMapper(VehicleMapper.class);

    @Test
    void mapsVehicleToCreateResponseWithRenamedAndEnumFields() {
        User owner = owner();
        Vehicle vehicle = new Vehicle(owner, "30H-123456", VehicleType.CAR, "Toyota", "Camry", 2023, "Black", true);

        CreateVehicleResponse response = mapper.toCreateResponse(vehicle);

        assertThat(response.vehicleId()).isEqualTo(vehicle.getId().toString());
        assertThat(response.customerId()).isEqualTo(owner.getId().toString());
        assertThat(response.type()).isEqualTo("CAR");
        assertThat(response.status()).isEqualTo("ACTIVE");
        assertThat(response.isPrimary()).isTrue();
        assertThat(response.createdAt()).isEqualTo(vehicle.getCreatedAt());
    }

    @Test
    void mapsVehicleToListAndDetailResponsesWithoutChangingContract() {
        User owner = owner();
        Vehicle vehicle = new Vehicle(owner, "30H-654321", VehicleType.MOTORBIKE, "Honda", "Vision", 2022, null, false);

        VehicleListItemResponse listItem = mapper.toListItemResponse(vehicle);
        VehicleDetailResponse detail = mapper.toDetailResponse(vehicle);

        assertThat(listItem.vehicleId()).isEqualTo(vehicle.getId().toString());
        assertThat(listItem.type()).isEqualTo("MOTORBIKE");
        assertThat(listItem.color()).isNull();
        assertThat(listItem.isPrimary()).isFalse();
        assertThat(detail.customerId()).isEqualTo(owner.getId().toString());
        assertThat(detail.plate()).isEqualTo(vehicle.getPlate());
    }

    private User owner() {
        return User.builder()
                .id(UUID.randomUUID())
                .fullName("Customer One")
                .phone("0900000000")
                .email("customer@example.com")
                .passwordHash("hash")
                .role(UserRole.CUSTOMER)
                .status(UserStatus.ACTIVE)
                .createdAt(Instant.parse("2026-07-01T00:00:00Z"))
                .updatedAt(Instant.parse("2026-07-01T00:00:00Z"))
                .build();
    }
}
