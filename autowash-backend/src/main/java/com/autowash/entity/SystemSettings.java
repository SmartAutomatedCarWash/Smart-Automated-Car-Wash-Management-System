package com.autowash.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "system_settings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SystemSettings {

    @Id
    private int id = 1;

    @Column(name = "operating_start_time", nullable = false, length = 5)
    private String operatingStartTime = "08:00";

    @Column(name = "operating_end_time", nullable = false, length = 5)
    private String operatingEndTime = "20:00";

    @Column(name = "max_advance_booking_days", nullable = false)
    private int maxAdvanceBookingDays = 30;

    @Column(name = "no_show_grace_minutes", nullable = false)
    private int noShowGraceMinutes = 15;

    @Column(name = "max_bookings_per_time_slot", nullable = false)
    private int maxBookingsPerTimeSlot = 3;

    @Column(nullable = false, length = 10)
    private String currency = "VND";

    @Column(name = "earn_points_unit_amount", nullable = false)
    private int earnPointsUnitAmount = 10_000;

    @Column(name = "vnd_per_point", nullable = false)
    private int vndPerPoint = 1_000;

    @Column(name = "min_redemption_points", nullable = false)
    private int minRedemptionPoints = 50;

    @Column(name = "max_redemption_points", nullable = false)
    private int maxRedemptionPoints = 200;


    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public void update(
            String operatingStartTime,
            String operatingEndTime,
            int maxAdvanceBookingDays,
            int noShowGraceMinutes,
            int maxBookingsPerTimeSlot,
            String currency,
            int earnPointsUnitAmount,
            int vndPerPoint,
            int minRedemptionPoints,
            int maxRedemptionPoints
    ) {
        this.operatingStartTime = operatingStartTime;
        this.operatingEndTime = operatingEndTime;
        this.maxAdvanceBookingDays = maxAdvanceBookingDays;
        this.noShowGraceMinutes = noShowGraceMinutes;
        this.maxBookingsPerTimeSlot = maxBookingsPerTimeSlot;
        this.currency = currency;
        this.earnPointsUnitAmount = earnPointsUnitAmount;
        this.vndPerPoint = vndPerPoint;
        this.minRedemptionPoints = minRedemptionPoints;
        this.maxRedemptionPoints = maxRedemptionPoints;
        this.updatedAt = Instant.now();
    }
}
