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
@Table(name = "wash_session_staff_assignments")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WashSessionStaffAssignment {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private WashSession session;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "staff_id", nullable = false)
    private User staff;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "assigned_at", nullable = false)
    private Instant assignedAt;

    public WashSessionStaffAssignment(WashSession session, User staff, int sortOrder) {
        this.id = UUID.randomUUID();
        this.session = session;
        this.staff = staff;
        this.sortOrder = sortOrder;
        this.assignedAt = Instant.now();
    }
}
