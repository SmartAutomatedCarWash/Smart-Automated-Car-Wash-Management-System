package com.autowash.service.impl;

import com.autowash.shared.exception.ApiException;
import com.autowash.shared.exception.ErrorCode;

import java.util.List;

import java.util.ArrayList;

import java.util.Arrays;

import java.util.UUID;

import java.util.Map;


import com.autowash.dto.ComboServiceItem;
import com.autowash.dto.ComboResponse;
import com.autowash.dto.PackageResponse;
import com.autowash.dto.ServiceResponse;

import com.autowash.entity.enums.ActiveStatus;
import com.autowash.entity.Combo;
import com.autowash.entity.ComboService;
import com.autowash.entity.Package;
import com.autowash.entity.PackageService;
import com.autowash.mapper.CatalogMapper;
import com.autowash.repository.ServiceRepository;
import com.autowash.repository.BookingRepository;
import com.autowash.repository.ComboRepository;
import com.autowash.repository.ComboServiceRepository;
import com.autowash.repository.PackageRepository;
import com.autowash.repository.PackageServiceRepository;
import com.autowash.repository.ReviewRepository;
import com.autowash.service.CatalogService;
import com.autowash.shared.dto.PaginationMeta;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.Set;
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
    private final ReviewRepository reviewRepository;
    private final BookingRepository bookingRepository;
    private final CatalogMapper catalogMapper;

    public CatalogServiceImpl(
            PackageRepository PackageRepository,
            ServiceRepository serviceRepository,
            ComboRepository ComboRepository,
            PackageServiceRepository packageServiceRepository,
            ComboServiceRepository comboServiceRepository,
            ReviewRepository reviewRepository,
            BookingRepository bookingRepository,
            CatalogMapper catalogMapper
    ) {
        this.PackageRepository = PackageRepository;
        this.serviceRepository = serviceRepository;
        this.ComboRepository = ComboRepository;
        this.packageServiceRepository = packageServiceRepository;
        this.comboServiceRepository = comboServiceRepository;
        this.reviewRepository = reviewRepository;
        this.bookingRepository = bookingRepository;
        this.catalogMapper = catalogMapper;
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
    public ServiceResponse getServiceById(String serviceId) {
        try {
            UUID id = UUID.fromString(serviceId);
            return serviceRepository.findByIdAndStatus(id, ActiveStatus.ACTIVE)
                    .map(this::toServiceResponse)
                    .orElseThrow(() -> ApiException.notFound("Service not found"));
        } catch (IllegalArgumentException exception) {
            throw ApiException.notFound("Service not found");
        }
    }

    @Transactional(readOnly = true)
    public List<ComboResponse> getAvailableCombos() {
        return ComboRepository.findByActiveTrueOrderByIdAsc().stream()
                .map(this::toComboResponse)
                .toList();
    }


    @Transactional(readOnly = true)
    public Package requireActivePackage(String packageId) {
        return PackageRepository.findById(UUID.fromString(packageId))
                .filter(pkg -> pkg.getStatus() == ActiveStatus.ACTIVE)
                .orElseThrow(() -> new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Package is not available", ErrorCode.BUSINESS_RULE_VIOLATION));
    }

    @Transactional(readOnly = true)
    public Combo requireActiveCombo(String comboId) {
        return ComboRepository.findByIdAndActiveTrue(comboId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Combo is not available", ErrorCode.BUSINESS_RULE_VIOLATION));
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
        Set<UUID> includedServiceIds = comboServiceRepository.findByComboIdOrderBySortOrderAsc(combo.getId())
                .stream()
                .map(ComboService::getOptionId)
                .collect(Collectors.toSet());

        return parsedOptionIds.stream()
                .map(optionId -> {
                    if (includedServiceIds.contains(optionId)) {
                        throw optionUnavailable();
                    }
                    return serviceRepository.findByIdAndStatus(optionId, ActiveStatus.ACTIVE)
                            .map(service -> new CatalogService.CatalogOption(
                                    service.getId(),
                                    service.getName(),
                                    service.getPrice(),
                                    service.getDurationMinutes()
                            ))
                            .orElseThrow(this::optionUnavailable);
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
        List<PackageService> packageServices = packageServiceRepository.findByPackageIdOrderBySortOrderAsc(pkg.getId());
        List<String> features = packageServices.stream()
                .map(PackageService::getOptionName)
                .toList();
        List<String> serviceIds = packageServices.stream()
                .map(PackageService::getOptionId)
                .map(UUID::toString)
                .toList();

        Double avgRating = reviewRepository.getAverageRatingByPackageId(pkg.getId());
        Long reviewCount = reviewRepository.getReviewCountByPackageId(pkg.getId());

        String popularity = null;
        UUID topPackageId = bookingRepository.findTopPackageId().orElse(null);
        if (pkg.getId().equals(topPackageId)) {
            popularity = "BEST_SELLER";
        }

        return catalogMapper.toPackageResponse(
                pkg,
                features,
                serviceIds,
                split(pkg.getImageUrl()),
                popularity,
                avgRating != null ? avgRating : 0.0,
                reviewCount != null ? reviewCount : 0L
        );
    }

    private ServiceResponse toServiceResponse(com.autowash.entity.Service service) {
        return catalogMapper.toServiceResponse(service, split(service.getImageUrl()));
    }

    private ComboResponse toComboResponse(Combo combo) {
    List<ComboService> rows = comboServiceRepository.findByComboIdOrderBySortOrderAsc(combo.getId());
    List<ComboServiceItem> services = rows.stream()
            .map(catalogMapper::toComboServiceItem)
            .toList();
    return catalogMapper.toComboResponse(
            combo,
            combo.getDurationDays() == null ? 0 : combo.getDurationDays(),
            combo.getMaxUsages() == null ? 0 : combo.getMaxUsages(),
            services,
            split(combo.getImageUrl()),
            combo.getStatus() == ActiveStatus.ACTIVE,
            false,
            0L
    );
}

    private List<String> split(String str) {
        return str == null || str.isEmpty() ? new ArrayList<>() : Arrays.asList(str.split(","));
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
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Service option is not available", ErrorCode.BUSINESS_RULE_VIOLATION);
    }
}


