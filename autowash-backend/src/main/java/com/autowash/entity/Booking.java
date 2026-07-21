package com.autowash.entity;

import java.util.List;

import java.time.LocalDate;

import java.time.Instant;

import java.time.ZoneId;

import java.util.ArrayList;

import java.util.UUID;

import com.autowash.entity.enums.BookingStatus;
import com.autowash.entity.enums.BookingConfirmationStatus;
import com.autowash.entity.enums.PaymentMethod;
import com.autowash.entity.enums.PaymentStatus;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.LocalTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "bookings")
@Getter
@Setter
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

    @Column(name = "confirmation_email", length = 255)
    private String confirmationEmail;

    @Column(name = "preferred_staff_ids", length = 500)
    private String preferredStaffIds;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookingStatus status;

    @Column(name = "scheduled_at", nullable = false)
    private Instant scheduledAt;

    @Column(name = "reminder_sent", nullable = false)
    private boolean reminderSent;

    @Column(name = "note")
    private String note;

    @Column(name = "cancel_reason", length = 500)
    private String cancelReason;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToOne(mappedBy = "booking", cascade = CascadeType.ALL, fetch = FetchType.LAZY, optional = false)
    private BookingPricing pricing;

    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BookingDetail> details = new ArrayList<>();

    public Booking(
            UUID id,
            User customer,
            Vehicle vehicle,
            Instant scheduledAt
    ) {
        Instant now = Instant.now();
        this.id = id;
        this.customer = customer;
        this.vehicle = vehicle;
        this.status = BookingStatus.PENDING;
        this.scheduledAt = scheduledAt;
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

    public void markReminderSent() {
        this.reminderSent = true;
    }

    public void setConfirmationEmail(String confirmationEmail) {
        this.confirmationEmail = confirmationEmail;
        this.updatedAt = Instant.now();
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
        return scheduledAt == null ? null : scheduledAt.atZone(ZoneId.systemDefault()).toLocalDate();
    }

    public LocalTime getBookingTime() {
        return scheduledAt == null ? null : scheduledAt.atZone(ZoneId.systemDefault()).toLocalTime();
    }

    public PaymentMethod getPaymentMethod() {
        return PaymentMethod.CASH_AT_COUNTER;
    }

    public PaymentStatus getPaymentStatus() {
        return PaymentStatus.UNPAID;
    }

    public void assignStaff(User staff) {
        this.assignedStaff = staff;
        this.updatedAt = Instant.now();
    }

    public void setPreferredStaffIds(String preferredStaffIds) {
        this.preferredStaffIds = preferredStaffIds;
        this.updatedAt = Instant.now();
    }

    public void startOtpConfirmationWindow(Instant expiresAt) {}

    public void confirmByOtp() {
        this.status = BookingStatus.CONFIRMED;
    }

    public void expireOtpConfirmation() {}
    
    public void addDetail(BookingDetail detail) {
        details.add(detail);
        detail.setBooking(this);
    }
}
