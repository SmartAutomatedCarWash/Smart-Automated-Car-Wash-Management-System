package com.autowash.entity;

import com.autowash.entity.enums.ActiveStatus;
import com.autowash.entity.enums.DiscountType;
import com.autowash.entity.enums.PromotionTargetingMode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
@Entity
@Table(name = "promotions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Promotion {

    @Id
    private UUID id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 500)
    private String description;

    @Column(name = "point_multiplier", nullable = false, precision = 4, scale = 2)
    private BigDecimal pointMultiplier;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type")
    private DiscountType discountType;

    @Column(name = "discount_value")
    private Long discountValue;

    @Enumerated(EnumType.STRING)
    @Column(name = "targeting_mode", nullable = false)
    private PromotionTargetingMode targetingMode;

    @Column(name = "start_at", nullable = false)
    private Instant startAt;

    @Column(name = "end_at", nullable = false)
    private Instant endAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ActiveStatus status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Promotion(String name, String description, BigDecimal pointMultiplier, DiscountType discountType, Long discountValue, Instant startAt, Instant endAt, PromotionTargetingMode targetingMode, ActiveStatus status) {
        this.name = name;
        this.description = description;
        this.pointMultiplier = pointMultiplier;
        this.discountType = discountType != null ? discountType : DiscountType.NONE;
        this.discountValue = discountValue != null ? discountValue : 0L;
        this.startAt = startAt;
        this.endAt = endAt;
        this.targetingMode = targetingMode;
        this.status = status;
    }

    public Promotion(String name, String description, BigDecimal pointMultiplier, Instant startAt, Instant endAt, PromotionTargetingMode targetingMode, ActiveStatus status) {
        this(name, description, pointMultiplier, DiscountType.NONE, 0L, startAt, endAt, targetingMode, status);
    }

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (id == null) {
            id = UUID.randomUUID();
        }
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public void update(String name, String description, BigDecimal pointMultiplier, DiscountType discountType, Long discountValue, Instant startAt, Instant endAt, PromotionTargetingMode targetingMode, ActiveStatus status) {
        this.name = name;
        this.description = description;
        this.pointMultiplier = pointMultiplier;
        this.discountType = discountType != null ? discountType : DiscountType.NONE;
        this.discountValue = discountValue != null ? discountValue : 0L;
        this.startAt = startAt;
        this.endAt = endAt;
        this.targetingMode = targetingMode;
        this.status = status;
        this.updatedAt = Instant.now();
    }
}
