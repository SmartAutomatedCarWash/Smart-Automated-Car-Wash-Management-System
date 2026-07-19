package com.autowash.entity;

import jakarta.persistence.OneToOne;

import jakarta.persistence.JoinColumn;

import jakarta.persistence.FetchType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "customer_combo_usages")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CustomerComboUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_combo_id", nullable = false)
    private CustomerCombo customerCombo;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false, unique = true)
    private Booking booking;

    @Column(name = "used_at", nullable = false)
    private Instant usedAt;

    public CustomerComboUsage(CustomerCombo customerCombo, Booking booking) {
        this.customerCombo = customerCombo;
        this.booking = booking;
        this.usedAt = Instant.now();
    }
}
