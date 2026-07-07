package com.autowash.service.impl;

import com.autowash.dto.ComboServiceItem;
import com.autowash.dto.ComboResponse;
import com.autowash.dto.PackageResponse;
import com.autowash.dto.ServiceResponse;
import com.autowash.dto.ValidateVoucherResponse;
import com.autowash.entity.enums.ActiveStatus;
import com.autowash.entity.Combo;
import com.autowash.entity.ComboService;
import com.autowash.entity.Package;
import com.autowash.entity.PackageService;
import com.autowash.repository.ServiceRepository;
import com.autowash.repository.ComboRepository;
import com.autowash.repository.ComboServiceRepository;
import com.autowash.repository.PackageRepository;
import com.autowash.repository.PackageServiceRepository;
import com.autowash.service.CatalogService;
import com.autowash.shared.dto.PaginationMeta;
import com.autowash.shared.exception.ApiException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CatalogServiceImpl implements CatalogService {

    private final PackageRepository PackageRepository;
    private final ServiceRepository serviceRepository;
    private final ComboRepository ComboRepository;
    private final PackageServiceRepository packageServiceRepository;
    private final ComboServiceRepository comboServiceRepository;

    public CatalogServiceImpl(
            PackageRepository PackageRepository,
            ServiceRepository serviceRepository,
            ComboRepository ComboRepository,
            PackageServiceRepository packageServiceRepository,
            ComboServiceRepository comboServiceRepository
    ) {
        this.PackageRepository = PackageRepository;
        this.serviceRepository = serviceRepository;
        this.ComboRepository = ComboRepository;
        this.packageServiceRepository = packageServiceRepository;
        this.comboServiceRepository = comboServiceRepository;
    }

    @Transactional(readOnly = true)
    public CatalogService.PackagePage getPackages(int page, int limit) {
        Page<Package> packages = PackageRepository.findByStatusOrderByIdAsc(
                ActiveStatus.ACTIVE,
                PageRequest.of(Math.max(page - 1, 0), limit)
        );
        List<PackageResponse> items = packages.getContent().stream().map(this::toPackageResponse).toList();
        PaginationMeta pagination = new PaginationMeta(
                packages.getNumber() + 1,
                packages.getSize(),
                packages.getTotalElements(),
                packages.getTotalPages(),
                packages.hasNext()
        );
        return new CatalogService.PackagePage(items, pagination);
    }

    @Transactional(readOnly = true)
    public List<ServiceResponse> getServices() {
        return serviceRepository.findByStatusOrderByIdAsc(ActiveStatus.ACTIVE).stream()
                .map(this::toServiceResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ComboResponse> getAvailableCombos() {
        return ComboRepository.findByActiveTrueOrderByIdAsc().stream()
                .map(this::toComboResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ValidateVoucherResponse validateVoucher(String voucherCode, long amount) {
        throw new UnsupportedOperationException("Not supported in new voucher system");
    }

    @Transactional(readOnly = true)
    public Package requireActivePackage(String packageId) {
        return PackageRepository.findById(java.util.UUID.fromString(packageId))
                .filter(pkg -> pkg.getStatus() == ActiveStatus.ACTIVE)
                .orElseThrow(() -> new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Package is not available", "BUSINESS_RULE_VIOLATION"));
    }

    @Transactional(readOnly = true)
    public Combo requireActiveCombo(String comboId) {
        return ComboRepository.findByIdAndActiveTrue(comboId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Combo is not available", "BUSINESS_RULE_VIOLATION"));
    }

    @Transactional(readOnly = true)
    public List<CatalogService.CatalogOption> requireActivePackageOptions(Package pkg, List<String> optionIds) {
        List<UUID> parsedOptionIds = parseUniqueOptionIds(optionIds);
        if (parsedOptionIds.isEmpty()) {
            return List.of();
        }

        assertActiveServices(parsedOptionIds);
        Map<UUID, PackageService> optionsById = packageServiceRepository
                .findByPackageIdAndOptionIdIn(pkg.getId(), parsedOptionIds)
                .stream()
                .collect(Collectors.toMap(PackageService::getOptionId, Function.identity()));

        return parsedOptionIds.stream()
                .map(optionId -> {
                    PackageService option = optionsById.get(optionId);
                    if (option == null) {
                        throw optionUnavailable();
                    }
                    return new CatalogService.CatalogOption(
                            option.getOptionId(),
                            option.getOptionName(),
                            option.getOptionPrice(),
                            option.getOptionDurationMinutes()
                    );
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CatalogService.CatalogOption> requireActiveComboOptions(Combo combo, List<String> optionIds) {
        List<UUID> parsedOptionIds = parseUniqueOptionIds(optionIds);
        if (parsedOptionIds.isEmpty()) {
            return List.of();
        }

        assertActiveServices(parsedOptionIds);
        Map<UUID, ComboService> optionsById = comboServiceRepository
                .findByComboIdAndOptionIdIn(combo.getId(), parsedOptionIds)
                .stream()
                .collect(Collectors.toMap(ComboService::getOptionId, Function.identity()));

        return parsedOptionIds.stream()
                .map(optionId -> {
                    ComboService option = optionsById.get(optionId);
                    if (option == null) {
                        throw optionUnavailable();
                    }
                    return new CatalogService.CatalogOption(
                            option.getOptionId(),
                            option.getOptionName(),
                            option.getOptionPrice(),
                            option.getOptionDurationMinutes()
                    );
                })
                .toList();
    }



    @Transactional(readOnly = true)
public PackageResponse getPackageById(String packageId) {
    return toPackageResponse(requireActivePackage(packageId));
}

@Transactional(readOnly = true)
public ComboResponse getComboById(String comboId) {
    return toComboResponse(requireActiveCombo(comboId));
}

    private PackageResponse toPackageResponse(Package pkg) {
        List<String> features = packageServiceRepository.findByPackageIdOrderBySortOrderAsc(pkg.getId()).stream()
                .map(PackageService::getOptionName)
                .toList();
        return new PackageResponse(
                pkg.getId().toString(),
                pkg.getName(),
                pkg.getDescription(),
                pkg.getBasePrice(),
                pkg.getDurationMinutes(),
                pkg.getCategory(),
                features,
                null,
                split(pkg.getImageUrl()),
                pkg.getStatus().name(),
                null
        );
    }

    private ServiceResponse toServiceResponse(com.autowash.entity.Service service) {
        return new ServiceResponse(
                service.getId().toString(),
                service.getName(),
                service.getDescription(),
                service.getPrice(),
                service.getDurationMinutes(),
                service.getStatus().name(),
                split(service.getImageUrl())
        );
    }

    private ComboResponse toComboResponse(Combo combo) {
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
            rows.stream().mapToInt(ComboService::getQuantity).sum(),
            services,
            split(combo.getImageUrl()),
            combo.getStatus() == ActiveStatus.ACTIVE,
            false,
            0L
    );
}

    private List<String> split(String str) {
        return str == null || str.isEmpty() ? new ArrayList<>() : java.util.Arrays.asList(str.split(","));
    }

    private List<UUID> parseUniqueOptionIds(List<String> optionIds) {
        if (optionIds == null || optionIds.isEmpty()) {
            return List.of();
        }
        Set<UUID> uniqueIds = new LinkedHashSet<>();
        for (String optionId : optionIds) {
            UUID parsedId = parseOptionId(optionId);
            if (!uniqueIds.add(parsedId)) {
                throw optionUnavailable();
            }
        }
        return new ArrayList<>(uniqueIds);
    }

    private UUID parseOptionId(String optionId) {
        try {
            if (optionId == null || optionId.isBlank()) {
                throw optionUnavailable();
            }
            return UUID.fromString(optionId);
        } catch (IllegalArgumentException exception) {
            throw optionUnavailable();
        }
    }

    private void assertActiveServices(Collection<UUID> optionIds) {
        for (UUID optionId : optionIds) {
            if (optionId == null || serviceRepository.findByIdAndStatus(optionId, ActiveStatus.ACTIVE).isEmpty()) {
                throw optionUnavailable();
            }
        }
    }

    private ApiException optionUnavailable() {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Service option is not available", "BUSINESS_RULE_VIOLATION");
    }
}


