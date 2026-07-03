package com.autowash.service.impl;

import com.autowash.dto.ComboServiceItem;
import com.autowash.dto.ComboResponse;
import com.autowash.dto.PackageResponse;
import com.autowash.dto.ServiceResponse;
import com.autowash.dto.ValidateVoucherResponse;
import com.autowash.entity.enums.DiscountType;
import com.autowash.entity.enums.ActiveStatus;
import com.autowash.entity.Combo;
import com.autowash.entity.ComboService;
import com.autowash.entity.LoyaltyAccount;
import com.autowash.entity.Package;
import com.autowash.entity.PackageService;
import com.autowash.entity.User;
import com.autowash.entity.Voucher;
import com.autowash.entity.VoucherTier;
import com.autowash.repository.BookingRepository;
import com.autowash.repository.ServiceRepository;
import com.autowash.repository.ComboRepository;
import com.autowash.repository.ComboServiceRepository;
import com.autowash.repository.LoyaltyAccountRepository;
import com.autowash.repository.PackageRepository;
import com.autowash.repository.PackageServiceRepository;
import com.autowash.repository.VoucherRepository;
import com.autowash.repository.VoucherTierRepository;
import com.autowash.service.CatalogService;
import com.autowash.service.CurrentUserService;
import com.autowash.service.TierConfigService;
import com.autowash.shared.dto.PaginationMeta;
import com.autowash.shared.exception.ApiException;
import java.time.Instant;
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
    private final VoucherRepository voucherRepository;
    private final VoucherTierRepository voucherTierRepository;
    private final LoyaltyAccountRepository loyaltyAccountRepository;
    private final BookingRepository bookingRepository;
    private final CurrentUserService currentUserService;
    private final TierConfigService tierConfigService;

    public CatalogServiceImpl(
            PackageRepository PackageRepository,
            ServiceRepository serviceRepository,
            ComboRepository ComboRepository,
            PackageServiceRepository packageServiceRepository,
            ComboServiceRepository comboServiceRepository,
            VoucherRepository voucherRepository,
            VoucherTierRepository voucherTierRepository,
            LoyaltyAccountRepository loyaltyAccountRepository,
            BookingRepository bookingRepository,
            CurrentUserService currentUserService,
            TierConfigService tierConfigService
    ) {
        this.PackageRepository = PackageRepository;
        this.serviceRepository = serviceRepository;
        this.ComboRepository = ComboRepository;
        this.packageServiceRepository = packageServiceRepository;
        this.comboServiceRepository = comboServiceRepository;
        this.voucherRepository = voucherRepository;
        this.voucherTierRepository = voucherTierRepository;
        this.loyaltyAccountRepository = loyaltyAccountRepository;
        this.bookingRepository = bookingRepository;
        this.currentUserService = currentUserService;
        this.tierConfigService = tierConfigService;
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
        Voucher voucher = voucherRepository.findByCode(voucherCode)
                .orElseThrow(() -> businessRule("VOUCHER_NOT_FOUND", "Voucher not found", "USE_DIFFERENT_VOUCHER"));
        validateVoucherOrThrow(voucher, amount);
        long discountAmount = calculateDiscountAmount(voucher, amount);
        return new ValidateVoucherResponse(
                voucher.getCode(),
                true,
                voucher.getDiscountType().name(),
                Math.toIntExact(voucher.getDiscountValue()),
                discountAmount,
                Math.max(amount - discountAmount, 0),
                voucher.getEndAt()
        );
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
    public Voucher validateVoucherForBooking(String voucherCode, long amount) {
        Voucher voucher = voucherRepository.findByCode(voucherCode)
                .orElseThrow(() -> businessRule("VOUCHER_NOT_FOUND", "Voucher not found", "USE_DIFFERENT_VOUCHER"));
        validateVoucherOrThrow(voucher, amount);
        return voucher;
    }

    public long calculateDiscountAmount(Voucher voucher, long amount) {
        long discountAmount;
        if (voucher.getDiscountType() == DiscountType.PERCENT) {
            discountAmount = amount * voucher.getDiscountValue() / 100;
        } else {
            discountAmount = Math.min(voucher.getDiscountValue(), amount);
        }
        if (voucher.getMaxDiscountAmount() != null) {
            discountAmount = Math.min(discountAmount, voucher.getMaxDiscountAmount());
        }
        return Math.min(discountAmount, amount);
    }

    private void validateVoucherOrThrow(Voucher voucher, long amount) {
        Instant now = Instant.now();
        if (voucher.getStatus() != ActiveStatus.ACTIVE) {
            throw businessRule("VOUCHER_NOT_FOUND", "Voucher not found", "USE_DIFFERENT_VOUCHER");
        }
        if (voucher.getStartAt().isAfter(now)) {
            throw businessRule("VOUCHER_NOT_STARTED", "This voucher is not active yet", "USE_DIFFERENT_VOUCHER");
        }
        if (voucher.getEndAt().isBefore(now)) {
            throw businessRule("VOUCHER_EXPIRED", "This voucher has expired", "USE_DIFFERENT_VOUCHER");
        }
        if (voucher.isUsageLimitReached()) {
            throw businessRule("USAGE_LIMIT_REACHED", "This voucher has reached its usage limit", "USE_DIFFERENT_VOUCHER");
        }
        if (amount < voucher.getMinOrderAmount()) {
            throw businessRule("AMOUNT_TOO_LOW", "Booking amount is below minimum for this voucher", "INCREASE_ORDER_VALUE");
        }
        User currentUser = currentUserService.getCurrentUser();
        if (voucher.isNewCustomerOnly() && bookingRepository.countByCustomer(currentUser) > 0) {
            throw businessRule("NEW_CUSTOMER_ONLY", "This voucher is for new customers only", "USE_DIFFERENT_VOUCHER");
        }
        if (bookingRepository.existsByCustomerAndVoucherId(currentUser, voucher.getId())) {
            throw businessRule("VOUCHER_ALREADY_USED", "You have already used this voucher", "USE_DIFFERENT_VOUCHER");
        }
        List<VoucherTier> tiers = voucherTierRepository.findByVoucherId(voucher.getId());
        List<String> eligibleTiers = currentCustomerEligibleTiers();
        if (!tiers.isEmpty() && tiers.stream().noneMatch(tier -> eligibleTiers.contains(tier.getTier()))) {
            throw businessRule("TIER_NOT_ELIGIBLE", "This voucher is not available for your loyalty tier", "USE_DIFFERENT_VOUCHER");
        }
    }

    @Transactional(readOnly = true)
public PackageResponse getPackageById(String packageId) {
    return toPackageResponse(requireActivePackage(packageId));
}

@Transactional(readOnly = true)
public ComboResponse getComboById(String comboId) {
    return toComboResponse(requireActiveCombo(comboId));
}

    private List<String> currentCustomerEligibleTiers() {
        return loyaltyAccountRepository.findByCustomerId(currentUserService.getCurrentUser().getId())
                .map(LoyaltyAccount::getTier)
                .map(tierConfigService::eligibleTierCodesFor)
                .orElseGet(() -> tierConfigService.eligibleTierCodesFor(TierConfigService.BRONZE));
    }

    private ApiException businessRule(String code, String message, String action) {
        return new ApiException(
                HttpStatus.UNPROCESSABLE_ENTITY,
                "Voucher validation failed",
                "BUSINESS_RULE_VIOLATION",
                Map.of("code", code, "message", message, "action", action)
        );
    }

    private PackageResponse toPackageResponse(Package Package) {
        List<String> features = packageServiceRepository.findByPackageIdOrderBySortOrderAsc(Package.getId()).stream()
                .map(PackageService::getOptionName)
                .toList();
        return new PackageResponse(
                Package.getId().toString(),
                Package.getName(),
                Package.getDescription(),
                Package.getBasePrice(),
                Package.getDurationMinutes(),
                null,
                features,
                Package.getImageUrl(),
                Package.getStatus().name(),
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
                service.getImageUrl()
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
            combo.getImageUrl(),
            combo.getStatus() == ActiveStatus.ACTIVE,
            false,
            0L
    );
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

