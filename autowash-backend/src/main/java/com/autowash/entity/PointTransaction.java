package com.autowash.entity;

import com.autowash.entity.enums.PointTransactionType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
@Entity
@Table(name = "point_transactions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PointTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "loyalty_account_id", nullable = false)
    private LoyaltyAccount loyaltyAccount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PointTransactionType type;

    @Column(nullable = false)
    private int points;

    @Column(name = "balance_after", nullable = false)
    private int balanceAfter;

    @Column(name = "base_points")
    private Integer basePoints;

    @Column(name = "point_multiplier", precision = 10, scale = 2)
    private BigDecimal pointMultiplier;

    @Column(nullable = false, length = 255)
    private String reason;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public PointTransaction(LoyaltyAccount loyaltyAccount, Booking booking, PointTransactionType type, int points, int balanceAfter, String reason) {
        this(loyaltyAccount, booking, type, points, balanceAfter, reason, null, null);
    }

    public PointTransaction(
            LoyaltyAccount loyaltyAccount,
            Booking booking,
            PointTransactionType type,
            int points,
            int balanceAfter,
            String reason,
            Integer basePoints,
            BigDecimal pointMultiplier
    ) {
        this.loyaltyAccount = loyaltyAccount;
        this.booking = booking;
        this.type = type;
        this.points = points;
        this.balanceAfter = balanceAfter;
        this.basePoints = basePoints;
        this.pointMultiplier = pointMultiplier;
        this.reason = reason;
        this.createdAt = Instant.now();
    }
}
