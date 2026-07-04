package com.autowash.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Locale;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "tier_configs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TierConfig {

    @Id
    @Column(length = 50)
    private String tier;

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @Column(name = "min_points", nullable = false)
    private int minPoints;

    @Column(name = "point_multiplier", nullable = false)
    private BigDecimal pointMultiplier;

    @Column(name = "priority_score", nullable = false)
    private int priorityScore;

    @Column(name = "rank_order", nullable = false)
    private int rankOrder;

    @Column(name = "system_tier", nullable = false)
    private boolean systemTier;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public TierConfig(String tier, String displayName, int minPoints, BigDecimal pointMultiplier, int priorityScore, int rankOrder, boolean systemTier, boolean active) {
        this(tier, displayName, minPoints, pointMultiplier, priorityScore, rankOrder, systemTier, active, null);
    }

    public TierConfig(String tier, String displayName, int minPoints, BigDecimal pointMultiplier, int priorityScore, int rankOrder, boolean systemTier, boolean active, String imageUrl) {
        this.tier = normalizeTier(tier);
        this.displayName = displayName;
        this.minPoints = minPoints;
        this.pointMultiplier = pointMultiplier;
        this.priorityScore = priorityScore;
        this.rankOrder = rankOrder;
        this.systemTier = systemTier;
        this.active = active;
        this.imageUrl = imageUrl;
        this.updatedAt = Instant.now();
    }

    public void update(String displayName, int minPoints, BigDecimal pointMultiplier, int priorityScore, int rankOrder, boolean active) {
        update(displayName, minPoints, pointMultiplier, priorityScore, rankOrder, active, imageUrl);
    }

    public void update(String displayName, int minPoints, BigDecimal pointMultiplier, int priorityScore, int rankOrder, boolean active, String imageUrl) {
        this.displayName = displayName;
        this.minPoints = minPoints;
        this.pointMultiplier = pointMultiplier;
        this.priorityScore = priorityScore;
        this.rankOrder = rankOrder;
        this.active = active;
        this.imageUrl = imageUrl;
        this.updatedAt = Instant.now();
    }

    public void update(int minPoints, BigDecimal pointMultiplier, int priorityScore) {
        update(displayName, minPoints, pointMultiplier, priorityScore, rankOrder, active);
    }

    public static String normalizeTier(String tier) {
        if (tier == null) {
            return "";
        }
        return tier.trim().replace(' ', '_').toUpperCase(Locale.ROOT);
    }
}
