package com.autowash.mapper;

import com.autowash.dto.CreateVehicleResponse;
import com.autowash.dto.SetPrimaryVehicleResponse;
import com.autowash.dto.UpdateVehicleResponse;
import com.autowash.dto.VehicleDetailResponse;
import com.autowash.dto.VehicleListItemResponse;
import com.autowash.entity.Vehicle;
import com.autowash.entity.enums.VehicleStatus;
import com.autowash.entity.enums.VehicleType;
import java.util.UUID;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(config = CentralMapperConfig.class)
public interface VehicleMapper {

    @Mapping(target = "vehicleId", source = "id")
    @Mapping(target = "customerId", source = "owner.id")
    @Mapping(target = "isPrimary", source = "primary")
    CreateVehicleResponse toCreateResponse(Vehicle vehicle);

    @Mapping(target = "vehicleId", source = "id")
    @Mapping(target = "isPrimary", source = "primary")
    VehicleListItemResponse toListItemResponse(Vehicle vehicle);

    @Mapping(target = "vehicleId", source = "id")
    @Mapping(target = "customerId", source = "owner.id")
    @Mapping(target = "isPrimary", source = "primary")
    VehicleDetailResponse toDetailResponse(Vehicle vehicle);

    @Mapping(target = "vehicleId", source = "id")
    UpdateVehicleResponse toUpdateResponse(Vehicle vehicle);

    @Mapping(target = "vehicleId", source = "id")
    @Mapping(target = "isPrimary", source = "primary")
    SetPrimaryVehicleResponse toSetPrimaryResponse(Vehicle vehicle);

    default String map(UUID value) {
        return value == null ? null : value.toString();
    }

    default String map(VehicleType value) {
        return value == null ? null : value.name();
    }

    default String map(VehicleStatus value) {
        return value == null ? null : value.name();
    }
}
