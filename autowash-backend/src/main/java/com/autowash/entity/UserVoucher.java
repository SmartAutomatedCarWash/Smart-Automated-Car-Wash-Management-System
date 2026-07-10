package com.autowash.entity;

import com.autowash.entity.enums.UserVoucherStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "user_vouchers")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserVoucher {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "voucher_template_id", nullable = false)
    private VoucherTemplate voucherTemplate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserVoucherStatus status;

    @Column(name = "issued_at", nullable = false)
    private Instant issuedAt;

    @Column(name = "expired_at", nullable = false)
    private Instant expiredAt;

    @Column(name = "used_at")
    private Instant usedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
    }

    public UserVoucher(User user, VoucherTemplate voucherTemplate, Instant expiredAt) {
        this.user = user;
        this.voucherTemplate = voucherTemplate;
        this.status = UserVoucherStatus.AVAILABLE;
        this.issuedAt = Instant.now();
        this.expiredAt = expiredAt;
    }

    public void markAsUsed(Booking booking) {
        this.status = UserVoucherStatus.USED;
        this.usedAt = Instant.now();
        this.booking = booking;
    }

    public void release() {
        this.status = UserVoucherStatus.AVAILABLE;
        this.usedAt = null;
        this.booking = null;
    }

    public void forfeit() {
        this.status = UserVoucherStatus.FORFEITED;
        this.usedAt = Instant.now();
    }

    public void expire() {
        if (this.status == UserVoucherStatus.AVAILABLE) {
            this.status = UserVoucherStatus.EXPIRED;
        }
    }
}
