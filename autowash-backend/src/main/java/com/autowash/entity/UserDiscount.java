package com.autowash.entity;

import com.autowash.entity.enums.DiscountAcquisitionMethod;
import com.autowash.entity.enums.UserDiscountStatus;
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
import lombok.Setter;

@Entity
@Table(name = "user_discounts")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class UserDiscount {

    @Id
    @Builder.Default
    private UUID id = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "discount_id", nullable = false)
    private Discount discount;

    @Column(name = "voucher_code", unique = true, length = 50)
    private String voucherCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "acquisition_method", nullable = false, length = 20)
    private DiscountAcquisitionMethod acquisitionMethod;

    @Column(name = "points_spent", nullable = false)
    @Builder.Default
    private int pointsSpent = 0;

    @Column(name = "claimed_at", nullable = false)
    @Builder.Default
    private Instant claimedAt = Instant.now();

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private UserDiscountStatus status = UserDiscountStatus.AVAILABLE;

    @Column(name = "used_at")
    private Instant usedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "used_in_booking_id")
    private Booking usedInBooking;

    public void expire() {
        if (this.status == UserDiscountStatus.AVAILABLE) {
            this.status = UserDiscountStatus.EXPIRED;
        }
    }

    public void markAsUsed(Booking booking) {
        this.status = UserDiscountStatus.USED;
        this.usedAt = Instant.now();
        this.usedInBooking = booking;
    }

    public void release() {
        if (this.status == UserDiscountStatus.USED) {
            this.status = UserDiscountStatus.AVAILABLE;
            this.usedAt = null;
            this.usedInBooking = null;
        }
    }
}
