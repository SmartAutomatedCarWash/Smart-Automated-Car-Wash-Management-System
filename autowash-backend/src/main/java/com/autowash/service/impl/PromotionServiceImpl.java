package com.autowash.service.impl;

import com.autowash.dto.CustomerPromotionResponse;
import com.autowash.dto.PromotionRequest;
import com.autowash.dto.PromotionResponse;
import com.autowash.entity.LoyaltyAccount;
import com.autowash.entity.Promotion;
import com.autowash.entity.PromotionTier;
import com.autowash.entity.TierConfig;
import com.autowash.entity.User;
import com.autowash.entity.enums.ActiveStatus;
import com.autowash.entity.enums.PromotionTargetingMode;
import com.autowash.repository.LoyaltyAccountRepository;
import com.autowash.repository.PromotionRepository;
import com.autowash.repository.PromotionTierRepository;
import com.autowash.service.CurrentUserService;
import com.autowash.service.PromotionService;
import com.autowash.service.TierConfigService;
import com.autowash.shared.dto.PaginationMeta;
import com.autowash.shared.exception.ApiException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PromotionServiceImpl implements PromotionService {

    private final PromotionRepository promotionRepository;
    private final PromotionTierRepository promotionTierRepository;
    private final LoyaltyAccountRepository loyaltyAccountRepository;
    private final CurrentUserService currentUserService;
    private final TierConfigService tierConfigService;

    public PromotionServiceImpl(
            PromotionRepository promotionRepository,
            PromotionTierRepository promotionTierRepository,
            LoyaltyAccountRepository loyaltyAccountRepository,
            CurrentUserService currentUserService,
            TierConfigService tierConfigService
    ) {
        this.promotionRepository = promotionRepository;
        this.promotionTierRepository = promotionTierRepository;
        this.loyaltyAccountRepository = loyaltyAccountRepository;
        this.currentUserService = currentUserService;
        this.tierConfigService = tierConfigService;
    }

    @Transactional
    public PromotionResponse create(PromotionRequest request) {
        ValidatedPromotion validated = validate(request);
        Promotion promotion = new Promotion(
                request.name(),
                request.description(),
                BigDecimal.valueOf(request.pointMultiplier()),
                request.discountType(),
                request.discountValue(),
                request.startDate(),
                request.endDate(),
                request.targetingMode(),
                statusOrActive(request.status())
        );
        Promotion saved = promotionRepository.saveAndFlush(promotion);
        replacePromotionTiers(saved.getId(), validated.tiers());
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public PromotionResponse getById(String promotionId) {
        return toResponse(requirePromotion(promotionId));
    }

    @Transactional(readOnly = true)
    public PromotionService.PromotionPage listAdmin(int page, int limit) {
        Page<Promotion> promotions = promotionRepository.findAllByOrderByCreatedAtDesc(pageRequest(page, limit));
        return toPage(promotions);
    }

    @Transactional
    public PromotionResponse update(String promotionId, PromotionRequest request) {
        Promotion promotion = requirePromotion(promotionId);
        ValidatedPromotion validated = validate(request);
        promotion.update(
                request.name(),
                request.description(),
                BigDecimal.valueOf(request.pointMultiplier()),
                request.discountType(),
                request.discountValue(),
                request.startDate(),
                request.endDate(),
                request.targetingMode(),
                statusOrActive(request.status())
        );
        replacePromotionTiers(promotion.getId(), validated.tiers());
        return toResponse(promotion);
    }

    @Transactional
    public PromotionResponse delete(String promotionId) {
        Promotion promotion = requirePromotion(promotionId);
        PromotionResponse response = toResponse(promotion);
        promotionTierRepository.deleteByPromotionId(promotion.getId());
        promotionRepository.delete(promotion);
        return response;
    }

    @Transactional(readOnly = true)
    public PromotionService.PromotionPage listActiveForCurrentCustomer(int page, int limit) {
        User user = currentUserService.getCurrentUser();
        Page<Promotion> promotions = promotionRepository.findActiveForTier(
                Instant.now(),
                eligibleTiersFor(user),
                ActiveStatus.ACTIVE,
                PromotionTargetingMode.ALL_TIERS,
                pageRequest(page, limit)
        );
        return toPage(promotions);
    }

    @Transactional(readOnly = true)
    public List<Promotion> listActiveForCustomer(User customer) {
        return promotionRepository.findActiveForTier(
                Instant.now(),
                eligibleTiersFor(customer),
                ActiveStatus.ACTIVE,
                PromotionTargetingMode.ALL_TIERS,
                pageRequest(1, 50)
        ).getContent();
    }

    @Transactional(readOnly = true)
    public List<CustomerPromotionResponse> listActiveLegacyForCurrentCustomer() {
        return listActiveForCurrentCustomer(1, 100).items().stream()
                .map(this::toCustomerPromotionResponse)
                .toList();
    }

    private Promotion requirePromotion(String promotionId) {
        return promotionRepository.findById(parsePromotionId(promotionId))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Promotion not found", "RESOURCE_NOT_FOUND"));
    }

    private ValidatedPromotion validate(PromotionRequest request) {
        if (request.startDate().isAfter(request.endDate())) {
            throw validationError("startDate", "startDate must be before or equal to endDate");
        }
        if (request.pointMultiplier() < 0.0 || request.pointMultiplier() > 99.99) {
            throw validationError("pointMultiplier", "Point multiplier must be between 0.0 and 99.99");
        }
        if (request.targetingMode() == PromotionTargetingMode.SPECIFIC_TIERS) {
            if (request.applicableTiers() == null || request.applicableTiers().isEmpty()) {
                throw validationError("applicableTiers", "At least one tier is required for SPECIFIC_TIERS");
            }
            List<String> tiers = request.applicableTiers().stream()
                    .map(TierConfig::normalizeTier)
                    .distinct()
                    .peek(tierConfigService::getConfig)
                    .toList();
            return new ValidatedPromotion(tiers);
        }
        return new ValidatedPromotion(List.of());
    }

    private ApiException validationError(String field, String message) {
        return new ApiException(
                HttpStatus.BAD_REQUEST,
                "Validation failed",
                "VALIDATION_ERROR",
                Map.of("field", field, "message", message)
        );
    }

    private PromotionService.PromotionPage toPage(Page<Promotion> page) {
        List<PromotionResponse> items = page.getContent().stream().map(this::toResponse).toList();
        PaginationMeta pagination = new PaginationMeta(
                page.getNumber() + 1,
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.hasNext()
        );
        return new PromotionService.PromotionPage(items, pagination);
    }

    private PageRequest pageRequest(int page, int limit) {
        return PageRequest.of(Math.max(page - 1, 0), limit);
    }

    private PromotionResponse toResponse(Promotion promotion) {
        return new PromotionResponse(
                promotion.getId().toString(),
                promotion.getName(),
                promotion.getDescription(),
                promotion.getPointMultiplier().doubleValue(),
                promotion.getDiscountType() != null ? promotion.getDiscountType().name() : "NONE",
                promotion.getDiscountValue() != null ? promotion.getDiscountValue() : 0L,
                promotion.getStartAt(),
                promotion.getEndAt(),
                promotion.getTargetingMode().name(),
                resolveApplicableTiers(promotion),
                null,
                promotion.getStatus().name(),
                promotion.getCreatedAt(),
                promotion.getUpdatedAt()
        );
    }

    private CustomerPromotionResponse toCustomerPromotionResponse(PromotionResponse promotion) {
        return new CustomerPromotionResponse(
                promotion.name(),
                promotion.name(),
                promotion.targetingMode(),
                promotion.applicableTiers(),
                promotion.pointMultiplier(),
                promotion.discountType(),
                promotion.discountValue(),
                0L,
                false,
                promotion.endDate()
        );
    }

    private List<String> resolveApplicableTiers(Promotion promotion) {
        if (promotion.getTargetingMode() == PromotionTargetingMode.ALL_TIERS) {
            return tierConfigService.activeTierCodes();
        }
        return promotionTierRepository.findByPromotionId(promotion.getId()).stream()
                .map(PromotionTier::getTier)
                .toList();
    }

    private void replacePromotionTiers(UUID promotionId, List<String> tiers) {
        promotionTierRepository.deleteByPromotionId(promotionId);
        if (!tiers.isEmpty()) {
            promotionTierRepository.saveAll(tiers.stream()
                    .map(tier -> new PromotionTier(promotionId, tier))
                    .toList());
        }
    }

    private UUID parsePromotionId(String promotionId) {
        try {
            return UUID.fromString(promotionId);
        } catch (IllegalArgumentException exception) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Promotion not found", "RESOURCE_NOT_FOUND");
        }
    }

    private ActiveStatus statusOrActive(ActiveStatus status) {
        return status == null ? ActiveStatus.ACTIVE : status;
    }

    private List<String> eligibleTiersFor(User user) {
        return loyaltyAccountRepository.findByCustomerId(user.getId())
                .map(LoyaltyAccount::getTier)
                .map(tierConfigService::eligibleTierCodesFor)
                .orElseGet(() -> tierConfigService.eligibleTierCodesFor(TierConfigService.BRONZE));
    }

    @Override
    @Transactional(readOnly = true)
    public java.util.Optional<Promotion> getActivePromotionByNameForCustomer(String name, User customer) {
        java.util.Optional<Promotion> promoOpt = promotionRepository.findByName(name)
                .filter(p -> p.getStatus() == ActiveStatus.ACTIVE)
                .filter(p -> p.getStartAt().isBefore(java.time.Instant.now()))
                .filter(p -> p.getEndAt().isAfter(java.time.Instant.now()));

        if (promoOpt.isPresent()) {
            Promotion p = promoOpt.get();
            if (p.getTargetingMode() == com.autowash.entity.enums.PromotionTargetingMode.SPECIFIC_TIERS) {
                List<String> eligible = eligibleTiersFor(customer);
                boolean hasTier = promotionTierRepository.findByPromotionId(p.getId()).stream()
                        .anyMatch(pt -> eligible.contains(pt.getTier()));
                if (!hasTier) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Your tier is not eligible for this promotion", "TIER_NOT_ELIGIBLE");
                }
            }
        }
        
        return promoOpt;
    }

    private record ValidatedPromotion(List<String> tiers) {
    }
}
