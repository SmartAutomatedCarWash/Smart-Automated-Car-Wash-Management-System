package com.autowash.entity;

import com.autowash.entity.enums.ActiveStatus;
import com.autowash.entity.enums.DiscountKind;
import com.autowash.entity.enums.DiscountTargetingMode;
import com.autowash.entity.enums.DiscountType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "discounts")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class Discount {

    @Id
    @Builder.Default
    private UUID id = UUID.randomUUID();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DiscountKind type;

    @Column(unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", nullable = false, length = 30)
    private DiscountType discountType;

    @Column(name = "discount_value", nullable = false)
    @Builder.Default
    private long discountValue = 0;

    @Column(name = "min_order_amount", nullable = false)
    @Builder.Default
    private long minOrderAmount = 0;

    @Column(name = "max_discount_amount")
    private Long maxDiscountAmount;

    @Column(name = "required_points", nullable = false)
    @Builder.Default
    private int requiredPoints = 0;

    @Column(name = "valid_days_after_claim")
    private Integer validDaysAfterClaim;

    @Enumerated(EnumType.STRING)
    @Column(name = "targeting_mode", nullable = false, length = 30)
    @Builder.Default
    private DiscountTargetingMode targetingMode = DiscountTargetingMode.ALL_TIERS;

    @Column(name = "new_customer_only", nullable = false)
    @Builder.Default
    private boolean newCustomerOnly = false;

    @Column(name = "usage_limit")
    private Integer usageLimit;

    @Column(name = "used_count", nullable = false)
    @Builder.Default
    private int usedCount = 0;

    @Column(name = "start_at", nullable = false)
    private Instant startAt;

    @Column(name = "end_at", nullable = false)
    private Instant endAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ActiveStatus status = ActiveStatus.ACTIVE;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
