package com.autowash.service.impl;

import com.autowash.dto.AdminVoucherRequest;
import com.autowash.dto.AdminVoucherRedemptionResponse;
import com.autowash.dto.AdminVoucherResponse;
import com.autowash.entity.Service;
import com.autowash.entity.TierConfig;
import com.autowash.entity.VoucherApplicableService;
import com.autowash.entity.VoucherTemplate;
import com.autowash.entity.VoucherTier;
import com.autowash.entity.enums.ActiveStatus;
import com.autowash.repository.ServiceRepository;
import com.autowash.repository.VoucherApplicableServiceRepository;
import com.autowash.repository.VoucherTemplateRepository;
import com.autowash.repository.VoucherTierRepository;
import com.autowash.entity.PointTransaction;
import com.autowash.entity.enums.PointTransactionType;
import com.autowash.repository.PointTransactionRepository;
import com.autowash.service.AdminVoucherService;
import com.autowash.service.TierConfigService;
import com.autowash.shared.dto.PaginationMeta;
import com.autowash.shared.exception.ApiException;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;

@org.springframework.stereotype.Service
public class AdminVoucherServiceImpl implements AdminVoucherService {

    private final VoucherTemplateRepository voucherTemplateRepository;
    private final VoucherTierRepository voucherTierRepository;
    private final VoucherApplicableServiceRepository voucherApplicableServiceRepository;
    private final ServiceRepository serviceRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final TierConfigService tierConfigService;

    public AdminVoucherServiceImpl(
            VoucherTemplateRepository voucherTemplateRepository,
            VoucherTierRepository voucherTierRepository,
            VoucherApplicableServiceRepository voucherApplicableServiceRepository,
            ServiceRepository serviceRepository,
            PointTransactionRepository pointTransactionRepository,
            TierConfigService tierConfigService
    ) {
        this.voucherTemplateRepository = voucherTemplateRepository;
        this.voucherTierRepository = voucherTierRepository;
        this.voucherApplicableServiceRepository = voucherApplicableServiceRepository;
        this.serviceRepository = serviceRepository;
        this.pointTransactionRepository = pointTransactionRepository;
        this.tierConfigService = tierConfigService;
    }

    @Transactional(readOnly = true)
    public List<AdminVoucherResponse> listVouchers() {
        return voucherTemplateRepository.findAll(Sort.by(Sort.Order.asc("status"), Sort.Order.asc("endAt"))).stream()
                .map(this::toVoucherResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminVoucherResponse getVoucher(String code) {
        return toVoucherResponse(requireVoucher(code));
    }

    @Transactional
    public AdminVoucherResponse createVoucher(AdminVoucherRequest request) {
        validateRequest(request);
        String code = normalizeCode(request.code());
        if (voucherTemplateRepository.findByCode(code).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "Voucher code already exists", "DUPLICATE_RESOURCE");
        }
        VoucherTemplate voucher = voucherTemplateRepository.save(new VoucherTemplate(
                code,
                request.name(),
                request.description(),
                request.discountType(),
                request.discountValue(),
                request.minOrderAmount(),
                request.maxDiscountAmount(),
                request.requiredPoints(),
                request.validDaysAfterClaim(),
                request.usageLimit(),
                request.newCustomerOnly(),
                request.startAt(),
                request.endAt(),
                statusOrActive(request.status())
        ));
        replaceVoucherTiers(voucher.getId(), request.targetTiers());
        replaceApplicableServices(voucher, request.applicableServiceIds());
        return toVoucherResponse(voucher);
    }

    @Transactional
    public AdminVoucherResponse updateVoucher(String code, AdminVoucherRequest request) {
        validateRequest(request);
        VoucherTemplate voucher = requireVoucher(code);
        String requestedCode = normalizeCode(request.code());
        if (!voucher.getCode().equals(requestedCode)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Voucher code cannot be changed", "VALIDATION_ERROR");
        }
        voucher.update(
                request.name(),
                request.description(),
                request.discountType(),
                request.discountValue(),
                request.minOrderAmount(),
                request.maxDiscountAmount(),
                request.requiredPoints(),
                request.validDaysAfterClaim(),
                request.usageLimit(),
                request.newCustomerOnly(),
                request.startAt(),
                request.endAt(),
                statusOrActive(request.status())
        );
        replaceVoucherTiers(voucher.getId(), request.targetTiers());
        replaceApplicableServices(voucher, request.applicableServiceIds());
        return toVoucherResponse(voucher);
    }

    @Transactional
    public AdminVoucherResponse deleteVoucher(String code) {
        VoucherTemplate voucher = requireVoucher(code);
        voucher.deactivate();
        return toVoucherResponse(voucher);
    }

    @Transactional(readOnly = true)
    public AdminVoucherService.RedemptionPage listRedemptions(String searchQuery, Instant dateFrom, Instant dateTo, int page, int limit) {
        String normalizedSearch = normalizeSearch(searchQuery);
        Page<PointTransaction> transactions = pointTransactionRepository.searchAdminByType(
                PointTransactionType.REDEEM,
                normalizedSearch,
                dateFrom,
                dateTo,
                PageRequest.of(Math.max(page - 1, 0), limit, Sort.by("createdAt").descending())
        );
        List<AdminVoucherRedemptionResponse> items = transactions.getContent().stream()
                .map(this::toRedemptionResponse)
                .toList();
        return new AdminVoucherService.RedemptionPage(
                items,
                new PaginationMeta(
                        transactions.getNumber() + 1,
                        transactions.getSize(),
                        transactions.getTotalElements(),
                        transactions.getTotalPages(),
                        transactions.hasNext()
                )
        );
    }

    private String normalizeSearch(String searchQuery) {
        if (searchQuery == null || searchQuery.isBlank()) {
            return null;
        }
        return "%" + searchQuery.trim().toLowerCase() + "%";
    }

    private AdminVoucherResponse toVoucherResponse(VoucherTemplate voucher) {
        return new AdminVoucherResponse(
                voucher.getCode(),
                voucher.getName(),
                voucher.getDescription(),
                voucher.getDiscountType().name(),
                voucher.getDiscountValue(),
                voucher.getMinOrderAmount(),
                voucher.getMaxDiscountAmount(),
                voucher.getRequiredPoints(),
                voucher.getValidDaysAfterClaim(),
                voucher.getEndAt(), // Keep expiresAt populated with endAt for backwards compatibility if needed
                voucher.getStatus() == ActiveStatus.ACTIVE,
                voucher.isNewCustomerOnly(),
                voucherTierRepository.findByVoucherId(voucher.getId()).stream()
                        .map(VoucherTier::getTier)
                        .toList(),
                voucherApplicableServiceRepository.findAllByVoucherTemplateId(voucher.getId()).stream()
                        .map(vas -> vas.getService().getId())
                        .toList(),
                voucher.getStartAt(),
                voucher.getEndAt(),
                voucher.getStatus().name(),
                voucher.getUsageLimit()
        );
    }

    private VoucherTemplate requireVoucher(String code) {
        return voucherTemplateRepository.findByCode(normalizeCode(code))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Voucher not found", "RESOURCE_NOT_FOUND"));
    }

    private void replaceVoucherTiers(UUID voucherId, List<String> tiers) {
        voucherTierRepository.deleteByVoucherId(voucherId);
        if (tiers == null || tiers.isEmpty()) {
            return;
        }
        voucherTierRepository.saveAll(tiers.stream()
                .map(TierConfig::normalizeTier)
                .distinct()
                .peek(tierConfigService::getConfig)
                .map(tier -> new VoucherTier(voucherId, tier))
                .toList());
    }
    
    private void replaceApplicableServices(VoucherTemplate voucher, List<UUID> serviceIds) {
        voucherApplicableServiceRepository.deleteAllByVoucherTemplateId(voucher.getId());
        if (serviceIds == null || serviceIds.isEmpty()) {
            return;
        }
        for (UUID serviceId : serviceIds.stream().distinct().toList()) {
            Service service = serviceRepository.findByIdAndStatus(serviceId, ActiveStatus.ACTIVE)
                    .orElseThrow(() -> new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Service is not active", "BUSINESS_RULE_VIOLATION"));
            voucherApplicableServiceRepository.save(new VoucherApplicableService(voucher, service));
        }
    }

    private void validateRequest(AdminVoucherRequest request) {
        if (request.startAt().isAfter(request.endAt())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "startAt must be before or equal to endAt", "VALIDATION_ERROR");
        }
        if (request.discountType().name().equals("PERCENT") && request.discountValue() > 100) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Percent discount must be between 1 and 100", "VALIDATION_ERROR");
        }
    }

    private String normalizeCode(String code) {
        if (code == null || code.isBlank()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Voucher not found", "RESOURCE_NOT_FOUND");
        }
        return code.trim().toUpperCase(Locale.ROOT);
    }

    private ActiveStatus statusOrActive(ActiveStatus status) {
        return status == null ? ActiveStatus.ACTIVE : status;
    }

    private AdminVoucherRedemptionResponse toRedemptionResponse(PointTransaction transaction) {
        com.autowash.entity.User customer = transaction.getLoyaltyAccount().getCustomer();
        String voucherCode = extractVoucherCode(transaction.getReason());
        return new AdminVoucherRedemptionResponse(
                transaction.getId().toString(),
                customer.getId(),
                customer.getFullName(),
                customer.getPhone(),
                voucherCode,
                Math.abs(transaction.getPoints()),
                transaction.getBalanceAfter(),
                transaction.getCreatedAt()
        );
    }

    private String extractVoucherCode(String reason) {
        if (reason != null && reason.startsWith("Voucher redemption: ")) {
            return reason.substring("Voucher redemption: ".length());
        }
        return reason;
    }
}
