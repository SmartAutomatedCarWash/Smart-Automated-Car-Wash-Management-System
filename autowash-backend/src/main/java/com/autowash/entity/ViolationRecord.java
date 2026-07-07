package com.autowash.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "violation_records")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ViolationRecord {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Column(nullable = false, length = 30)
    private String type;

    @Column(name = "penalty_points", nullable = false)
    private int penaltyPoints;

    @Column(length = 500)
    private String note;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public ViolationRecord(User customer, Booking booking, String type, int penaltyPoints, String note) {
        this.id = UUID.randomUUID();
        this.customer = customer;
        this.booking = booking;
        this.type = type;
        this.penaltyPoints = penaltyPoints;
        this.note = note;
        this.createdAt = Instant.now();
    }
}
