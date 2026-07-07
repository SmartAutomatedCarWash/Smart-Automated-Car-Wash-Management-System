package com.autowash.entity;

import com.autowash.entity.enums.LoyaltyTier;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import jakarta.persistence.Column;
import java.io.Serializable;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
@Entity
@Table(name = "voucher_tiers")
@IdClass(VoucherTier.VoucherTierId.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class VoucherTier {

    @Id
    @Column(name = "voucher_template_id")
    private UUID voucherId;

    @Id
    @Column(length = 50)
    private String tier;

    public VoucherTier(UUID voucherId, LoyaltyTier tier) {
        this(voucherId, tier.name());
    }

    public VoucherTier(UUID voucherId, String tier) {
        this.voucherId = voucherId;
        this.tier = tier;
    }

    @Getter
    @NoArgsConstructor
    public static class VoucherTierId implements Serializable {
        private UUID voucherId;
        private String tier;
    }
}
