package com.autowash.service.impl;

import com.autowash.dto.EarnPointsResponse;
import com.autowash.dto.LoyaltyAccountResponse;
import com.autowash.dto.PointTransactionResponse;
import com.autowash.dto.RedeemPointsResponse;
import com.autowash.entity.LoyaltyAccount;
import com.autowash.entity.Notification;
import com.autowash.entity.PointTransaction;
import com.autowash.entity.SystemSettings;
import com.autowash.entity.TierConfig;
import com.autowash.entity.TierHistory;
import com.autowash.entity.TierVoucherOffer;
import com.autowash.entity.User;
import com.autowash.entity.UserDiscount;
import com.autowash.entity.WashSession;
import com.autowash.entity.enums.DiscountAcquisitionMethod;
import com.autowash.entity.enums.NotificationType;
import com.autowash.entity.enums.PointTransactionType;
import com.autowash.entity.enums.UserDiscountStatus;
import com.autowash.entity.enums.UserStatus;
import com.autowash.entity.enums.WashSessionStatus;
import com.autowash.repository.LoyaltyAccountRepository;
import com.autowash.repository.NotificationRepository;
import com.autowash.repository.PointTransactionRepository;
import com.autowash.repository.SystemSettingsRepository;
import com.autowash.repository.TierHistoryRepository;
import com.autowash.repository.TierVoucherOfferRepository;
import com.autowash.repository.UserDiscountRepository;
import com.autowash.repository.UserRepository;
import com.autowash.repository.WashSessionRepository;
import com.autowash.service.LoyaltyService;
import com.autowash.service.TierConfigService;
import com.autowash.shared.dto.PaginationMeta;
import com.autowash.shared.exception.ApiException;
import com.autowash.shared.exception.ErrorCode;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
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
public class LoyaltyServiceImpl implements LoyaltyService {

    private static final Logger log = LoggerFactory.getLogger(LoyaltyService.class);

    private final UserRepository UserRepository;
    private final WashSessionRepository washSessionRepository;
    private final LoyaltyAccountRepository loyaltyAccountRepository;

    private final PointTransactionRepository pointTransactionRepository;
    private final TierHistoryRepository tierHistoryRepository;
    private final TierConfigService tierConfigService;
    private final SystemSettingsRepository systemSettingsRepository;
    private final NotificationRepository notificationRepository;
    private final TierVoucherOfferRepository tierVoucherOfferRepository;
    private final UserDiscountRepository userDiscountRepository;

    public LoyaltyServiceImpl(
            UserRepository UserRepository,
            WashSessionRepository washSessionRepository,
            LoyaltyAccountRepository loyaltyAccountRepository,

            PointTransactionRepository pointTransactionRepository,
            TierHistoryRepository tierHistoryRepository,
            TierConfigService tierConfigService,
            SystemSettingsRepository systemSettingsRepository,
            NotificationRepository notificationRepository,
            TierVoucherOfferRepository tierVoucherOfferRepository,
            UserDiscountRepository userDiscountRepository
    ) {
        this.UserRepository = UserRepository;
        this.washSessionRepository = washSessionRepository;
        this.loyaltyAccountRepository = loyaltyAccountRepository;

        this.pointTransactionRepository = pointTransactionRepository;
        this.tierHistoryRepository = tierHistoryRepository;
        this.tierConfigService = tierConfigService;
        this.systemSettingsRepository = systemSettingsRepository;
        this.notificationRepository = notificationRepository;
        this.tierVoucherOfferRepository = tierVoucherOfferRepository;
        this.userDiscountRepository = userDiscountRepository;
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
        long finalAmount = (session.getBooking().getPricing() != null ? session.getBooking().getPricing().getFinalAmount() : 0L);
        SystemSettings settings = systemSettingsRepository.findById(1).orElseThrow();
        long basePoints = finalAmount / settings.getEarnPointsUnitAmount();
        return BigDecimal.valueOf(basePoints)
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
                    ErrorCode.BUSINESS_RULE_VIOLATION
            );
        }
        if (!session.getBooking().getCustomer().getId().equals(customer.getId())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Wash session does not belong to customer", ErrorCode.BUSINESS_RULE_VIOLATION);
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
    public int postBonusTransaction(UUID customerId, int points, String reason) {
        if (points == 0) return 0;
        User customer = requireCustomer(customerId);
        LoyaltyAccount account = getOrCreateAccountForUpdate(customer);
        
        int actualPoints = points;
        if (points < 0) {
            actualPoints = Math.max(points, -account.getCurrentPoints());
        }
        if (actualPoints == 0) {
            return 0;
        }
        
        account.addPoints(actualPoints);
        pointTransactionRepository.save(new PointTransaction(
                account,
                null,
                PointTransactionType.ADJUST,
                actualPoints,
                account.getCurrentPoints(),
                reason
        ));
        evaluateTierUpgrade(account);
        return actualPoints;
    }

    @Transactional
    public void adjustActivePoints(UUID customerId, int points, String reason) {
        if (points == 0) return;
        User customer = requireCustomer(customerId);
        LoyaltyAccount account = getOrCreateAccountForUpdate(customer);
        
        int actualPoints = points;
        if (points < 0) {
            actualPoints = Math.max(points, -account.getCurrentPoints());
        }
        
        account.addActivePoints(actualPoints);
        pointTransactionRepository.save(new PointTransaction(
                account,
                null,
                PointTransactionType.ADJUST,
                actualPoints,
                account.getCurrentPoints(),
                reason
        ));
    }

    @Transactional
    public RedeemPointsResponse redeemOffer(UUID customerId, UUID offerId) {
        User customer = requireCustomer(customerId);
        if (customer.getStatus() == UserStatus.BLOCKED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Blocked accounts cannot redeem points", ErrorCode.ACCOUNT_BLOCKED);
        }
        TierVoucherOffer offer = tierVoucherOfferRepository.findById(offerId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Tier voucher offer not found", ErrorCode.RESOURCE_NOT_FOUND));
        LoyaltyAccountResponse accountSnapshot = getAccount(customerId);
        int customerRank = tierConfigService.getConfig(accountSnapshot.tier()).rankOrder();
        int minRank = offer.getMinTier().getRankOrder();
        if (customerRank < minRank) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Your tier is not eligible for this voucher offer", ErrorCode.TIER_NOT_ELIGIBLE);
        }
        int pointsToRedeem = offer.getPointsCost();
        LoyaltyAccount account = getOrCreateAccountForUpdate(customer);
        if (account.getCurrentPoints() < pointsToRedeem) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Insufficient points: have " + account.getCurrentPoints() + ", need " + pointsToRedeem,
                    "INSUFFICIENT_POINTS"
            );
        }

        account.redeemPoints(pointsToRedeem);
        Instant expiresAt = null;
        if (offer.getDiscount().getValidDaysAfterClaim() != null) {
            expiresAt = Instant.now().plus(offer.getDiscount().getValidDaysAfterClaim(), ChronoUnit.DAYS);
        }
        UserDiscount userDiscount = userDiscountRepository.save(UserDiscount.builder()
                .user(customer)
                .discount(offer.getDiscount())
                .acquisitionMethod(DiscountAcquisitionMethod.POINT_REDEEMED)
                .pointsSpent(pointsToRedeem)
                .claimedAt(Instant.now())
                .expiresAt(expiresAt)
                .status(UserDiscountStatus.AVAILABLE)
                .build());
        PointTransaction transaction = pointTransactionRepository.save(new PointTransaction(
                account,
                null,
                PointTransactionType.REDEEM,
                -pointsToRedeem,
                account.getCurrentPoints(),
                "Voucher offer redemption: " + offer.getTitle()
        ));
        
        return new RedeemPointsResponse(
                transaction.getId(),
                pointsToRedeem,
                account.getCurrentPoints(),
                userDiscount.getId().toString(),
                offer.getVoucherValue(),
                expiresAt,
                "REDEEMED"
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

        Notification notification = Notification.builder()
                .id(UUID.randomUUID())
                .user(account.getCustomer())
                .title("Congratulations! You have been upgraded")
                .message("Your membership tier has been upgraded to " + targetTier + ".")
                .type(NotificationType.LOYALTY)
                .read(false)
                .createdAt(Instant.now())
                .build();
        notificationRepository.save(notification);
    }

    @Transactional
    public void updateCustomerTierByAdmin(UUID customerId, String newTier) {
        String targetTier = TierConfig.normalizeTier(newTier);
        tierConfigService.getConfig(targetTier);
        User customer = requireCustomer(customerId);
        LoyaltyAccount account = getOrCreateAccountForUpdate(customer);
        String oldTier = account.getTier();
        
        if (oldTier.equals(targetTier)) {
            return;
        }
        
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
        loyaltyAccountRepository.save(account);
        
        String title = "Membership tier changed";
        String message = "Your membership tier has been updated to " + targetTier + " by Administrator.";
        Notification notification = Notification.builder()
                .id(UUID.randomUUID())
                .user(customer)
                .title(title)
                .message(message)
                .type(NotificationType.SYSTEM)
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
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Customer not found", ErrorCode.RESOURCE_NOT_FOUND));
        return customer;
    }

    private WashSession requireSession(UUID sessionId) {
        return washSessionRepository.findWithBookingById(sessionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Wash session not found", ErrorCode.RESOURCE_NOT_FOUND));
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
                    ErrorCode.VALIDATION_ERROR
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

