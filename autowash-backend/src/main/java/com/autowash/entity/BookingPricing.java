package com.autowash.entity;

import com.autowash.entity.enums.BookingDiscountType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "booking_pricing")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class BookingPricing {

    @Id
    private UUID bookingId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @Column(nullable = false)
    @Builder.Default
    private long subtotal = 0;

    @Column(name = "estimated_duration_minutes", nullable = false)
    @Builder.Default
    private int estimatedDurationMinutes = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", length = 20)
    private BookingDiscountType discountType;

    @Column(name = "discount_ref_id")
    private UUID discountRefId;

    @Column(name = "discount_ref_snapshot", length = 255)
    private String discountRefSnapshot;

    @Column(name = "discount_amount", nullable = false)
    @Builder.Default
    private long discountAmount = 0;

    @Column(name = "final_amount", nullable = false)
    @Builder.Default
    private long finalAmount = 0;

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
