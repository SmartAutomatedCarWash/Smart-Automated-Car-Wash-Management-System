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
@Table(name = "booking_staff_assignments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BookingStaffAssignment {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "staff_id", nullable = false)
    private User staff;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "assigned_at", nullable = false)
    private Instant assignedAt;

    public BookingStaffAssignment(Booking booking, User staff, int sortOrder) {
        this.id = UUID.randomUUID();
        this.booking = booking;
        this.staff = staff;
        this.sortOrder = sortOrder;
        this.assignedAt = Instant.now();
    }
}
