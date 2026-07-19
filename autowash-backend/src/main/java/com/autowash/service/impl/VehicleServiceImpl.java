package com.autowash.service.impl;

import com.autowash.shared.exception.ApiException;
import com.autowash.shared.exception.ErrorCode;

import com.autowash.entity.User;
import com.autowash.shared.dto.PaginationMeta;
import com.autowash.service.CurrentUserService;
import com.autowash.service.VehicleService;
import com.autowash.dto.CreateVehicleRequest;
import com.autowash.dto.CreateVehicleResponse;
import com.autowash.dto.SetPrimaryVehicleResponse;
import com.autowash.dto.UpdateVehicleRequest;
import com.autowash.dto.UpdateVehicleResponse;
import com.autowash.dto.VehicleDetailResponse;
import com.autowash.dto.VehicleListItemResponse;
import com.autowash.entity.Vehicle;
import com.autowash.entity.enums.VehicleStatus;
import com.autowash.mapper.VehicleMapper;
import com.autowash.repository.VehicleRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VehicleServiceImpl implements VehicleService {

    private final CurrentUserService currentUserService;
    private final VehicleRepository VehicleRepository;
    private final VehicleMapper vehicleMapper;

    public VehicleServiceImpl(
            CurrentUserService currentUserService,
            VehicleRepository VehicleRepository,
            VehicleMapper vehicleMapper
    ) {
        this.currentUserService = currentUserService;
        this.VehicleRepository = VehicleRepository;
        this.vehicleMapper = vehicleMapper;
    }

    @Override
    @Transactional
    public CreateVehicleResponse createVehicle(CreateVehicleRequest request) {
        User user = currentUserService.getCurrentUser();
        String normalizedPlate = normalizePlate(request.plate());

        if (VehicleRepository.existsByPlate(normalizedPlate)) {
            throw new ApiException(HttpStatus.CONFLICT, "Plate already exists in the system", ErrorCode.DUPLICATE_PLATE);
        }

        boolean shouldBePrimary = VehicleRepository.countByOwnerAndStatus(user, VehicleStatus.ACTIVE) == 0;
        Vehicle vehicle = new Vehicle(
                user,
                normalizedPlate,
                request.type(),
                request.brand().trim(),
                request.model().trim(),
                request.year(),
                trimToNull(request.color()),
                shouldBePrimary
        );
        VehicleRepository.save(vehicle);
        return vehicleMapper.toCreateResponse(vehicle);
    }

    @Override
    @Transactional(readOnly = true)
    public VehiclePage listVehicles(int page, int limit) {
        User user = currentUserService.getCurrentUser();
        Pageable pageable = PageRequest.of(Math.max(page - 1, 0), limit);
        Page<Vehicle> vehiclePage = VehicleRepository.findByOwnerAndStatusOrderByCreatedAtAsc(
                user,
                VehicleStatus.ACTIVE,
                pageable
        );

        List<VehicleListItemResponse> items = vehiclePage.getContent().stream()
                .map(vehicleMapper::toListItemResponse)
                .toList();

        PaginationMeta pagination = new PaginationMeta(
                vehiclePage.getNumber() + 1,
                vehiclePage.getSize(),
                vehiclePage.getTotalElements(),
                vehiclePage.getTotalPages(),
                vehiclePage.hasNext()
        );
        return new VehiclePage(items, pagination);
    }

    @Override
    @Transactional(readOnly = true)
    public VehicleDetailResponse getVehicle(UUID vehicleId) {
        return vehicleMapper.toDetailResponse(findActiveOwnedVehicle(vehicleId));
    }

    @Override
    @Transactional
    public UpdateVehicleResponse updateVehicle(UUID vehicleId, UpdateVehicleRequest request) {
        Vehicle vehicle = findActiveOwnedVehicle(vehicleId);
        vehicle.updateDetails(
                request.brand().trim(),
                request.model().trim(),
                request.year(),
                trimToNull(request.color())
        );
        return vehicleMapper.toUpdateResponse(vehicle);
    }

    @Override
    @Transactional
    public SetPrimaryVehicleResponse setPrimaryVehicle(UUID vehicleId) {
        User user = currentUserService.getCurrentUser();
        Vehicle targetVehicle = findActiveOwnedVehicle(vehicleId);

        VehicleRepository.findFirstByOwnerAndStatusAndPrimaryTrue(user, VehicleStatus.ACTIVE)
                .filter(existingPrimary -> !existingPrimary.getId().equals(targetVehicle.getId()))
                .ifPresent(existingPrimary -> existingPrimary.setPrimary(false));

        targetVehicle.setPrimary(true);

        return vehicleMapper.toSetPrimaryResponse(targetVehicle);
    }

    @Override
    @Transactional
    public void deleteVehicle(UUID vehicleId) {
        User user = currentUserService.getCurrentUser();
        Vehicle vehicle = findActiveOwnedVehicle(vehicleId);
        boolean wasPrimary = vehicle.isPrimary();
        vehicle.softDelete();

        if (wasPrimary) {
            VehicleRepository.findFirstByOwnerAndStatusOrderByCreatedAtAsc(user, VehicleStatus.ACTIVE)
                    .ifPresent(nextPrimary -> nextPrimary.setPrimary(true));
        }
    }

    private Vehicle findActiveOwnedVehicle(UUID vehicleId) {
        User user = currentUserService.getCurrentUser();
        return VehicleRepository.findByOwnerAndIdAndStatus(user, vehicleId, VehicleStatus.ACTIVE)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Vehicle not found", ErrorCode.RESOURCE_NOT_FOUND));
    }

    private String normalizePlate(String plate) {
        return plate.trim().toUpperCase();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
