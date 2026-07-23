package com.autowash.entity;

import com.autowash.entity.enums.CustomerComboStatus;
import com.autowash.entity.enums.PaymentMethod;
import com.autowash.entity.enums.PaymentStatus;
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

    @Column(name = "activated_at")
    private Instant activatedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method")
    private PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status")
    private PaymentStatus paymentStatus;

    @Column(name = "transaction_ref", length = 120)
    private String transactionRef;

    @Column(name = "qr_url", columnDefinition = "TEXT")
    private String qrUrl;

    @Column(name = "bank_code", length = 50)
    private String bankCode;

    @Column(name = "account_number", length = 100)
    private String accountNumber;

    @Column(name = "account_name", length = 255)
    private String accountName;

    @Column(name = "transfer_description", length = 255)
    private String transferDescription;

    public CustomerCombo(UUID id, User customer, UUID comboId, int totalUsages, Instant activatedAt, Instant expiresAt) {
        this.id = id;
        this.customer = customer;
        this.comboId = comboId;
        this.totalUsages = totalUsages;
        this.remainingUsages = totalUsages;
        this.status = CustomerComboStatus.ACTIVE;
        this.paymentStatus = PaymentStatus.PAID;
        this.activatedAt = activatedAt;
        this.expiresAt = expiresAt;
        this.createdAt = Instant.now();
    }

    public void markPendingPayment(PaymentMethod method, String transactionRef, String qrUrl, String bankCode, String accountNumber, String accountName, String transferDescription) {
        this.status = CustomerComboStatus.PENDING_PAYMENT;
        this.paymentMethod = method;
        this.paymentStatus = PaymentStatus.PENDING_PAYMENT;
        this.activatedAt = null;
        this.transactionRef = transactionRef;
        this.qrUrl = qrUrl;
        this.bankCode = bankCode;
        this.accountNumber = accountNumber;
        this.accountName = accountName;
        this.transferDescription = transferDescription;
    }

    public void markActivated(Instant expiresAt) {
        this.status = CustomerComboStatus.ACTIVE;
        this.paymentStatus = PaymentStatus.PAID;
        this.activatedAt = Instant.now();
        this.expiresAt = expiresAt;
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
