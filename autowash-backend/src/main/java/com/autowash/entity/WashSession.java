package com.autowash.entity;

import com.autowash.entity.enums.WashSessionStatus;
import com.autowash.entity.enums.CancelFaultType;
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
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
@Entity
@Table(name = "wash_sessions")
@Getter
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WashSession {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_staff_id")
    private User assignedStaff;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WashSessionStatus status;

    @Column(name = "fee_amount")
    private Long feeAmount;

    @Column(name = "projected_points")
    private Integer projectedPoints;

    @Column(name = "awarded_points")
    private Integer awardedPoints;

    @Column(name = "checked_in_at")
    private Instant checkedInAt;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @Column(name = "cancel_reason", length = 500)
    private String cancelReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "cancel_fault_type")
    private CancelFaultType cancelFaultType;

    @Column(name = "notes")
    private String notes;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public static WashSession create(Booking booking, String notes, User assignedStaff) {
        return WashSession.builder()
                .id(UUID.randomUUID())
                .booking(booking)
                .assignedStaff(assignedStaff)
                .status(WashSessionStatus.PENDING)
                .notes(notes)
                .createdAt(Instant.now())
                .build();
    }

    public void assignStaff(User assignedStaff) {
        this.assignedStaff = assignedStaff;
    }

    public void queue(Instant queuedAt) {
        this.status = WashSessionStatus.QUEUED;
    }

    public void checkIn(Instant checkedInAt, long feeAmount, String ignoredCurrency, int projectedPoints) {
        this.status = WashSessionStatus.CHECKED_IN;
        this.checkedInAt = checkedInAt;
        this.feeAmount = feeAmount;
        this.projectedPoints = projectedPoints;
    }

    public void start(Instant startedAt) {
        this.status = WashSessionStatus.IN_PROGRESS;
        this.startedAt = startedAt;
    }

    public void complete(Instant completedAt) {
        this.status = WashSessionStatus.COMPLETED;
        this.completedAt = completedAt;
    }

    public void recordAwardedPoints(int awardedPoints) {
        this.awardedPoints = awardedPoints;
    }

    public void cancel(Instant cancelledAt, String reason, CancelFaultType faultType) {
        this.status = WashSessionStatus.CANCELLED;
        this.cancelledAt = cancelledAt;
        this.cancelReason = reason;
        this.cancelFaultType = faultType;
    }

    public Integer getProjectedLoyaltyPoints() {
        return projectedPoints;
    }

    public Integer getAwardedLoyaltyPoints() {
        return awardedPoints;
    }
}
