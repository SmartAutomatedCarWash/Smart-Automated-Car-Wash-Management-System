package com.autowash.service.impl;

import com.autowash.service.LoyaltyService;

import com.autowash.entity.TierConfig;

import com.autowash.shared.exception.ApiException;
import com.autowash.shared.exception.ErrorCode;


import org.springframework.context.annotation.Lazy;

import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.stereotype.Service;

import com.autowash.dto.DiscountRequest;
import com.autowash.dto.DiscountResponse;
import com.autowash.dto.UserDiscountResponse;
import com.autowash.entity.Discount;
import com.autowash.entity.DiscountApplicableService;
import com.autowash.entity.DiscountTier;
import com.autowash.entity.User;
import com.autowash.entity.UserDiscount;
import com.autowash.entity.enums.ActiveStatus;
import com.autowash.entity.enums.DiscountAcquisitionMethod;
import com.autowash.entity.enums.DiscountKind;
import com.autowash.entity.enums.DiscountTargetingMode;
import com.autowash.entity.enums.UserDiscountStatus;
import com.autowash.mapper.DiscountMapper;
import org.springframework.http.HttpStatus;
import com.autowash.repository.DiscountApplicableServiceRepository;
import com.autowash.repository.DiscountRepository;
import com.autowash.repository.DiscountTierRepository;
import com.autowash.repository.ServiceRepository;
import com.autowash.repository.TierConfigRepository;
import com.autowash.repository.UserDiscountRepository;
import com.autowash.repository.UserRepository;
import com.autowash.service.DiscountService;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DiscountServiceImpl implements DiscountService {

    private final DiscountRepository discountRepository;
    private final DiscountTierRepository discountTierRepository;
    private final DiscountApplicableServiceRepository discountApplicableServiceRepository;
    private final TierConfigRepository tierConfigRepository;
    private final ServiceRepository serviceRepository;
    private final UserRepository userRepository;
    private final UserDiscountRepository userDiscountRepository;
    private final DiscountMapper discountMapper;

    @Autowired
    @Lazy
    private LoyaltyService loyaltyService;

    @Override
    @Transactional
    public DiscountResponse createDiscount(DiscountRequest request) {
        if (request.code() != null && !request.code().isBlank()) {
            discountRepository.findByCodeIgnoreCase(request.code())
                    .ifPresent(d -> { throw new ApiException(HttpStatus.BAD_REQUEST, "Discount code already exists", ErrorCode.INVALID_INPUT); });
        }

        Discount discount = Discount.builder()
                .type(request.type())
                .code(request.code())
                .name(request.name())
                .description(request.description())
                .discountType(request.discountType())
                .discountValue(request.discountValue())
                .minOrderAmount(request.minOrderAmount())
                .maxDiscountAmount(request.maxDiscountAmount())
                .requiredPoints(request.requiredPoints())
                .validDaysAfterClaim(request.validDaysAfterClaim())
                .targetingMode(request.targetingMode())
                .newCustomerOnly(request.newCustomerOnly())
                .usageLimit(request.usageLimit())
                .startAt(request.startAt())
                .endAt(request.endAt())
                .status(request.status())
                .build();

        discount = discountRepository.save(discount);
        saveRelations(discount, request);
        return mapToResponse(discount);
    }

    @Override
    public DiscountResponse getDiscount(UUID id) {
        Discount discount = discountRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Discount not found", ErrorCode.NOT_FOUND));
        return mapToResponse(discount);
    }

    @Override
    public Page<DiscountResponse> getDiscounts(DiscountKind type, Pageable pageable) {
        if (type == null) {
            return discountRepository.findAll(pageable).map(this::mapToResponse);
        }
        return discountRepository.findByType(type, pageable).map(this::mapToResponse);
    }

    @Override
    @Transactional
    public DiscountResponse updateDiscount(UUID id, DiscountRequest request) {
        Discount discount = discountRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Discount not found", ErrorCode.NOT_FOUND));

        if (request.code() != null && !request.code().isBlank() && !request.code().equalsIgnoreCase(discount.getCode())) {
            discountRepository.findByCodeIgnoreCase(request.code())
                    .ifPresent(d -> { throw new ApiException(HttpStatus.BAD_REQUEST, "Discount code already exists", ErrorCode.INVALID_INPUT); });
        }

        discount.setType(request.type());
        discount.setCode(request.code());
        discount.setName(request.name());
        discount.setDescription(request.description());
        discount.setDiscountType(request.discountType());
        discount.setDiscountValue(request.discountValue());
        discount.setMinOrderAmount(request.minOrderAmount());
        discount.setMaxDiscountAmount(request.maxDiscountAmount());
        discount.setRequiredPoints(request.requiredPoints());
        discount.setValidDaysAfterClaim(request.validDaysAfterClaim());
        discount.setTargetingMode(request.targetingMode());
        discount.setNewCustomerOnly(request.newCustomerOnly());
        discount.setUsageLimit(request.usageLimit());
        discount.setStartAt(request.startAt());
        discount.setEndAt(request.endAt());
        discount.setStatus(request.status());
        discount.setUpdatedAt(Instant.now());

        discountTierRepository.deleteByDiscountId(discount.getId());
        discountApplicableServiceRepository.deleteByDiscountId(discount.getId());
        saveRelations(discount, request);
        return mapToResponse(discount);
    }

    @Override
    @Transactional
    public void deleteDiscount(UUID id) {
        discountTierRepository.deleteByDiscountId(id);
        discountApplicableServiceRepository.deleteByDiscountId(id);
        discountRepository.deleteById(id);
    }

    @Override
    public Page<DiscountResponse> getActiveDiscounts(Pageable pageable) {
        return discountRepository.findActiveDiscounts(ActiveStatus.ACTIVE, Instant.now(), pageable)
                .map(this::mapToResponse);
    }

    @Override
    @Transactional
    public UserDiscountResponse claimDiscount(UUID userId, UUID discountId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found", ErrorCode.NOT_FOUND));
        Discount discount = discountRepository.findByIdWithLock(discountId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Discount not found", ErrorCode.NOT_FOUND));

        if (discount.getStatus() != ActiveStatus.ACTIVE || discount.getStartAt().isAfter(Instant.now()) || discount.getEndAt().isBefore(Instant.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Discount is not active", ErrorCode.INVALID_INPUT);
        }

        if (discount.getUsageLimit() != null && discount.getUsedCount() >= discount.getUsageLimit()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Discount usage limit reached", ErrorCode.INVALID_INPUT);
        }

        if (discount.getTargetingMode() == DiscountTargetingMode.SPECIFIC_TIERS) {
            List<DiscountTier> tiers = discountTierRepository.findByDiscountId(discount.getId());
            String userTier = loyaltyService.getAccount(user.getId()).tier();
            boolean match = tiers.stream().anyMatch(t -> t.getTier().getTier().equals(userTier));
            if (!match) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Discount is not applicable to your tier", ErrorCode.INVALID_INPUT);
            }
        }

        Instant expiresAt = null;
        if (discount.getValidDaysAfterClaim() != null) {
            expiresAt = Instant.now().plus(discount.getValidDaysAfterClaim(), ChronoUnit.DAYS);
        }

        UserDiscount userDiscount = UserDiscount.builder()
                .user(user)
                .discount(discount)
                .acquisitionMethod(DiscountAcquisitionMethod.ADMIN_GRANTED)
                .pointsSpent(0)
                .claimedAt(Instant.now())
                .expiresAt(expiresAt)
                .status(UserDiscountStatus.AVAILABLE)
                .build();

        discount.setUsedCount(discount.getUsedCount() + 1);
        discountRepository.save(discount);
        
        userDiscount = userDiscountRepository.save(userDiscount);
        return mapUserDiscount(userDiscount);
    }

    @Override
    public Page<UserDiscountResponse> getUserDiscounts(UUID userId, Pageable pageable) {
        return userDiscountRepository.findByUserId(userId, pageable).map(this::mapUserDiscount);
    }

    private void saveRelations(Discount discount, DiscountRequest request) {
        if (request.targetingMode() == DiscountTargetingMode.SPECIFIC_TIERS && request.applicableTierIds() != null) {
            for (String tierId : request.applicableTierIds()) {
                TierConfig tier = tierConfigRepository.findById(TierConfig.normalizeTier(tierId))
                        .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Tier not found: " + tierId, ErrorCode.NOT_FOUND));
                DiscountTier dt = DiscountTier.builder().discount(discount).tier(tier).build();
                discountTierRepository.save(dt);
            }
        }
        if (request.applicableServiceIds() != null) {
            for (UUID serviceId : request.applicableServiceIds()) {
                com.autowash.entity.Service service = serviceRepository.findById(serviceId)
                        .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Service not found: " + serviceId, ErrorCode.NOT_FOUND));
                DiscountApplicableService das = DiscountApplicableService.builder().discount(discount).service(service).build();
                discountApplicableServiceRepository.save(das);
            }
        }
    }

    private DiscountResponse mapToResponse(Discount d) {
        List<String> tiers = discountTierRepository.findByDiscountId(d.getId()).stream()
                .map(dt -> dt.getTier().getTier()).toList();
        List<UUID> services = discountApplicableServiceRepository.findByDiscountId(d.getId()).stream()
                .map(das -> das.getService().getId()).toList();
        return discountMapper.toResponse(d, tiers, services);
    }
    
    private UserDiscountResponse mapUserDiscount(UserDiscount ud) {
        return discountMapper.toUserDiscountResponse(ud, mapToResponse(ud.getDiscount()));
    }
}
