package com.autowash.repository;

import com.autowash.entity.VoucherApplicableService;
import com.autowash.entity.VoucherApplicableService.VoucherApplicableServiceId;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VoucherApplicableServiceRepository extends JpaRepository<VoucherApplicableService, VoucherApplicableServiceId> {

    List<VoucherApplicableService> findAllByVoucherTemplateId(UUID voucherTemplateId);

    @Modifying
    @Query("DELETE FROM VoucherApplicableService v WHERE v.voucherTemplate.id = :voucherTemplateId")
    void deleteAllByVoucherTemplateId(@Param("voucherTemplateId") UUID voucherTemplateId);
}
