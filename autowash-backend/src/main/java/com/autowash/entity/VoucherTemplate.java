package com.autowash.entity;

import com.autowash.entity.enums.DiscountType;
import com.autowash.entity.enums.ActiveStatus;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "voucher_templates")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class VoucherTemplate {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(columnDefinition = "text")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", nullable = false)
    private DiscountType discountType;

    @Column(name = "discount_value", nullable = false)
    private long discountValue;

    @Column(name = "min_order_amount", nullable = false)
    private long minOrderAmount;

    @Column(name = "max_discount_amount")
    private Long maxDiscountAmount;

    @Column(name = "required_points", nullable = false)
    private int requiredPoints;

    @Column(name = "valid_days_after_claim", nullable = false)
    private int validDaysAfterClaim;

    @Column(name = "usage_limit")
    private Integer usageLimit;

    @Column(name = "used_count", nullable = false)
    private int usedCount;

    @Column(name = "new_customer_only", nullable = false)
    private boolean newCustomerOnly;

    @Column(name = "start_at", nullable = false)
    private Instant startAt;

    @Column(name = "end_at", nullable = false)
    private Instant endAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ActiveStatus status;

    @OneToMany(mappedBy = "voucherTemplate", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<VoucherApplicableService> applicableServices = new ArrayList<>();

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
    }

    public VoucherTemplate(String code, String name, String description, DiscountType discountType,
                           long discountValue, long minOrderAmount, Long maxDiscountAmount,
                           int requiredPoints, int validDaysAfterClaim,
                           Integer usageLimit, boolean newCustomerOnly, Instant startAt, Instant endAt, ActiveStatus status) {
        this.code = code;
        this.name = name;
        this.description = description;
        this.discountType = discountType;
        this.discountValue = discountValue;
        this.minOrderAmount = minOrderAmount;
        this.maxDiscountAmount = maxDiscountAmount;
        this.requiredPoints = requiredPoints;
        this.validDaysAfterClaim = validDaysAfterClaim;
        this.usageLimit = usageLimit;
        this.newCustomerOnly = newCustomerOnly;
        this.startAt = startAt;
        this.endAt = endAt;
        this.status = status;
        this.usedCount = 0;
    }

    public boolean isUsageLimitReached() {
        return usageLimit != null && usedCount >= usageLimit;
    }

    public void recordUse() {
        this.usedCount++;
    }

    public void undoUse() {
        if (this.usedCount > 0) {
            this.usedCount--;
        }
    }

    public void update(String name, String description, DiscountType discountType, long discountValue, long minOrderAmount,
                       Long maxDiscountAmount, int requiredPoints, int validDaysAfterClaim,
                       Integer usageLimit, boolean newCustomerOnly,
                       Instant startAt, Instant endAt, ActiveStatus status) {
        this.name = name;
        this.description = description;
        this.discountType = discountType;
        this.discountValue = discountValue;
        this.minOrderAmount = minOrderAmount;
        this.maxDiscountAmount = maxDiscountAmount;
        this.requiredPoints = requiredPoints;
        this.validDaysAfterClaim = validDaysAfterClaim;
        this.usageLimit = usageLimit;
        this.newCustomerOnly = newCustomerOnly;
        this.startAt = startAt;
        this.endAt = endAt;
        this.status = status;
    }

    public void deactivate() {
        this.status = ActiveStatus.INACTIVE;
    }

    public void addApplicableService(VoucherApplicableService applicableService) {
        applicableServices.add(applicableService);
        applicableService.setVoucherTemplate(this);
    }

    public void removeApplicableService(VoucherApplicableService applicableService) {
        applicableServices.remove(applicableService);
        applicableService.setVoucherTemplate(null);
    }
}
