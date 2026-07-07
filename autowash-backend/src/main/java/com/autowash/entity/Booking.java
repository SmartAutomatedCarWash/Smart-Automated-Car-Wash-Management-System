package com.autowash.entity;

import com.autowash.entity.enums.BookingStatus;
import com.autowash.entity.enums.BookingType;
import com.autowash.entity.enums.BookingConfirmationStatus;
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
import jakarta.persistence.Transient;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
@Entity
@Table(name = "bookings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Booking {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_staff_id")
    private User assignedStaff;

    @Enumerated(EnumType.STRING)
    @Column(name = "booking_type", nullable = false)
    private BookingType bookingType;

    @Column(name = "package_id")
    private UUID packageId;

    @Column(name = "combo_id")
    private UUID comboId;

    @Column(name = "voucher_id")
    private UUID voucherId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookingStatus status;

    @Column(name = "scheduled_at", nullable = false)
    private Instant scheduledAt;

    @Column(name = "base_amount", nullable = false)
    private long baseAmount;

    @Column(name = "options_amount", nullable = false)
    private long optionsAmount;

    @Column(name = "discount_amount", nullable = false)
    private long discountAmount;

    @Column(name = "final_amount", nullable = false)
    private long finalAmount;

    @Column(name = "estimated_duration_minutes", nullable = false)
    private int estimatedDurationMinutes;

    @Column(name = "voucher_discount", nullable = false)
    private long voucherDiscount;

    @Column(name = "note")
    private String note;

    @Column(name = "cancel_reason", length = 500)
    private String cancelReason;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Booking(
            UUID id,
            User customer,
            Vehicle vehicle,
            UUID packageId,
            UUID comboId,
            UUID voucherId,
            Instant scheduledAt,
            java.time.LocalTime bookingTime,
            com.autowash.entity.enums.PaymentMethod paymentMethod,
            long baseAmount,
            long optionsAmount,
            long discountAmount,
            long finalAmount,
            int estimatedDurationMinutes
    ) {
        Instant now = Instant.now();
        this.id = id;
        this.customer = customer;
        this.vehicle = vehicle;
        this.bookingType = packageId != null ? BookingType.PACKAGE : BookingType.COMBO;
        this.packageId = packageId;
        this.comboId = comboId;
        this.voucherId = voucherId;
        this.status = BookingStatus.PENDING;
        this.scheduledAt = scheduledAt;
        this.baseAmount = baseAmount;
        this.optionsAmount = optionsAmount;
        this.discountAmount = discountAmount;
        this.finalAmount = finalAmount;
        this.estimatedDurationMinutes = estimatedDurationMinutes;
        this.voucherDiscount = 0;
        this.createdAt = now;
        this.updatedAt = now;
    }

    @Transient
    public BookingConfirmationStatus getConfirmationStatus() {
        return switch (status) {
            case PENDING -> BookingConfirmationStatus.PENDING;
            case CONFIRMED, CHECKED_IN, IN_PROGRESS, COMPLETED -> BookingConfirmationStatus.VERIFIED;
            case CANCELLED -> BookingConfirmationStatus.CANCELLED;
            case NO_SHOW -> BookingConfirmationStatus.EXPIRED;
        };
    }

    @Transient
    public Instant getConfirmationExpiresAt() {
        return null;
    }

    public void updateStatus(BookingStatus status) {
        this.status = status;
        this.updatedAt = Instant.now();
    }

    public void markNoShow() {
        this.status = BookingStatus.NO_SHOW;
        this.updatedAt = Instant.now();
    }

    public void cancel(String reason) {
        this.status = BookingStatus.CANCELLED;
        this.cancelReason = reason;
        this.updatedAt = Instant.now();
    }


    public LocalDate getBookingDate() {
        return scheduledAt == null ? null : scheduledAt.atZone(java.time.ZoneOffset.UTC).toLocalDate();
    }

    public LocalTime getBookingTime() {
        return scheduledAt == null ? null : scheduledAt.atZone(java.time.ZoneOffset.UTC).toLocalTime();
    }

    public long getBasePrice() {
        return baseAmount;
    }

    public long getOptionsTotal() {
        return optionsAmount;
    }

    public long getVoucherDiscount() {
        return discountAmount;
    }

    public long getFinalAmount() {
        return finalAmount;
    }

    public int getEstimatedDurationMinutes() {
        return estimatedDurationMinutes;
    }

    public PaymentMethod getPaymentMethod() {
        return PaymentMethod.CASH_AT_COUNTER;
    }

    public PaymentStatus getPaymentStatus() {
        return PaymentStatus.UNPAID;
    }

    public String getVoucherCode() {
        return null;
    }

    public List<BookingOption> getOptions() {
        return List.of();
    }

    public void assignStaff(User staff) {
        this.assignedStaff = staff;
        this.updatedAt = Instant.now();
    }

    public void startOtpConfirmationWindow(Instant expiresAt) {}

    public void confirmByOtp() {
        this.status = BookingStatus.CONFIRMED;
    }

    public void expireOtpConfirmation() {}

    public void addOption(BookingOption option) {}
}
