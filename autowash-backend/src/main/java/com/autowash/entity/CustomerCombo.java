package com.autowash.entity;

import com.autowash.entity.enums.CustomerComboStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
@Entity
@Table(name = "customer_combos")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CustomerCombo {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @Column(name = "combo_id", nullable = false)
    private UUID comboId;

    @Column(name = "total_usages", nullable = false)
    private int totalUsages;

    @Column(name = "remaining_usages", nullable = false)
    private int remainingUsages;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CustomerComboStatus status;

    @Column(name = "activated_at", nullable = false)
    private Instant activatedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public CustomerCombo(UUID id, User customer, UUID comboId, int totalUsages, Instant activatedAt, Instant expiresAt) {
        this.id = id;
        this.customer = customer;
        this.comboId = comboId;
        this.totalUsages = totalUsages;
        this.remainingUsages = totalUsages;
        this.status = CustomerComboStatus.ACTIVE;
        this.activatedAt = activatedAt;
        this.expiresAt = expiresAt;
        this.createdAt = Instant.now();
    }

    public void consumeUsage() {
        if (remainingUsages > 0) {
            remainingUsages--;
        }
        if (remainingUsages <= 0) {
            status = CustomerComboStatus.USED_UP;
        }
    }

    public void restoreUsage() {
        if (remainingUsages < totalUsages) {
            remainingUsages++;
        }
        if (status == CustomerComboStatus.USED_UP && remainingUsages > 0 && !isExpired()) {
            status = CustomerComboStatus.ACTIVE;
        }
    }

    public void markExpired() {
        this.status = CustomerComboStatus.EXPIRED;
    }

    public boolean isExpired() {
        return expiresAt != null && expiresAt.isBefore(Instant.now());
    }

    public boolean hasRemainingUsages() {
        return remainingUsages > 0;
    }
}
