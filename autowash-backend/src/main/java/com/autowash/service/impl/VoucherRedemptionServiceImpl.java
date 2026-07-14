package com.autowash.service.impl;

import com.autowash.entity.Booking;
import com.autowash.entity.LoyaltyAccount;
import com.autowash.entity.User;
import com.autowash.entity.UserVoucher;
import com.autowash.entity.VoucherApplicableService;
import com.autowash.entity.VoucherTemplate;
import com.autowash.entity.VoucherTier;
import com.autowash.entity.enums.ActiveStatus;
import com.autowash.entity.enums.DiscountType;
import com.autowash.entity.enums.UserStatus;
import com.autowash.entity.enums.UserVoucherStatus;
import com.autowash.repository.BookingRepository;
import com.autowash.repository.LoyaltyAccountRepository;
import com.autowash.repository.UserRepository;
import com.autowash.repository.UserVoucherRepository;
import com.autowash.repository.VoucherApplicableServiceRepository;
import com.autowash.repository.VoucherTemplateRepository;
import com.autowash.repository.VoucherTierRepository;
import com.autowash.service.LoyaltyService;
import com.autowash.service.VoucherRedemptionService;
import com.autowash.shared.exception.ApiException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VoucherRedemptionServiceImpl implements VoucherRedemptionService {

    private final UserVoucherRepository userVoucherRepository;
    private final VoucherTemplateRepository voucherTemplateRepository;
    private final VoucherTierRepository voucherTierRepository;
    private final VoucherApplicableServiceRepository voucherApplicableServiceRepository;
    private final UserRepository userRepository;
    private final LoyaltyAccountRepository loyaltyAccountRepository;
    private final LoyaltyService loyaltyService;
    private final BookingRepository bookingRepository;

    public VoucherRedemptionServiceImpl(
            UserVoucherRepository userVoucherRepository,
            VoucherTemplateRepository voucherTemplateRepository,
            VoucherTierRepository voucherTierRepository,
            VoucherApplicableServiceRepository voucherApplicableServiceRepository,
            UserRepository userRepository,
            LoyaltyAccountRepository loyaltyAccountRepository,
            LoyaltyService loyaltyService,
            BookingRepository bookingRepository
    ) {
        this.userVoucherRepository = userVoucherRepository;
        this.voucherTemplateRepository = voucherTemplateRepository;
        this.voucherTierRepository = voucherTierRepository;
        this.voucherApplicableServiceRepository = voucherApplicableServiceRepository;
        this.userRepository = userRepository;
        this.loyaltyAccountRepository = loyaltyAccountRepository;
        this.loyaltyService = loyaltyService;
        this.bookingRepository = bookingRepository;
    }

    @Override
    @Transactional
    public UserVoucher redeemVoucher(UUID userId, UUID voucherTemplateId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found", "USER_NOT_FOUND"));
        if (user.getStatus() == UserStatus.BLOCKED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Blocked accounts cannot redeem vouchers", "ACCOUNT_BLOCKED");
        }

        VoucherTemplate template = voucherTemplateRepository.findLockedById(voucherTemplateId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Voucher template not found", "RESOURCE_NOT_FOUND"));

        if (template.getStatus() != ActiveStatus.ACTIVE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Voucher is not active", "VOUCHER_INACTIVE");
        }

        Instant now = Instant.now();
        if (now.isBefore(template.getStartAt()) || now.isAfter(template.getEndAt())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Voucher is not within claimable period", "VOUCHER_EXPIRED");
        }

        if (template.isUsageLimitReached()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Voucher usage limit reached", "VOUCHER_LIMIT_REACHED");
        }

        if (template.isNewCustomerOnly() && bookingRepository.countByCustomer(user) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Voucher is for new customers only", "VOUCHER_NEW_CUSTOMER_ONLY");
        }

        LoyaltyAccount loyaltyAccount = loyaltyAccountRepository.findByCustomerId(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Loyalty account not found", "LOYALTY_ACCOUNT_NOT_FOUND"));

        List<VoucherTier> requiredTiers = voucherTierRepository.findByVoucherId(template.getId());
        if (!requiredTiers.isEmpty()) {
            boolean hasTier = requiredTiers.stream().anyMatch(vt -> vt.getTier().equals(loyaltyAccount.getTier()));
            if (!hasTier) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Your tier is not eligible for this voucher", "TIER_NOT_ELIGIBLE");
            }
        }

        if (loyaltyAccount.getCurrentPoints() < template.getRequiredPoints()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Insufficient points", "INSUFFICIENT_POINTS");
        }

        if (template.getRequiredPoints() > 0) {
            loyaltyService.redeemPoints(userId, template.getRequiredPoints(), template.getCode());
        }

        template.recordUse();
        voucherTemplateRepository.save(template);

        Instant expiredAt = now.plus(template.getValidDaysAfterClaim(), ChronoUnit.DAYS);
        UserVoucher userVoucher = new UserVoucher(user, template, expiredAt);
        return userVoucherRepository.save(userVoucher);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserVoucher> getApplicableVouchers(UUID userId, long totalAmount, List<UUID> serviceIds) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return List.of();
        List<UserVoucher> availableVouchers = userVoucherRepository.findByUserIdAndStatusAndExpiredAtAfter(
                userId, UserVoucherStatus.AVAILABLE, Instant.now());
        
        LoyaltyAccount loyaltyAccount = loyaltyAccountRepository.findByCustomerId(userId).orElse(null);
        String userTier = loyaltyAccount != null ? loyaltyAccount.getTier() : null;
        
        return availableVouchers.stream()
                .filter(uv -> isVoucherApplicable(uv.getVoucherTemplate(), user, userTier, totalAmount, serviceIds, false))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public long calculateDiscount(UUID userVoucherId, long totalAmount, List<UUID> serviceIds) {
        UserVoucher userVoucher = userVoucherRepository.findById(userVoucherId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User voucher not found", "RESOURCE_NOT_FOUND"));

        if (userVoucher.getStatus() == UserVoucherStatus.USED) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "You have already used this voucher", "VOUCHER_ALREADY_USED");
        }

        if (userVoucher.getStatus() != UserVoucherStatus.AVAILABLE || userVoucher.getExpiredAt().isBefore(Instant.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Voucher is not available or expired", "VOUCHER_UNAVAILABLE");
        }

        if (userVoucher.getVoucherTemplate().isNewCustomerOnly() && bookingRepository.countByCustomer(userVoucher.getUser()) > 0) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Voucher is for new customers only", "NEW_CUSTOMER_ONLY");
        }

        LoyaltyAccount loyaltyAccount = loyaltyAccountRepository.findByCustomerId(userVoucher.getUser().getId()).orElse(null);
        String userTier = loyaltyAccount != null ? loyaltyAccount.getTier() : null;

        if (!isVoucherApplicable(userVoucher.getVoucherTemplate(), userVoucher.getUser(), userTier, totalAmount, serviceIds, false)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Voucher is not applicable for this order", "VOUCHER_NOT_APPLICABLE");
        }

        return calculateDiscountAmount(userVoucher.getVoucherTemplate(), totalAmount, serviceIds);
    }

    @Override
    @Transactional
    public long applyVoucher(UUID userVoucherId, UUID bookingId, long totalAmount, List<UUID> serviceIds) {
        UserVoucher userVoucher = userVoucherRepository.findById(userVoucherId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User voucher not found", "RESOURCE_NOT_FOUND"));

        if (userVoucher.getStatus() == UserVoucherStatus.USED) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "You have already used this voucher", "VOUCHER_ALREADY_USED");
        }

        if (userVoucher.getStatus() != UserVoucherStatus.AVAILABLE || userVoucher.getExpiredAt().isBefore(Instant.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Voucher is not available or expired", "VOUCHER_UNAVAILABLE");
        }

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Booking not found", "RESOURCE_NOT_FOUND"));

        if (!booking.getCustomer().getId().equals(userVoucher.getUser().getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Voucher does not belong to booking customer", "VOUCHER_OWNER_MISMATCH");
        }

        if (userVoucher.getVoucherTemplate().isNewCustomerOnly()) {
            long bookingCount = bookingRepository.countByCustomer(userVoucher.getUser());
            // If the booking is already saved, the count includes it. So if count > 1, they are not a new customer.
            if (bookingCount > 1) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Voucher is for new customers only", "NEW_CUSTOMER_ONLY");
            }
        }

        LoyaltyAccount loyaltyAccount = loyaltyAccountRepository.findByCustomerId(userVoucher.getUser().getId()).orElse(null);
        String userTier = loyaltyAccount != null ? loyaltyAccount.getTier() : null;

        if (!isVoucherApplicable(userVoucher.getVoucherTemplate(), userVoucher.getUser(), userTier, totalAmount, serviceIds, true)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Voucher is not applicable for this order", "VOUCHER_NOT_APPLICABLE");
        }

        long discountAmount = calculateDiscountAmount(userVoucher.getVoucherTemplate(), totalAmount, serviceIds);
        
        userVoucher.markAsUsed(booking);
        userVoucherRepository.save(userVoucher);
        
        return discountAmount;
    }

    @Override
    @Transactional
    public void releaseVoucher(UUID userVoucherId) {
        UserVoucher userVoucher = userVoucherRepository.findById(userVoucherId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User voucher not found", "RESOURCE_NOT_FOUND"));
        
        if (userVoucher.getStatus() == UserVoucherStatus.USED) {
            userVoucher.release();
            userVoucherRepository.save(userVoucher);
        }
    }

    @Override
    @Transactional
    public void releaseVoucherForBooking(UUID bookingId) {
        userVoucherRepository.findByBookingId(bookingId).ifPresent(uv -> {
            if (uv.getStatus() == UserVoucherStatus.USED) {
                uv.release();
                userVoucherRepository.save(uv);
            }
        });
    }

    @Override
    @Transactional
    public void forfeitVoucherForBooking(UUID bookingId) {
        userVoucherRepository.findByBookingId(bookingId).ifPresent(uv -> {
            if (uv.getStatus() == UserVoucherStatus.USED) {
                uv.forfeit();
                userVoucherRepository.save(uv);
            }
        });
    }

    @Override
    @Transactional(readOnly = true)
    public UUID getTemplateIdForUserVoucher(UUID userVoucherId) {
        UserVoucher userVoucher = userVoucherRepository.findById(userVoucherId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User voucher not found", "RESOURCE_NOT_FOUND"));
        return userVoucher.getVoucherTemplate().getId();
    }

    @Override
    @Transactional(readOnly = true)
    public UserVoucher getUserVoucherByCode(UUID userId, String voucherCode) {
        List<UserVoucher> availableVouchers = userVoucherRepository.findByUserIdAndStatusAndExpiredAtAfter(
                userId, UserVoucherStatus.AVAILABLE, Instant.now());
        return availableVouchers.stream()
                .filter(uv -> uv.getVoucherTemplate().getCode().equals(voucherCode))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Voucher not found or not available", "RESOURCE_NOT_FOUND"));
    }

    private boolean isVoucherApplicable(VoucherTemplate template, User user, String userTier, long totalAmount, List<UUID> serviceIds, boolean skipNewCustomerCheck) {
        if (template.getStatus() != ActiveStatus.ACTIVE) {
            return false;
        }

        if (!skipNewCustomerCheck && template.isNewCustomerOnly() && bookingRepository.countByCustomer(user) > 0) {
            return false;
        }

        if (totalAmount < template.getMinOrderAmount()) {
            return false;
        }

        List<VoucherTier> requiredTiers = voucherTierRepository.findByVoucherId(template.getId());
        if (!requiredTiers.isEmpty() && userTier != null) {
            boolean hasTier = requiredTiers.stream().anyMatch(vt -> vt.getTier().equals(userTier));
            if (!hasTier) return false;
        }

        List<VoucherApplicableService> applicableServices = voucherApplicableServiceRepository.findAllByVoucherTemplateId(template.getId());
        if (!applicableServices.isEmpty()) {
            boolean hasApplicableService = applicableServices.stream()
                    .anyMatch(vas -> serviceIds.contains(vas.getService().getId()));
            if (!hasApplicableService) return false;
        }

        return true;
    }
    
    private long calculateDiscountAmount(VoucherTemplate template, long totalAmount, List<UUID> serviceIds) {
        if (template.getDiscountType() == DiscountType.FIXED_AMOUNT) {
            return Math.min(totalAmount, template.getDiscountValue());
        } else if (template.getDiscountType() == DiscountType.PERCENT) {
            long discount = (long) (totalAmount * (template.getDiscountValue() / 100.0));
            if (template.getMaxDiscountAmount() != null && template.getMaxDiscountAmount() > 0) {
                discount = Math.min(discount, template.getMaxDiscountAmount());
            }
            return discount;
        } else if (template.getDiscountType() == DiscountType.FREE_SERVICE) {
            List<VoucherApplicableService> applicableServices = voucherApplicableServiceRepository.findAllByVoucherTemplateId(template.getId());
            long maxServicePrice = 0;
            for (VoucherApplicableService vas : applicableServices) {
                if (serviceIds.contains(vas.getService().getId())) {
                    maxServicePrice = Math.max(maxServicePrice, vas.getService().getPrice());
                }
            }
            return Math.min(totalAmount, maxServicePrice);
        }
        return 0;
    }
}
