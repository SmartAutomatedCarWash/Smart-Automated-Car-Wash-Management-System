package com.autowash.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "voucher_applicable_services")
@IdClass(VoucherApplicableService.VoucherApplicableServiceId.class)
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class VoucherApplicableService {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "voucher_template_id", nullable = false)
    private VoucherTemplate voucherTemplate;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id", nullable = false)
    private Service service;

    public VoucherApplicableService(VoucherTemplate voucherTemplate, Service service) {
        this.voucherTemplate = voucherTemplate;
        this.service = service;
    }

    @Getter
    @NoArgsConstructor
    @EqualsAndHashCode
    public static class VoucherApplicableServiceId implements Serializable {
        private UUID voucherTemplate;
        private UUID service;
    }
}
