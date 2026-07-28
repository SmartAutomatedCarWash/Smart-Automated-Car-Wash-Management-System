package com.autowash.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "manager_operation_settings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ManagerOperationSettings {

    @Id
    private int id = 1;

    @Column(name = "auto_assign_enabled", nullable = false)
    private boolean autoAssignEnabled = true;

    @Column(name = "least_busy_staff_first", nullable = false)
    private boolean leastBusyStaffFirst = true;

    @Column(name = "respect_staff_capacity", nullable = false)
    private boolean respectStaffCapacity = true;

    @Column(name = "max_active_sessions_per_staff", nullable = false)
    private int maxActiveSessionsPerStaff = 4;

    @Column(name = "weekly_staff_kpi_target", nullable = false)
    private int weeklyStaffKpiTarget = 40;

    @Column(name = "paid_booking_priority", nullable = false)
    private boolean paidBookingPriority = true;

    @Column(name = "tier_priority_enabled", nullable = false)
    private boolean tierPriorityEnabled = true;

    @Column(name = "primary_vehicle_priority", nullable = false)
    private boolean primaryVehiclePriority = true;

    @Column(name = "early_check_in_minutes", nullable = false)
    private int earlyCheckInMinutes = 15;

    @Column(name = "late_grace_minutes", nullable = false)
    private int lateGraceMinutes = 20;

    @Column(name = "waiting_alert_minutes", nullable = false)
    private int waitingAlertMinutes = 12;

    @Column(name = "delay_alert_minutes", nullable = false)
    private int delayAlertMinutes = 25;

    @Column(name = "overload_alert_sessions", nullable = false)
    private int overloadAlertSessions = 4;

    @Column(name = "cancellation_rate_alert", nullable = false)
    private int cancellationRateAlert = 18;

    @Column(name = "notify_new_booking", nullable = false)
    private boolean notifyNewBooking = true;

    @Column(name = "notify_delayed_session", nullable = false)
    private boolean notifyDelayedSession = true;

    @Column(name = "notify_staff_transfer", nullable = false)
    private boolean notifyStaffTransfer = true;

    @Column(name = "notify_completion", nullable = false)
    private boolean notifyCompletion = false;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public static ManagerOperationSettings createDefault() {
        return new ManagerOperationSettings();
    }

    public void update(
            boolean autoAssignEnabled,
            boolean leastBusyStaffFirst,
            boolean respectStaffCapacity,
            int maxActiveSessionsPerStaff,
            int weeklyStaffKpiTarget,
            boolean paidBookingPriority,
            boolean tierPriorityEnabled,
            boolean primaryVehiclePriority,
            int earlyCheckInMinutes,
            int lateGraceMinutes,
            int waitingAlertMinutes,
            int delayAlertMinutes,
            int overloadAlertSessions,
            int cancellationRateAlert,
            boolean notifyNewBooking,
            boolean notifyDelayedSession,
            boolean notifyStaffTransfer,
            boolean notifyCompletion
    ) {
        this.autoAssignEnabled = autoAssignEnabled;
        this.leastBusyStaffFirst = leastBusyStaffFirst;
        this.respectStaffCapacity = respectStaffCapacity;
        this.maxActiveSessionsPerStaff = maxActiveSessionsPerStaff;
        this.weeklyStaffKpiTarget = weeklyStaffKpiTarget;
        this.paidBookingPriority = paidBookingPriority;
        this.tierPriorityEnabled = tierPriorityEnabled;
        this.primaryVehiclePriority = primaryVehiclePriority;
        this.earlyCheckInMinutes = earlyCheckInMinutes;
        this.lateGraceMinutes = lateGraceMinutes;
        this.waitingAlertMinutes = waitingAlertMinutes;
        this.delayAlertMinutes = delayAlertMinutes;
        this.overloadAlertSessions = overloadAlertSessions;
        this.cancellationRateAlert = cancellationRateAlert;
        this.notifyNewBooking = notifyNewBooking;
        this.notifyDelayedSession = notifyDelayedSession;
        this.notifyStaffTransfer = notifyStaffTransfer;
        this.notifyCompletion = notifyCompletion;
        this.updatedAt = Instant.now();
    }
}
