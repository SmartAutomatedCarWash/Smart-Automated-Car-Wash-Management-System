package com.autowash.entity;

import com.autowash.entity.enums.PaymentMethod;
import com.autowash.entity.enums.PaymentStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "payments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Payment {

    @Id
    private UUID id;

    @OneToOne(optional = false)
    @JoinColumn(name = "booking_id", nullable = false, unique = true)
    private Booking booking;

    @Enumerated(EnumType.STRING)
    @Column(name = "method", nullable = false)
    private PaymentMethod method;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status;

    @Column(nullable = false)
    private long amount;

    @Column(name = "transaction_ref", length = 120)
    private String transactionRef;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public Payment(Booking booking, PaymentMethod method, PaymentStatus status, long amount) {
        this.id = UUID.randomUUID();
        this.booking = booking;
        this.method = method;
        this.status = status;
        this.amount = amount;
        this.createdAt = Instant.now();
    }

    public void updateAmount(long amount) {
        this.amount = amount;
    }

    public void prepareOnlinePayment(long amount, String transactionRef) {
        this.method = PaymentMethod.E_WALLET;
        this.status = PaymentStatus.PENDING_PAYMENT;
        this.amount = amount;
        this.transactionRef = transactionRef;
        this.paidAt = null;
    }

    public void changeToCashAtCounter() {
        this.method = PaymentMethod.CASH_AT_COUNTER;
        this.status = PaymentStatus.UNPAID;
        this.transactionRef = null;
        this.paidAt = null;
    }

    public void markFailed() {
        if (this.status == PaymentStatus.PAID) {
            return;
        }
        this.status = PaymentStatus.FAILED;
    }

    public void markCancelled() {
        if (this.status == PaymentStatus.PAID) {
            return;
        }
        this.status = PaymentStatus.CANCELLED;
    }

    public void markRefundPending() {
        if (this.status == PaymentStatus.PAID || this.status == PaymentStatus.REFUND_FAILED) {
            this.status = PaymentStatus.REFUND_PENDING;
        }
    }

    public void markRefunded(boolean partial) {
        this.status = partial ? PaymentStatus.PARTIALLY_REFUNDED : PaymentStatus.REFUNDED;
    }

    public void markRefundFailed() {
        if (this.status == PaymentStatus.REFUND_PENDING || this.status == PaymentStatus.PAID) {
            this.status = PaymentStatus.REFUND_FAILED;
        }
    }

    public void markPaid(String transactionRef) {
        if (this.status == PaymentStatus.PAID) {
            return;
        }
        this.status = PaymentStatus.PAID;
        this.transactionRef = transactionRef;
        this.paidAt = Instant.now();
    }
}
