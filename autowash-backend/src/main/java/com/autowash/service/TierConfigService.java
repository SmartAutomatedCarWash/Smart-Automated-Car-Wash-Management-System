package com.autowash.service;

import com.autowash.dto.TierConfigCreateRequest;
import com.autowash.dto.TierConfigRequest;
import com.autowash.dto.TierConfigResponse;
import com.autowash.entity.enums.LoyaltyTier;
import java.util.List;

public interface TierConfigService {
    String BRONZE = "BRONZE";

    TierConfigResponse getConfig(String tier);

    default TierConfigResponse getConfig(LoyaltyTier tier) {
        return getConfig(tier.name());
    }

    List<TierConfigResponse> getAllConfigs();

    TierConfigResponse createConfig(TierConfigCreateRequest request);

    TierConfigResponse updateConfig(String tier, TierConfigRequest request);

    default TierConfigResponse updateConfig(LoyaltyTier tier, TierConfigRequest request) {
        return updateConfig(tier.name(), request);
    }

    void deleteConfig(String tier);

    double getPointMultiplier(String tier);

    default double getPointMultiplier(LoyaltyTier tier) {
        return getPointMultiplier(tier.name());
    }

    String calculateTierForPoints(int totalEarnedPoints);

    int getTierRank(String tier);

    default int getTierRank(LoyaltyTier tier) {
        return getTierRank(tier.name());
    }

    List<String> eligibleTierCodesFor(String tier);

    List<String> activeTierCodes();
}
