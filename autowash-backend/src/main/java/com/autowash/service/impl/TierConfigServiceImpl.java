package com.autowash.service.impl;

import com.autowash.dto.TierConfigCreateRequest;
import com.autowash.dto.TierConfigRequest;
import com.autowash.dto.TierConfigResponse;
import com.autowash.entity.TierConfig;
import com.autowash.mapper.TierConfigMapper;
import com.autowash.repository.TierConfigRepository;
import com.autowash.service.TierConfigService;
import com.autowash.shared.exception.ApiException;
import com.autowash.shared.exception.ErrorCode;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
public class TierConfigServiceImpl implements TierConfigService {

    private final TierConfigRepository tierConfigRepository;
    private final EntityManager entityManager;
    private final TierConfigMapper tierConfigMapper;

    public TierConfigServiceImpl(
            TierConfigRepository tierConfigRepository,
            EntityManager entityManager,
            TierConfigMapper tierConfigMapper
    ) {
        this.tierConfigRepository = tierConfigRepository;
        this.entityManager = entityManager;
        this.tierConfigMapper = tierConfigMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public TierConfigResponse getConfig(String tier) {
        TierConfig config = tierConfigRepository.findById(normalizeTier(tier))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Tier config not found", ErrorCode.RESOURCE_NOT_FOUND));
        return tierConfigMapper.toResponse(config);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TierConfigResponse> getAllConfigs() {
        return tierConfigRepository.findAllByOrderByRankOrderAsc().stream()
                .map(tierConfigMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public TierConfigResponse createConfig(TierConfigCreateRequest request) {
        String code = normalizeTier(request.code());
        if (code.isBlank()) {
            throw validationError("code", "Tier code is required");
        }
        if (tierConfigRepository.existsById(code)) {
            throw new ApiException(HttpStatus.CONFLICT, "Tier config already exists", ErrorCode.DUPLICATE_RESOURCE);
        }
        int rankOrder = request.rankOrder();
        if (tierConfigRepository.existsByRankOrder(rankOrder)) {
            shiftRanksAtOrAbove(rankOrder);
        }
        TierConfig config = new TierConfig(
                code,
                request.name().trim(),
                request.minPoints(),
                BigDecimal.valueOf(request.pointMultiplier()),
                request.priorityScore(),
                rankOrder,
                false,
                request.active() == null || request.active(),
                normalizeUrl(request.imageUrl())
        );
        validateTierConfig(config.getTier(), config.getMinPoints(), config.getPointMultiplier(), config.getRankOrder());
        return tierConfigMapper.toResponse(tierConfigRepository.save(config));
    }

    @Override
    @Transactional
    public TierConfigResponse updateConfig(String tier, TierConfigRequest request) {
        String code = normalizeTier(tier);
        TierConfig config = tierConfigRepository.findById(code)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Tier config not found", ErrorCode.RESOURCE_NOT_FOUND));

        String name = request.name() == null || request.name().isBlank()
                ? config.getDisplayName()
                : request.name().trim();
        int minPoints = request.minPoints() == null ? config.getMinPoints() : request.minPoints();
        BigDecimal pointMultiplier = request.pointMultiplier() == null
                ? config.getPointMultiplier()
                : BigDecimal.valueOf(request.pointMultiplier());
        int priorityScore = request.priorityScore() == null ? config.getPriorityScore() : request.priorityScore();
        int rankOrder = request.rankOrder() == null ? config.getRankOrder() : request.rankOrder();
        boolean active = request.active() == null ? config.isActive() : request.active();
        String imageUrl = request.imageUrl() == null ? config.getImageUrl() : normalizeUrl(request.imageUrl());

        if (rankOrder != config.getRankOrder() && tierConfigRepository.existsByRankOrder(rankOrder)) {
            shiftRanksAtOrAbove(rankOrder);
        }
        validateTierConfig(code, minPoints, pointMultiplier, rankOrder);
        config.update(
                name,
                minPoints,
                pointMultiplier,
                priorityScore,
                rankOrder,
                active,
                imageUrl
        );

        return tierConfigMapper.toResponse(tierConfigRepository.save(config));
    }

    @Override
    @Transactional
    public void deleteConfig(String tier) {
        String code = normalizeTier(tier);
        TierConfig config = tierConfigRepository.findById(code)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Tier config not found", ErrorCode.RESOURCE_NOT_FOUND));
        if (config.isSystemTier()) {
            throw validationError("tier", "System tiers cannot be deleted");
        }
        long references = countReferences(code);
        if (references > 0) {
            throw new ApiException(HttpStatus.CONFLICT, "Tier is currently in use", ErrorCode.RESOURCE_IN_USE);
        }
        int deletedRank = config.getRankOrder();
        tierConfigRepository.delete(config);
        closeRankGap(deletedRank);
    }

    @Override
    @Transactional(readOnly = true)
    public double getPointMultiplier(String tier) {
        return tierConfigRepository.findById(normalizeTier(tier))
                .map(config -> config.getPointMultiplier().doubleValue())
                .orElse(1.0);
    }

    @Override
    @Transactional(readOnly = true)
    public String calculateTierForPoints(int totalEarnedPoints) {
        return tierConfigRepository.findByActiveTrueOrderByRankOrderAsc().stream()
                .filter(config -> totalEarnedPoints >= config.getMinPoints())
                .max(Comparator.comparingInt(TierConfig::getMinPoints))
                .map(TierConfig::getTier)
                .orElse(BRONZE);
    }

    @Override
    @Transactional(readOnly = true)
    public int getTierRank(String tier) {
        String code = normalizeTier(tier);
        List<TierConfig> configs = tierConfigRepository.findAllByOrderByRankOrderAsc();
        for (int i = 0; i < configs.size(); i++) {
            if (configs.get(i).getTier().equals(code)) {
                return i;
            }
        }
        return 0; // fallback
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> eligibleTierCodesFor(String tier) {
        int rank = getTierRank(tier);
        return tierConfigRepository.findByActiveTrueOrderByRankOrderAsc().stream()
                .filter(config -> config.getRankOrder() <= rank)
                .map(TierConfig::getTier)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> activeTierCodes() {
        return tierConfigRepository.findByActiveTrueOrderByRankOrderAsc().stream()
                .map(TierConfig::getTier)
                .toList();
    }

    private String normalizeTier(String tier) {
        return TierConfig.normalizeTier(tier);
    }

    private String normalizeUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return null;
        }
        return imageUrl.trim();
    }

    private void validateTierConfig(String tier, int minPoints, BigDecimal pointMultiplier, int rankOrder) {
        if (BRONZE.equals(tier) && minPoints != 0) {
            throw validationError("minPoints", "BRONZE tier min points must be 0");
        }
        if (pointMultiplier.compareTo(BigDecimal.ONE) < 0) {
            throw validationError("pointMultiplier", "Point multiplier must be at least 1.0");
        }
        if (rankOrder < 0) {
            throw validationError("rankOrder", "Rank order cannot be negative");
        }
    }

    private void shiftRanksAtOrAbove(int rankOrder) {
        List<TierConfig> tiers = tierConfigRepository.findAllByOrderByRankOrderAsc().stream()
                .filter(tier -> tier.getRankOrder() >= rankOrder)
                .sorted(Comparator.comparingInt(TierConfig::getRankOrder).reversed())
                .toList();
        for (TierConfig tier : tiers) {
            tier.update(
                    tier.getDisplayName(),
                    tier.getMinPoints(),
                    tier.getPointMultiplier(),
                    tier.getPriorityScore(),
                    tier.getRankOrder() + 1,
                    tier.isActive()
            );
        }
    }

    private void closeRankGap(int deletedRank) {
        List<TierConfig> tiers = tierConfigRepository.findAllByOrderByRankOrderAsc().stream()
                .filter(tier -> tier.getRankOrder() > deletedRank)
                .toList();
        for (TierConfig tier : tiers) {
            tier.update(
                    tier.getDisplayName(),
                    tier.getMinPoints(),
                    tier.getPointMultiplier(),
                    tier.getPriorityScore(),
                    tier.getRankOrder() - 1,
                    tier.isActive(),
                    tier.getImageUrl()
            );
        }
    }

    private long countReferences(String tier) {
        return count("select count(account) from LoyaltyAccount account where account.tier = :tier", tier)
                + count("select count(history) from TierHistory history where history.oldTier = :tier or history.newTier = :tier", tier)
                + count("select count(discountTier) from DiscountTier discountTier where discountTier.tier.tier = :tier", tier)
                + count("select count(offer) from TierVoucherOffer offer where offer.minTier.tier = :tier", tier);
    }

    private long count(String query, String tier) {
        return entityManager.createQuery(query, Long.class)
                .setParameter("tier", tier)
                .getSingleResult();
    }

    private ApiException validationError(String field, String message) {
        return new ApiException(
                HttpStatus.BAD_REQUEST,
                "Validation failed",
                ErrorCode.VALIDATION_ERROR,
                Map.of("field", field, "message", message)
        );
    }
}
