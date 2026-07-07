package com.autowash.entity;

import com.autowash.entity.enums.LoyaltyTier;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
@Entity
@Table(name = "loyalty_accounts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LoyaltyAccount {

    @Id
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false, unique = true)
    private User customer;

    @Column(name = "current_points", nullable = false)
    private int currentPoints;

    @Column(name = "total_earned_points", nullable = false)
    private int totalEarnedPoints;

    @Column(nullable = false, length = 50)
    private String tier;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public LoyaltyAccount(User customer) {
        Instant now = Instant.now();
        this.id = UUID.randomUUID();
        this.customer = customer;
        this.currentPoints = 0;
        this.totalEarnedPoints = 0;
        this.tier = LoyaltyTier.BRONZE.name();
        this.createdAt = now;
        this.updatedAt = now;
    }

    public void addPoints(int points) {
        this.currentPoints += points;
        this.totalEarnedPoints += Math.max(points, 0);
        this.updatedAt = Instant.now();
    }

    public void addActivePoints(int points) {
        this.currentPoints += points;
        this.updatedAt = Instant.now();
    }

    public void redeemPoints(int points) {
        this.currentPoints -= points;
        this.updatedAt = Instant.now();
    }

    public void updateTier(LoyaltyTier tier) {
        updateTier(tier.name());
    }

    public void updateTier(String tier) {
        this.tier = tier;
        this.updatedAt = Instant.now();
    }
}

