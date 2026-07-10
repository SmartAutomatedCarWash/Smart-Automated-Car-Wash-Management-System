package com.autowash.service;

import com.autowash.entity.UserVoucher;
import java.util.List;
import java.util.UUID;

public interface VoucherRedemptionService {
    
    UserVoucher redeemVoucher(UUID userId, UUID voucherTemplateId);
    
    List<UserVoucher> getApplicableVouchers(UUID userId, long totalAmount, List<UUID> serviceIds);
    
    long calculateDiscount(UUID userVoucherId, long totalAmount, List<UUID> serviceIds);
    
    long applyVoucher(UUID userVoucherId, UUID bookingId, long totalAmount, List<UUID> serviceIds);
    
    void releaseVoucher(UUID userVoucherId);
    void releaseVoucherForBooking(UUID bookingId);
    void forfeitVoucherForBooking(UUID bookingId);
    
    UUID getTemplateIdForUserVoucher(UUID userVoucherId);
    
    UserVoucher getUserVoucherByCode(UUID userId, String voucherCode);
}
