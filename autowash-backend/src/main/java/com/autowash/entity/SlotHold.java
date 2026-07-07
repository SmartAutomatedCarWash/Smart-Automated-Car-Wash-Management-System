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
@Table(name = "slot_holds")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SlotHold {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @Column(name = "slot_time", nullable = false)
    private Instant slotTime;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public SlotHold(User customer, Instant slotTime, Instant expiresAt) {
        this.id = UUID.randomUUID();
        this.customer = customer;
        this.slotTime = slotTime;
        this.expiresAt = expiresAt;
        this.createdAt = Instant.now();
    }
}
