package com.autowash.entity;

import com.autowash.entity.enums.LoyaltyTier;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "tier_voucher_offers")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class TierVoucherOffer {

    @Id
    @Column(length = 50)
    private String id;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(name = "min_tier", nullable = false, length = 50)
    private String minTier;

    public TierVoucherOffer(
            String id,
            String title,
            LoyaltyTier minTier,
            int pointsCost,
            int voucherValue,
            String accent,
            String badge,
            Instant createdAt,
            Instant updatedAt
    ) {
        this.id = id;
        this.title = title;
        this.minTier = minTier.name();
        this.pointsCost = pointsCost;
        this.voucherValue = voucherValue;
        this.accent = accent;
        this.badge = badge;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    @Column(name = "points_cost", nullable = false)
    private int pointsCost;

    @Column(name = "voucher_value", nullable = false)
    private int voucherValue;

    @Column(nullable = false, length = 20)
    private String accent;

    @Column(nullable = false, length = 20)
    private String badge;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();
}
