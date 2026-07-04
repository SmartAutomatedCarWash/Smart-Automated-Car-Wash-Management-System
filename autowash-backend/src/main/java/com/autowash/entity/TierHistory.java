package com.autowash.entity;

import com.autowash.entity.enums.LoyaltyTier;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
@Entity
@Table(name = "tier_histories")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TierHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "loyalty_account_id", nullable = false)
    private LoyaltyAccount loyaltyAccount;

    @Column(name = "old_tier", length = 50)
    private String oldTier;

    @Column(name = "new_tier", nullable = false, length = 50)
    private String newTier;

    @Column(name = "total_points_at_change", nullable = false)
    private int totalPointsAtChange;

    @Column(name = "changed_at", nullable = false)
    private Instant changedAt;

    public TierHistory(LoyaltyAccount loyaltyAccount, LoyaltyTier oldTier, LoyaltyTier newTier, int totalPointsAtChange) {
        this(loyaltyAccount, oldTier == null ? null : oldTier.name(), newTier.name(), totalPointsAtChange);
    }

    public TierHistory(LoyaltyAccount loyaltyAccount, String oldTier, String newTier, int totalPointsAtChange) {
        this.loyaltyAccount = loyaltyAccount;
        this.oldTier = oldTier;
        this.newTier = newTier;
        this.totalPointsAtChange = totalPointsAtChange;
        this.changedAt = Instant.now();
    }
}
