package com.autowash.service.impl;

import com.autowash.entity.BookingDetail;

import com.autowash.shared.exception.ApiException;
import com.autowash.shared.exception.ErrorCode;

import com.autowash.entity.Booking;
import com.autowash.entity.BookingPricing;
import com.autowash.entity.Discount;
import com.autowash.entity.DiscountApplicableService;
import com.autowash.entity.UserDiscount;
import com.autowash.entity.enums.BookingItemType;
import com.autowash.entity.enums.BookingDiscountType;
import com.autowash.entity.enums.DiscountType;
import com.autowash.entity.enums.UserDiscountStatus;
import org.springframework.http.HttpStatus;
import com.autowash.repository.BookingPricingRepository;
import com.autowash.repository.ComboServiceRepository;
import com.autowash.repository.DiscountApplicableServiceRepository;
import com.autowash.repository.DiscountRepository;
import com.autowash.repository.PackageServiceRepository;
import com.autowash.repository.UserDiscountRepository;
import com.autowash.service.DiscountRedemptionService;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DiscountRedemptionServiceImpl implements DiscountRedemptionService {

    private final DiscountRepository discountRepository;
    private final UserDiscountRepository userDiscountRepository;
    private final DiscountApplicableServiceRepository discountApplicableServiceRepository;
    private final BookingPricingRepository bookingPricingRepository;
    private final PackageServiceRepository packageServiceRepository;
    private final ComboServiceRepository comboServiceRepository;

    @Override
    public long calculateDiscountAmount(Booking booking, Discount discount) {
        BookingPricing pricing = booking.getPricing();
        long subtotal = pricing.getSubtotal();
        
        if (discount.getMinOrderAmount() > 0 && subtotal < discount.getMinOrderAmount()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Order amount does not meet minimum requirement for this discount", ErrorCode.INVALID_INPUT);
        }
        
        List<DiscountApplicableService> applicableServices = discountApplicableServiceRepository.findByDiscountId(discount.getId());
        
        long applicableSubtotal = 0;
        if (applicableServices.isEmpty()) {
            applicableSubtotal = subtotal; // Applicable to all
        } else {
            List<UUID> validServiceIds = applicableServices.stream()
                    .map(das -> das.getService().getId())
                    .toList();
            Set<UUID> validServiceIdSet = Set.copyOf(validServiceIds);
            for (BookingDetail detail : booking.getDetails()) {
                if (isApplicableDetail(detail, validServiceIdSet)) {
                    applicableSubtotal += detail.getSubtotal();
                }
            }
            if (applicableSubtotal == 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Discount does not apply to any selected services", ErrorCode.INVALID_INPUT);
            }
        }
        
        long calculatedDiscount = 0;
        if (discount.getDiscountType() == DiscountType.FIXED_AMOUNT) {
            calculatedDiscount = discount.getDiscountValue();
        } else if (discount.getDiscountType() == DiscountType.PERCENT) {
            calculatedDiscount = (applicableSubtotal * discount.getDiscountValue()) / 100;
        }
        
        if (discount.getMaxDiscountAmount() != null && discount.getMaxDiscountAmount() > 0) {
            calculatedDiscount = Math.min(calculatedDiscount, discount.getMaxDiscountAmount());
        }
        
        // Cannot discount more than applicable subtotal
        return Math.min(calculatedDiscount, applicableSubtotal);
    }

    private boolean isApplicableDetail(BookingDetail detail, Set<UUID> validServiceIds) {
        if (detail.getItemType() == BookingItemType.ADDON) {
            return validServiceIds.contains(detail.getRefId());
        }
        if (detail.getItemType() == BookingItemType.PACKAGE) {
            return packageServiceRepository.findByPackageIdOrderBySortOrderAsc(detail.getRefId())
                    .stream()
                    .anyMatch(service -> validServiceIds.contains(service.getOptionId()));
        }
        if (detail.getItemType() == BookingItemType.COMBO) {
            return comboServiceRepository.findByComboIdOrderBySortOrderAsc(detail.getRefId())
                    .stream()
                    .anyMatch(service -> validServiceIds.contains(service.getOptionId()));
        }
        return false;
    }

    @Override
    @Transactional
    public void redeemDiscount(Booking booking, Discount discount) {
        Discount lockedDiscount = discountRepository.findByIdWithLock(discount.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Discount not found", ErrorCode.INVALID_INPUT));
                
        if (lockedDiscount.getUsageLimit() != null && lockedDiscount.getUsedCount() >= lockedDiscount.getUsageLimit()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Discount usage limit reached", ErrorCode.INVALID_INPUT);
        }
        
        long amount = calculateDiscountAmount(booking, lockedDiscount);
        
        lockedDiscount.setUsedCount(lockedDiscount.getUsedCount() + 1);
        discountRepository.save(lockedDiscount);
        
        BookingPricing pricing = booking.getPricing();
        pricing.setDiscountType(BookingDiscountType.valueOf(lockedDiscount.getType().name()));
        pricing.setDiscountRefId(lockedDiscount.getId());
        pricing.setDiscountRefSnapshot(lockedDiscount.getName());
        pricing.setDiscountAmount(amount);
        pricing.setFinalAmount(Math.max(0, pricing.getSubtotal() - amount));
        bookingPricingRepository.save(pricing);
    }

    @Override
    @Transactional
    public void redeemUserDiscount(Booking booking, UserDiscount userDiscount) {
        if (userDiscount.getStatus() != UserDiscountStatus.AVAILABLE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "User discount is not available", ErrorCode.INVALID_INPUT);
        }
        if (userDiscount.getExpiresAt() != null && userDiscount.getExpiresAt().isBefore(Instant.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "User discount has expired", ErrorCode.INVALID_INPUT);
        }
        
        Discount discount = userDiscount.getDiscount();
        long amount = calculateDiscountAmount(booking, discount);
        
        userDiscount.markAsUsed(booking);
        userDiscountRepository.save(userDiscount);
        
        BookingPricing pricing = booking.getPricing();
        pricing.setDiscountType(BookingDiscountType.valueOf(discount.getType().name()));
        pricing.setDiscountRefId(discount.getId());
        pricing.setDiscountRefSnapshot(discount.getName());
        pricing.setDiscountAmount(amount);
        pricing.setFinalAmount(Math.max(0, pricing.getSubtotal() - amount));
        bookingPricingRepository.save(pricing);
    }

    @Override
    @Transactional
    public void revertRedemption(Booking booking) {
        BookingPricing pricing = booking.getPricing();
        if (pricing == null || pricing.getDiscountType() == null) {
            return;
        }
        
        UserDiscount usedDiscount = userDiscountRepository.findByUsedInBookingId(booking.getId()).orElse(null);
        if (usedDiscount != null) {
            usedDiscount.release();
            userDiscountRepository.save(usedDiscount);
        } else if (pricing.getDiscountType() != null) {
            Discount discount = discountRepository.findByIdWithLock(pricing.getDiscountRefId())
                    .orElse(null);
            if (discount != null) {
                discount.setUsedCount(Math.max(0, discount.getUsedCount() - 1));
                discountRepository.save(discount);
            }
        }
        
        pricing.setDiscountType(null);
        pricing.setDiscountRefId(null);
        pricing.setDiscountRefSnapshot(null);
        pricing.setDiscountAmount(0);
        pricing.setFinalAmount(pricing.getSubtotal());
        bookingPricingRepository.save(pricing);
    }
}
