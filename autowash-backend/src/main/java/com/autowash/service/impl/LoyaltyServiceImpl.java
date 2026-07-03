package com.autowash.service.impl;

import com.autowash.service.*;
import com.autowash.entity.User;
import com.autowash.entity.BookingPromotion;
import com.autowash.entity.enums.LoyaltyTier;
import com.autowash.entity.enums.ActiveStatus;
import com.autowash.repository.UserRepository;
import com.autowash.entity.enums.DiscountType;
import com.autowash.entity.Voucher;
import com.autowash.repository.VoucherRepository;
import com.autowash.dto.EarnPointsResponse;
import com.autowash.dto.LoyaltyAccountResponse;
import com.autowash.dto.PointTransactionResponse;
import com.autowash.dto.RedeemPointsResponse;
import com.autowash.entity.LoyaltyAccount;
import com.autowash.entity.Booking;
import com.autowash.entity.PointTransaction;
import com.autowash.entity.TierHistory;
import com.autowash.entity.enums.PointTransactionType;
import com.autowash.repository.LoyaltyAccountRepository;
import com.autowash.repository.BookingPromotionRepository;
import com.autowash.repository.PointTransactionRepository;
import com.autowash.repository.TierHistoryRepository;
import com.autowash.entity.WashSession;
import com.autowash.entity.enums.WashSessionStatus;
import com.autowash.repository.WashSessionRepository;
import com.autowash.shared.dto.PaginationMeta;
import com.autowash.shared.exception.ApiException;
import java.time.Instant;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@SuppressWarnings("null")
public class LoyaltyServiceImpl implements LoyaltyService {

    private static final Logger log = LoggerFactory.getLogger(LoyaltyService.class);

    private final UserRepository UserRepository;
    private final WashSessionRepository washSessionRepository;
    private final LoyaltyAccountRepository loyaltyAccountRepository;
    private final BookingPromotionRepository bookingPromotionRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final TierHistoryRepository tierHistoryRepository;
    private final VoucherRepository voucherRepository;
    private final TierConfigService tierConfigService;
    private final com.autowash.repository.SystemSettingsRepository systemSettingsRepository;
    private final com.autowash.repository.NotificationRepository notificationRepository;

    public LoyaltyServiceImpl(
            UserRepository UserRepository,
            WashSessionRepository washSessionRepository,
            LoyaltyAccountRepository loyaltyAccountRepository,
            BookingPromotionRepository bookingPromotionRepository,
            PointTransactionRepository pointTransactionRepository,
            TierHistoryRepository tierHistoryRepository,
            VoucherRepository voucherRepository,
            TierConfigService tierConfigService,
            com.autowash.repository.SystemSettingsRepository systemSettingsRepository,
            com.autowash.repository.NotificationRepository notificationRepository
    ) {
        this.UserRepository = UserRepository;
        this.washSessionRepository = washSessionRepository;
        this.loyaltyAccountRepository = loyaltyAccountRepository;
        this.bookingPromotionRepository = bookingPromotionRepository;
        this.pointTransactionRepository = pointTransactionRepository;
        this.tierHistoryRepository = tierHistoryRepository;
        this.voucherRepository = voucherRepository;
        this.tierConfigService = tierConfigService;
        this.systemSettingsRepository = systemSettingsRepository;
        this.notificationRepository = notificationRepository;
    }

    @Transactional
    public LoyaltyAccountResponse getAccount(UUID customerId) {
        LoyaltyAccount account = getOrCreateAccount(requireCustomer(customerId));
        return toAccountResponse(account);
    }

    @Transactional(readOnly = true)
    public int calculateEarnPoints(UUID sessionId) {
        WashSession session = requireSession(sessionId);
        LoyaltyAccount account = loyaltyAccountRepository.findByCustomerId(session.getBooking().getCustomer().getId())
                .orElse(null);
        String tier = account == null ? TierConfigService.BRONZE : account.getTier();
        long finalAmount = session.getBooking().getFinalAmount();
        com.autowash.entity.SystemSettings settings = systemSettingsRepository.findById(1).orElseThrow();
        long basePoints = finalAmount / settings.getEarnPointsUnitAmount();
        BigDecimal promotionMultiplier = bookingPromotionMultiplier(session.getBooking().getId());
        return promotionMultiplier
                .multiply(BigDecimal.valueOf(basePoints))
                .multiply(BigDecimal.valueOf(tierConfigService.getPointMultiplier(tier)))
                .intValue();
    }

    @Transactional
    public EarnPointsResponse postEarnTransaction(UUID customerId, UUID sessionId) {
        User customer = requireCustomer(customerId);
        WashSession session = requireSession(sessionId);
        if (session.getStatus() != WashSessionStatus.COMPLETED) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Wash session must be COMPLETED to earn points",
                    "BUSINESS_RULE_VIOLATION"
            );
        }
        if (!session.getBooking().getCustomer().getId().equals(customer.getId())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Wash session does not belong to customer", "BUSINESS_RULE_VIOLATION");
        }

        LoyaltyAccount account = getOrCreateAccountForUpdate(customer);
        PointTransaction existing = pointTransactionRepository
                .findByTypeAndBookingId(PointTransactionType.EARN, session.getBooking().getId())
                .orElse(null);
        if (existing != null) {
            return toEarnResponse(existing, account);
        }

        int pointsAwarded = calculateEarnPoints(sessionId);
        account.addPoints(pointsAwarded);
        PointTransaction transaction = new PointTransaction(
                account,
                session.getBooking(),
                PointTransactionType.EARN,
                pointsAwarded,
                account.getCurrentPoints(),
                "Wash completed"
        );

        try {
            pointTransactionRepository.saveAndFlush(transaction);
        } catch (DataIntegrityViolationException exception) {
            PointTransaction racedTransaction = pointTransactionRepository
                    .findByTypeAndBookingId(PointTransactionType.EARN, session.getBooking().getId())
                    .orElseThrow(() -> exception);
            return toEarnResponse(racedTransaction, account);
        }

        evaluateTierUpgrade(account);
        return toEarnResponse(transaction, account);
    }

    @Transactional
    public RedeemPointsResponse redeemPoints(UUID customerId, int pointsToRedeem, String referenceId) {
        User customer = requireCustomer(customerId);
        validateRedemptionAmount(pointsToRedeem);

        LoyaltyAccount account = getOrCreateAccountForUpdate(customer);
        if (account.getCurrentPoints() < pointsToRedeem) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Insufficient points: have " + account.getCurrentPoints() + ", need " + pointsToRedeem,
                    "INSUFFICIENT_POINTS"
            );
        }

        String voucherCode = generateVoucherCode();
        com.autowash.entity.SystemSettings settings = systemSettingsRepository.findById(1).orElseThrow();
        long voucherValue = (long) pointsToRedeem * settings.getVndPerPoint();
        Instant expiresAt = Instant.now().plusSeconds(30L * 24 * 60 * 60);
        Voucher voucher = voucherRepository.save(new Voucher(
                voucherCode,
                "Voucher redemption: " + voucherCode,
                DiscountType.FIXED_AMOUNT,
                voucherValue,
                0L,
                null,
                1,
                false,
                Instant.now(),
                expiresAt,
                ActiveStatus.ACTIVE
        ));

        account.redeemPoints(pointsToRedeem);
        PointTransaction transaction = pointTransactionRepository.save(new PointTransaction(
                account,
                null,
                PointTransactionType.REDEEM,
                -pointsToRedeem,
                account.getCurrentPoints(),
                "Voucher redemption: " + voucher.getCode()
        ));
        return new RedeemPointsResponse(
                transaction.getId(),
                pointsToRedeem,
                account.getCurrentPoints(),
                voucher.getCode(),
                voucherValue,
                voucher.getEndAt(),
                "SUCCESS"
        );
    }

    @Transactional
    public RedeemPointsResponse applyPointsToBooking(UUID customerId, int pointsToRedeem, Booking booking) {
        User customer = requireCustomer(customerId);
        validateRedemptionAmount(pointsToRedeem);
        if (!booking.getCustomer().getId().equals(customer.getId())) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Booking not found", "RESOURCE_NOT_FOUND");
        }

        LoyaltyAccount account = getOrCreateAccountForUpdate(customer);
        if (account.getCurrentPoints() < pointsToRedeem) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Insufficient points: have " + account.getCurrentPoints() + ", need " + pointsToRedeem,
                    "INSUFFICIENT_POINTS"
            );
        }

        account.redeemPoints(pointsToRedeem);
        PointTransaction transaction = pointTransactionRepository.save(new PointTransaction(
                account,
                booking,
                PointTransactionType.REDEEM,
                -pointsToRedeem,
                account.getCurrentPoints(),
                "Points applied to booking " + booking.getId()
        ));
        com.autowash.entity.SystemSettings settings = systemSettingsRepository.findById(1).orElseThrow();
        return new RedeemPointsResponse(
                transaction.getId(),
                pointsToRedeem,
                account.getCurrentPoints(),
                null,
                (long) pointsToRedeem * settings.getVndPerPoint(),
                null,
                "APPLIED"
        );
    }

    @Transactional(readOnly = true)
    public LoyaltyService.TransactionPage getTransactionHistory(UUID customerId, String type, Instant dateFrom, Instant dateTo, int page, int limit) {
        User customer = requireCustomer(customerId);
        PointTransactionType transactionType = parseType(type);
        PageRequest pageRequest = PageRequest.of(Math.max(page - 1, 0), limit, Sort.by("createdAt").descending());
        Page<PointTransaction> transactions;
        
        if (transactionType == null && dateFrom == null && dateTo == null) {
            transactions = pointTransactionRepository.findByCustomer(customer, pageRequest);
        } else {
            transactions = pointTransactionRepository.search(
                    customer,
                    transactionType,
                    dateFrom,
                    dateTo,
                    pageRequest
            );
        }
        List<PointTransactionResponse> items = transactions.getContent().stream()
                .map(this::toTransactionResponse)
                .toList();
        PaginationMeta pagination = new PaginationMeta(
                transactions.getNumber() + 1,
                transactions.getSize(),
                transactions.getTotalElements(),
                transactions.getTotalPages(),
                transactions.hasNext()
        );
        return new LoyaltyService.TransactionPage(items, pagination);
    }

    void evaluateTierUpgrade(LoyaltyAccount account) {
        String targetTier = tierConfigService.calculateTierForPoints(account.getTotalEarnedPoints());
        if (tierConfigService.getTierRank(targetTier) <= tierConfigService.getTierRank(account.getTier())) {
            return;
        }

        String oldTier = account.getTier();
        account.updateTier(targetTier);
        tierHistoryRepository.save(new TierHistory(account, oldTier, targetTier, account.getTotalEarnedPoints()));
        pointTransactionRepository.save(new PointTransaction(
                account,
                null,
                PointTransactionType.ADJUST,
                0,
                account.getCurrentPoints(),
                "Tier upgraded from " + oldTier + " to " + targetTier
        ));
        log.info("loyalty_tier_upgraded customerId={} oldTier={} newTier={}", account.getCustomer().getId(), oldTier, targetTier);
        loyaltyAccountRepository.save(account);
    }

    @Transactional
    public void updateCustomerTierByAdmin(UUID customerId, LoyaltyTier newTier) {
        User customer = requireCustomer(customerId);
        LoyaltyAccount account = getOrCreateAccountForUpdate(customer);
        String oldTier = account.getTier();
        
        if (oldTier.equals(newTier.name())) {
            return;
        }
        
        account.updateTier(newTier);
        tierHistoryRepository.save(new TierHistory(account, oldTier, newTier.name(), account.getTotalEarnedPoints()));
        pointTransactionRepository.save(new PointTransaction(
                account,
                null,
                PointTransactionType.ADJUST,
                0,
                account.getCurrentPoints(),
                "Tier upgraded from " + oldTier + " to " + newTier
        ));
        loyaltyAccountRepository.save(account);
        
        String title = "Hạng thành viên đã thay đổi";
        String message = "Hạng thành viên của bạn đã được cập nhật thành " + newTier.name() + " bởi Quản trị viên.";
        com.autowash.entity.Notification notification = com.autowash.entity.Notification.builder()
                .id(UUID.randomUUID())
                .user(customer)
                .title(title)
                .message(message)
                .type("SYSTEM")
                .read(false)
                .createdAt(Instant.now())
                .build();
        notificationRepository.save(notification);
        
        log.info("loyalty_tier_updated_by_admin customerId={} oldTier={} newTier={}", customerId, oldTier, newTier);
    }

    private LoyaltyAccount getOrCreateAccount(User customer) {
        return loyaltyAccountRepository.findByCustomerId(customer.getId())
                .orElseGet(() -> loyaltyAccountRepository.save(new LoyaltyAccount(customer)));
    }

    private LoyaltyAccount getOrCreateAccountForUpdate(User customer) {
        LoyaltyAccount account = loyaltyAccountRepository.findLockedByCustomerId(customer.getId()).orElse(null);
        if (account != null) {
            return account;
        }
        LoyaltyAccount created = loyaltyAccountRepository.saveAndFlush(new LoyaltyAccount(customer));
        return loyaltyAccountRepository.findLockedByCustomerId(customer.getId()).orElse(created);
    }

    private User requireCustomer(UUID customerId) {
        User customer = UserRepository.findById(customerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Customer not found", "RESOURCE_NOT_FOUND"));
        return customer;
    }

    private WashSession requireSession(UUID sessionId) {
        return washSessionRepository.findWithBookingById(sessionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Wash session not found", "RESOURCE_NOT_FOUND"));
    }

    private void validateRedemptionAmount(int pointsToRedeem) {
        com.autowash.entity.SystemSettings settings = systemSettingsRepository.findById(1).orElseThrow();
        if (pointsToRedeem < settings.getMinRedemptionPoints()) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Minimum redemption is " + settings.getMinRedemptionPoints() + " points",
                    "BUSINESS_RULE_VIOLATION"
            );
        }
        if (pointsToRedeem > settings.getMaxRedemptionPoints()) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Maximum redemption is " + settings.getMaxRedemptionPoints() + " points",
                    "BUSINESS_RULE_VIOLATION"
            );
        }
    }

    private PointTransactionType parseType(String type) {
        if (type == null || type.isBlank()) {
            return null;
        }
        try {
            return PointTransactionType.valueOf(type);
        } catch (IllegalArgumentException exception) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid type. Valid values: " + Arrays.toString(PointTransactionType.values()),
                    "VALIDATION_ERROR"
            );
        }
    }

    private LoyaltyAccountResponse toAccountResponse(LoyaltyAccount account) {
        return new LoyaltyAccountResponse(
                account.getCustomer().getId().toString(),
                account.getTier(),
                account.getCurrentPoints(),
                account.getTotalEarnedPoints(),
                (int) washSessionRepository.countByBookingCustomerAndStatus(account.getCustomer(), WashSessionStatus.COMPLETED),
                account.getUpdatedAt()
        );
    }

    private int lifetimeEarnedPoints(User customer) {
        return Math.toIntExact(Math.max(0, pointTransactionRepository.sumPointsByCustomerAndType(customer, PointTransactionType.EARN)));
    }

    private BigDecimal bookingPromotionMultiplier(UUID bookingId) {
        return bookingPromotionRepository.findByBooking_Id(bookingId).stream()
                .map(BookingPromotion::getPointMultiplier)
                .max(BigDecimal::compareTo)
                .orElse(BigDecimal.ONE);
    }

    private String generateVoucherCode() {
        String code;
        do {
            code = "LOY-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
        } while (voucherRepository.findByCode(code).isPresent());
        return code;
    }

    private EarnPointsResponse toEarnResponse(PointTransaction transaction, LoyaltyAccount account) {
        return new EarnPointsResponse(
                transaction.getId(),
                transaction.getPoints(),
                transaction.getBalanceAfter(),
                account.getTier()
        );
    }

    private PointTransactionResponse toTransactionResponse(PointTransaction transaction) {
        return new PointTransactionResponse(
                transaction.getId(),
                transaction.getType().name(),
                transaction.getPoints(),
                transaction.getBalanceAfter(),
                transaction.getReason(),
                transaction.getBooking() != null ? transaction.getBooking().getId().toString() : null,
                transaction.getCreatedAt()
        );
    }
}

