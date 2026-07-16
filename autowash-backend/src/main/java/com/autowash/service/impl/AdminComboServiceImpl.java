package com.autowash.service.impl;

import com.autowash.dto.ComboServiceItem;
import com.autowash.dto.AdminComboRequest;
import com.autowash.dto.ComboResponse;
import com.autowash.entity.Combo;
import com.autowash.entity.ComboService;
import com.autowash.entity.Service;
import com.autowash.entity.enums.ActiveStatus;
import com.autowash.repository.ComboRepository;
import com.autowash.repository.ComboServiceRepository;
import com.autowash.repository.ServiceRepository;
import com.autowash.service.AdminComboService;
import com.autowash.shared.exception.ApiException;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;

@org.springframework.stereotype.Service
public class AdminComboServiceImpl implements AdminComboService {

    private final ComboRepository comboRepository;
    private final ComboServiceRepository comboServiceRepository;
    private final ServiceRepository serviceRepository;

    public AdminComboServiceImpl(
            ComboRepository comboRepository,
            ComboServiceRepository comboServiceRepository,
            ServiceRepository serviceRepository
    ) {
        this.comboRepository = comboRepository;
        this.comboServiceRepository = comboServiceRepository;
        this.serviceRepository = serviceRepository;
    }

    @Transactional(readOnly = true)
    public List<ComboResponse> listCombos() {
        return comboRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ComboResponse getCombo(String comboId) {
        return toResponse(requireCombo(comboId));
    }

    @Transactional
    public ComboResponse createCombo(AdminComboRequest request) {
        Combo combo = comboRepository.save(new Combo(
                request.name(),
                request.description(),
                request.price(),
                request.originalPrice(),
                request.durationMinutes(),
                request.durationDays(),
                request.maxUsages(),
                join(request.imageUrls()),
                statusOrActive(request.status())
        ));
        replaceOptions(combo, request.options());
        return toResponse(combo);
    }

    @Transactional
    public ComboResponse updateCombo(String comboId, AdminComboRequest request) {
        Combo combo = requireCombo(comboId);
        combo.update(
                request.name(),
                request.description(),
                request.price(),
                request.originalPrice(),
                request.durationMinutes(),
                request.durationDays(),
                request.maxUsages(),
                join(request.imageUrls()),
                statusOrActive(request.status())
        );
        replaceOptions(combo, request.options());
        return toResponse(combo);
    }

    @Transactional
    public ComboResponse deleteCombo(String comboId) {
        Combo combo = requireCombo(comboId);
        combo.deactivate();
        return toResponse(combo);
    }

    private void replaceOptions(Combo combo, List<AdminComboRequest.ComboOptionRequest> options) {
        comboServiceRepository.deleteByComboId(combo.getId());
        if (options == null || options.isEmpty()) {
            return;
        }

        LinkedHashSet<UUID> seen = new LinkedHashSet<>();
        List<ComboService> comboServices = options.stream()
                .map(option -> {
                    UUID optionId = parseUuid(option.optionId(), "Service option not found");
                    if (!seen.add(optionId)) {
                        throw validationError("Duplicate service option in combo");
                    }
                    Service service = serviceRepository.findByIdAndStatus(optionId, ActiveStatus.ACTIVE)
                            .orElseThrow(() -> validationError("Service option not found or inactive"));
                    return new ComboService(
                            combo.getId(),
                            service.getId(),
                            service.getName(),
                            service.getDescription(),
                            service.getPrice(),
                            service.getDurationMinutes(),
                            option.quantity(),
                            option.sortOrder()
                    );
                })
                .toList();
        comboServiceRepository.saveAll(comboServices);
    }

    private Combo requireCombo(String comboId) {
        return comboRepository.findById(parseUuid(comboId, "Combo not found"))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Combo not found", "RESOURCE_NOT_FOUND"));
    }

    private UUID parseUuid(String id, String message) {
        try {
            return UUID.fromString(id);
        } catch (RuntimeException exception) {
            throw new ApiException(HttpStatus.NOT_FOUND, message, "RESOURCE_NOT_FOUND");
        }
    }

    private ComboResponse toResponse(Combo combo) {
    List<ComboService> rows = comboServiceRepository.findByComboIdOrderBySortOrderAsc(combo.getId());
    List<ComboServiceItem> services = rows.stream()
            .map(s -> new ComboServiceItem(
                    s.getOptionId().toString(),
                    s.getOptionName(),
                    s.getOptionDescription(),
                    s.getOptionPrice(),
                    s.getOptionDurationMinutes(),
                    s.getQuantity(),
                    s.getSortOrder()
            ))
            .toList();
    return new ComboResponse(
            combo.getId().toString(),
            combo.getName(),
            combo.getDescription(),
            combo.getPrice(),
            combo.getOriginalPrice(),
            combo.getDurationDays() == null ? 0 : combo.getDurationDays(),
            combo.getMaxUsages() == null ? 0 : combo.getMaxUsages(),
            services,
            split(combo.getImageUrl()),
            combo.getStatus() == ActiveStatus.ACTIVE,
            false,
            0L
    );
}

    private String join(List<String> list) {
        return list == null || list.isEmpty() ? null : String.join(",", list);
    }

    private List<String> split(String str) {
        return str == null || str.isEmpty() ? new java.util.ArrayList<>() : java.util.Arrays.asList(str.split(","));
    }

    private ActiveStatus statusOrActive(ActiveStatus status) {
        return status == null ? ActiveStatus.ACTIVE : status;
    }

    private ApiException validationError(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, message, "VALIDATION_ERROR");
    }
}
