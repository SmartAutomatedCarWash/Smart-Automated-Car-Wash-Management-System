package com.autowash.service.impl;

import com.autowash.shared.exception.ApiException;
import com.autowash.shared.exception.ErrorCode;

import java.util.List;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.UUID;
import org.springframework.stereotype.Service;
import com.autowash.dto.AdminPackageRequest;
import com.autowash.dto.AdminServiceRequest;
import com.autowash.dto.PackageResponse;
import com.autowash.dto.ServiceResponse;
import com.autowash.entity.Package;
import com.autowash.entity.PackageService;
import com.autowash.entity.enums.ActiveStatus;
import com.autowash.repository.BookingRepository;
import com.autowash.repository.PackageRepository;
import com.autowash.repository.PackageServiceRepository;
import com.autowash.repository.ServiceRepository;
import com.autowash.service.AdminCatalogManagementService;
import java.util.LinkedHashSet;
import java.util.Locale;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import com.autowash.shared.dto.PaginationMeta;

@Service
public class AdminCatalogManagementServiceImpl implements AdminCatalogManagementService {

    private final ServiceRepository serviceRepository;
    private final BookingRepository bookingRepository;
    private final PackageRepository packageRepository;
    private final PackageServiceRepository packageServiceRepository;

    public AdminCatalogManagementServiceImpl(
            ServiceRepository serviceRepository,
            BookingRepository bookingRepository,
            PackageRepository packageRepository,
            PackageServiceRepository packageServiceRepository
    ) {
        this.serviceRepository = serviceRepository;
        this.bookingRepository = bookingRepository;
        this.packageRepository = packageRepository;
        this.packageServiceRepository = packageServiceRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServiceResponse> listServices() {
        return serviceRepository.findAll().stream()
                .map(this::toServiceResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ServicePage listServices(String status, String sortBy, String direction, int page, int limit) {
        Page<com.autowash.entity.Service> services = serviceRepository.searchAdmin(
                parseStatus(status),
                PageRequest.of(Math.max(page - 1, 0), limit, catalogSort(sortBy, direction, "price"))
        );
        return new ServicePage(
                services.getContent().stream().map(this::toServiceResponse).toList(),
                pagination(services)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public ServiceResponse getService(String serviceId) {
        return toServiceResponse(requireService(serviceId));
    }

    @Override
    @Transactional
    public ServiceResponse createService(AdminServiceRequest request) {
        com.autowash.entity.Service service = serviceRepository.save(new com.autowash.entity.Service(
                request.name(),
                request.description(),
                request.price(),
                request.durationMinutes(),
                statusOrActive(request.status()),
                join(request.imageUrls())
        ));
        return toServiceResponse(service);
    }

    @Override
    @Transactional
    public ServiceResponse updateService(String serviceId, AdminServiceRequest request) {
        com.autowash.entity.Service service = requireService(serviceId);
        service.update(
                request.name(),
                request.description(),
                request.price(),
                request.durationMinutes(),
                statusOrActive(request.status()),
                join(request.imageUrls())
        );
        return toServiceResponse(service);
    }

    @Override
    @Transactional
    public ServiceResponse deleteService(String serviceId) {
        com.autowash.entity.Service service = requireService(serviceId);
        service.deactivate();
        return toServiceResponse(service);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PackageResponse> listPackages() {
        return packageRepository.findAll().stream()
                .map(this::toPackageResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PackagePage listPackages(String status, String sortBy, String direction, int page, int limit) {
        Page<Package> packages = packageRepository.searchAdmin(
                parseStatus(status),
                PageRequest.of(Math.max(page - 1, 0), limit, catalogSort(sortBy, direction, "basePrice"))
        );
        return new PackagePage(
                packages.getContent().stream().map(this::toPackageResponse).toList(),
                pagination(packages)
        );
    }

    @Override
    @Transactional(readOnly = true)
    public PackageResponse getPackage(String packageId) {
        return toPackageResponse(requirePackage(packageId));
    }

    @Override
    @Transactional
    public PackageResponse createPackage(AdminPackageRequest request) {
        Package pkg = packageRepository.save(new Package(
                request.name(),
                request.description(),
                request.basePrice(),
                request.durationMinutes(),
                request.category(),
                join(request.imageUrls()),
                statusOrActive(request.status())
        ));
        replaceOptions(pkg, request.options());
        return toPackageResponse(pkg);
    }

    @Override
    @Transactional
    public PackageResponse updatePackage(String packageId, AdminPackageRequest request) {
        Package pkg = requirePackage(packageId);
        pkg.update(
                request.name(),
                request.description(),
                request.basePrice(),
                request.durationMinutes(),
                request.category(),
                join(request.imageUrls()),
                statusOrActive(request.status())
        );
        replaceOptions(pkg, request.options());
        return toPackageResponse(pkg);
    }

    @Override
    @Transactional
    public PackageResponse deletePackage(String packageId) {
        Package pkg = requirePackage(packageId);
        pkg.deactivate();
        return toPackageResponse(pkg);
    }

    private void replaceOptions(Package pkg, List<AdminPackageRequest.PackageOptionRequest> options) {
        packageServiceRepository.deleteByPackageId(pkg.getId());
        if (options == null || options.isEmpty()) {
            return;
        }

        LinkedHashSet<UUID> seen = new LinkedHashSet<>();
        List<PackageService> packageServices = options.stream()
                .<PackageService>map(option -> {
                    UUID optionId = parseUuid(option.optionId(), "Service option not found");
                    if (!seen.add(optionId)) {
                        throw validationError("Duplicate service option in package");
                    }
                    com.autowash.entity.Service service = serviceRepository.findByIdAndStatus(optionId, ActiveStatus.ACTIVE)
                            .orElseThrow(() -> validationError("Service option not found or inactive"));
                    return new PackageService(
                            pkg.getId(),
                            service.getId(),
                            service.getName(),
                            service.getDescription(),
                            service.getPrice(),
                            service.getDurationMinutes(),
                            option.quantity() == null ? 1 : option.quantity(),
                            option.sortOrder() == null ? 0 : option.sortOrder()
                    );
                })
                .toList();
        packageServiceRepository.saveAll(packageServices);
    }

    private com.autowash.entity.Service requireService(String serviceId) {
        return serviceRepository.findById(parseUuid(serviceId, "Service not found"))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Service not found", ErrorCode.RESOURCE_NOT_FOUND));
    }

    private Package requirePackage(String packageId) {
        return packageRepository.findById(parseUuid(packageId, "Package not found"))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Package not found", ErrorCode.RESOURCE_NOT_FOUND));
    }

    private UUID parseUuid(String id, String message) {
        try {
            return UUID.fromString(id);
        } catch (RuntimeException exception) {
            throw new ApiException(HttpStatus.NOT_FOUND, message, ErrorCode.RESOURCE_NOT_FOUND);
        }
    }

    private ActiveStatus statusOrActive(ActiveStatus status) {
        return status == null ? ActiveStatus.ACTIVE : status;
    }

    private ActiveStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return ActiveStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw validationError("Invalid status filter");
        }
    }

    private Sort catalogSort(String sortBy, String direction, String priceField) {
        String sortField = "price".equalsIgnoreCase(sortBy) ? priceField : "name";
        Sort.Direction sortDirection = "desc".equalsIgnoreCase(direction) ? Sort.Direction.DESC : Sort.Direction.ASC;
        return Sort.by(sortDirection, sortField).and(Sort.by(Sort.Direction.ASC, "id"));
    }

    private PaginationMeta pagination(Page<?> page) {
        return new PaginationMeta(
                page.getNumber() + 1,
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.hasNext()
        );
    }

    private ApiException validationError(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, message, ErrorCode.VALIDATION_ERROR);
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

    private PackageResponse toPackageResponse(Package pkg) {
        List<PackageService> packageServices = packageServiceRepository.findByPackageIdOrderBySortOrderAsc(pkg.getId());
        List<String> features = packageServices.stream()
                .map(PackageService::getOptionName)
                .toList();
        List<String> serviceIds = packageServices.stream()
                .map(ps -> ps.getOptionId().toString())
                .toList();
        long bookingCount = bookingRepository.countQualifiedBookingsByPackageId(pkg.getId());
        return new PackageResponse(
                pkg.getId().toString(),
                pkg.getName(),
                pkg.getDescription(),
                pkg.getBasePrice(),
                pkg.getDurationMinutes(),
                pkg.getCategory(),
                features,
                serviceIds,
                split(pkg.getImageUrl()),
                pkg.getStatus().name(),
                null,
                0.0,
                0L,
                bookingCount
        );
    }

    private String join(List<String> list) {
        return list == null || list.isEmpty() ? null : String.join(",", list);
    }

    private List<String> split(String str) {
        return str == null || str.isEmpty() ? new ArrayList<>() : Arrays.asList(str.split(","));
    }
}
