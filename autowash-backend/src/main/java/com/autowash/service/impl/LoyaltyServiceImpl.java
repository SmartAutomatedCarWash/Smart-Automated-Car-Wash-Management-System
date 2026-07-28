package com.autowash.service.impl;

import com.autowash.dto.EarnPointsResponse;
import com.autowash.dto.AdjustTotalEarnedPointsResponse;
import com.autowash.dto.LoyaltyAccountResponse;
import com.autowash.dto.PointTransactionResponse;
import com.autowash.dto.RedeemPointsResponse;
import com.autowash.dto.TierConfigResponse;
import com.autowash.entity.LoyaltyAccount;
import com.autowash.entity.Notification;
import com.autowash.entity.PointTransaction;
import com.autowash.entity.Booking;
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
import com.autowash.event.WebSocketEventPublisher;
import com.autowash.repository.LoyaltyAccountRepository;
import com.autowash.repository.BookingRepository;
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
import java.util.concurrent.ThreadLocalRandom;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
@Service
public class LoyaltyServiceImpl implements LoyaltyService {

    private static final Logger log = LoggerFactory.getLogger(LoyaltyService.class);

    private final UserRepository UserRepository;
    private final BookingRepository bookingRepository;
    private final WashSessionRepository washSessionRepository;
    private final LoyaltyAccountRepository loyaltyAccountRepository;

    private final PointTransactionRepository pointTransactionRepository;
    private final TierHistoryRepository tierHistoryRepository;
    private final TierConfigService tierConfigService;
    private final SystemSettingsRepository systemSettingsRepository;
    private final NotificationRepository notificationRepository;
    private final TierVoucherOfferRepository tierVoucherOfferRepository;
    private final UserDiscountRepository userDiscountRepository;
    private final WebSocketEventPublisher webSocketEventPublisher;

    public LoyaltyServiceImpl(
            UserRepository UserRepository,
            BookingRepository bookingRepository,
            WashSessionRepository washSessionRepository,
            LoyaltyAccountRepository loyaltyAccountRepository,

            PointTransactionRepository pointTransactionRepository,
            TierHistoryRepository tierHistoryRepository,
            TierConfigService tierConfigService,
            SystemSettingsRepository systemSettingsRepository,
            NotificationRepository notificationRepository,
            TierVoucherOfferRepository tierVoucherOfferRepository,
            UserDiscountRepository userDiscountRepository,
            WebSocketEventPublisher webSocketEventPublisher
    ) {
        this.UserRepository = UserRepository;
        this.bookingRepository = bookingRepository;
        this.washSessionRepository = washSessionRepository;
        this.loyaltyAccountRepository = loyaltyAccountRepository;

        this.pointTransactionRepository = pointTransactionRepository;
        this.tierHistoryRepository = tierHistoryRepository;
        this.tierConfigService = tierConfigService;
        this.systemSettingsRepository = systemSettingsRepository;
        this.notificationRepository = notificationRepository;
        this.tierVoucherOfferRepository = tierVoucherOfferRepository;
        this.userDiscountRepository = userDiscountRepository;
        this.webSocketEventPublisher = webSocketEventPublisher;
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
            return toEarnResponse(existing, account, noTierChange(account));
        }

        int pointsAwarded = calculateEarnPoints(sessionId);
        account.addPoints(pointsAwarded);
        loyaltyAccountRepository.saveAndFlush(account);
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
            return toEarnResponse(racedTransaction, account, noTierChange(account));
        }

        TierChangeResult tierChange = recalculateTierFromTotalEarnedPoints(account);
        return toEarnResponse(transaction, account, tierChange);
    }

    @Transactional
    public int postBonusTransaction(UUID customerId, int points, String reason) {
        return postBonusTransaction(customerId, null, points, reason);
    }

    @Transactional
    public int postBonusTransaction(UUID customerId, UUID bookingId, int points, String reason) {
        if (points == 0) return 0;
        User customer = requireCustomer(customerId);
        LoyaltyAccount account = getOrCreateAccountForUpdate(customer);
        Booking booking = resolveOptionalBooking(bookingId, customer);

        if (booking != null) {
            PointTransaction existing = pointTransactionRepository
                    .findByTypeAndBookingIdAndReason(PointTransactionType.ADJUST, booking.getId(), reason)
                    .orElse(null);
            if (existing != null) {
                return 0;
            }
        }
        
        int actualPoints = points;
        if (points < 0) {
            actualPoints = Math.max(points, -account.getCurrentPoints());
        }
        if (actualPoints == 0) {
            return 0;
        }
        
        account.addActivePoints(actualPoints);
        loyaltyAccountRepository.saveAndFlush(account);
        pointTransactionRepository.save(new PointTransaction(
                account,
                booking,
                PointTransactionType.ADJUST,
                actualPoints,
                account.getCurrentPoints(),
                reason
        ));
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
        loyaltyAccountRepository.saveAndFlush(account);
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
    public AdjustTotalEarnedPointsResponse adjustTotalEarnedPoints(UUID customerId, int pointsDelta, String reason) {
        User customer = requireCustomer(customerId);
        LoyaltyAccount account = getOrCreateAccountForUpdate(customer);
        account.adjustTotalEarnedPoints(pointsDelta);
        TierChangeResult tierChange = recalculateTierFromTotalEarnedPoints(account);
        loyaltyAccountRepository.save(account);

        String message = tierChange.message();
        if (!tierChange.changed()) {
            message = "Tổng điểm tích lũy đã được cập nhật. Hạng hiện tại vẫn là " + account.getTier() + ".";
        }

        pointTransactionRepository.save(new PointTransaction(
                account,
                null,
                PointTransactionType.ADJUST,
                0,
                account.getCurrentPoints(),
                "Total earned points adjusted by " + pointsDelta + ": " + reason
        ));

        return new AdjustTotalEarnedPointsResponse(
                customer.getId().toString(),
                account.getCurrentPoints(),
                account.getTotalEarnedPoints(),
                tierChange.oldTier(),
                tierChange.newTier(),
                tierChange.changed(),
                tierChange.direction(),
                message
        );
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
        int pointsToRedeem = offer.getDiscount().getRequiredPoints();
        LoyaltyAccount account = getOrCreateAccountForUpdate(customer);
        if (account.getCurrentPoints() < pointsToRedeem) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Insufficient points: have " + account.getCurrentPoints() + ", need " + pointsToRedeem,
                    "INSUFFICIENT_POINTS"
            );
        }

        account.redeemPoints(pointsToRedeem);
        loyaltyAccountRepository.saveAndFlush(account);
        Instant expiresAt = null;
        if (offer.getDiscount().getValidDaysAfterClaim() != null) {
            expiresAt = Instant.now().plus(offer.getDiscount().getValidDaysAfterClaim(), ChronoUnit.DAYS);
        }
        String voucherCode = generateVoucherCode();
        UserDiscount userDiscount = userDiscountRepository.save(UserDiscount.builder()
                .user(customer)
                .discount(offer.getDiscount())
                .voucherCode(voucherCode)
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
                "Voucher offer redemption: " + offer.getDiscount().getName()
        ));
        
        return new RedeemPointsResponse(
                transaction.getId(),
                pointsToRedeem,
                account.getCurrentPoints(),
                userDiscount.getVoucherCode(),
                (int) offer.getDiscount().getDiscountValue(),
                expiresAt,
                "REDEEMED"
        );
    }

    private String generateVoucherCode() {
        for (int attempts = 0; attempts < 10; attempts++) {
            String code = "VC" + String.format("%08d", ThreadLocalRandom.current().nextInt(100_000_000));
            if (!userDiscountRepository.existsByVoucherCodeIgnoreCase(code)) {
                return code;
            }
        }
        throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to generate voucher code", ErrorCode.SYSTEM_ERROR);
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

    TierChangeResult recalculateTierFromTotalEarnedPoints(LoyaltyAccount account) {
        String targetTier = tierConfigService.calculateTierForPoints(account.getTotalEarnedPoints());
        String oldTier = account.getTier();
        int oldRank = tierConfigService.getTierRank(oldTier);
        int targetRank = tierConfigService.getTierRank(targetTier);
        if (targetRank <= oldRank) {
            return noTierChange(account);
        }

        account.updateTier(targetTier);
        tierHistoryRepository.save(new TierHistory(account, oldTier, targetTier, account.getTotalEarnedPoints()));
        String direction = "UPGRADE";
        String reason = "Tier upgraded from " + oldTier + " to " + targetTier;
        pointTransactionRepository.save(new PointTransaction(
                account,
                null,
                PointTransactionType.ADJUST,
                0,
                account.getCurrentPoints(),
                reason
        ));
        log.info("loyalty_tier_changed customerId={} oldTier={} newTier={} direction={}", account.getCustomer().getId(), oldTier, targetTier, direction);
        loyaltyAccountRepository.save(account);

        String title = "Chúc mừng! Bạn đã thăng hạng";
        String message = "Bạn đã lên hạng từ " + oldTier + " lên " + targetTier + ".";
        Notification notification = Notification.builder()
                .id(UUID.randomUUID())
                .user(account.getCustomer())
                .title(title)
                .message(message)
                .type(NotificationType.LOYALTY)
                .read(false)
                .createdAt(Instant.now())
                .build();
        notificationRepository.save(notification);
        publishCustomerNotificationAfterCommit(
                account.getCustomer().getId(),
                notification.getId(),
                notification.getType(),
                title,
                message,
                oldTier,
                targetTier
        );
        return new TierChangeResult(true, oldTier, targetTier, direction, message);
    }

    @Transactional
    public void updateCustomerTierByAdmin(UUID customerId, String newTier) {
        String targetTier = TierConfig.normalizeTier(newTier);
        TierConfigResponse targetTierConfig = tierConfigService.getConfig(targetTier);
        User customer = requireCustomer(customerId);
        LoyaltyAccount account = getOrCreateAccountForUpdate(customer);
        String oldTier = account.getTier();
        int oldTotalEarnedPoints = account.getTotalEarnedPoints();
        int targetMinPoints = targetTierConfig.minPoints();
        
        if (oldTier.equals(targetTier)) {
            return;
        }
        
        account.setTotalEarnedPoints(targetMinPoints);
        account.updateTier(targetTier);
        tierHistoryRepository.save(new TierHistory(account, oldTier, targetTier, account.getTotalEarnedPoints()));
        pointTransactionRepository.save(new PointTransaction(
                account,
                null,
                PointTransactionType.ADJUST,
                0,
                account.getCurrentPoints(),
                "Admin updated tier from " + oldTier + " to " + targetTier
                        + " and synchronized total earned points from "
                        + oldTotalEarnedPoints + " to " + targetMinPoints
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
        publishCustomerNotificationAfterCommit(
                customer.getId(),
                notification.getId(),
                notification.getType(),
                title,
                message,
                oldTier,
                targetTier
        );
        
        log.info("loyalty_tier_updated_by_admin customerId={} oldTier={} newTier={}", customerId, oldTier, newTier);
    }

    private void publishCustomerNotificationAfterCommit(UUID userId, UUID notificationId, NotificationType type) {
        publishCustomerNotificationAfterCommit(userId, notificationId, type, null, null, null, null);
    }

    private void publishCustomerNotificationAfterCommit(
            UUID userId,
            UUID notificationId,
            NotificationType type,
            String title,
            String message,
            String oldTier,
            String newTier
    ) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            webSocketEventPublisher.publishCustomerNotification(userId, notificationId, type, title, message, oldTier, newTier);
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                webSocketEventPublisher.publishCustomerNotification(userId, notificationId, type, title, message, oldTier, newTier);
            }
        });
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
                bookingRepository.countByCustomer(account.getCustomer()),
                account.getUpdatedAt()
        );
    }



    private TierChangeResult noTierChange(LoyaltyAccount account) {
        return new TierChangeResult(false, account.getTier(), account.getTier(), "NONE", "Hạng thành viên hiện tại vẫn là " + account.getTier() + ".");
    }

    private EarnPointsResponse toEarnResponse(PointTransaction transaction, LoyaltyAccount account, TierChangeResult tierChange) {
        return new EarnPointsResponse(
                transaction.getId(),
                transaction.getPoints(),
                transaction.getBalanceAfter(),
                account.getTier(),
                tierChange.oldTier(),
                tierChange.newTier(),
                tierChange.changed(),
                tierChange.direction(),
                tierChange.message()
        );
    }

    private record TierChangeResult(
            boolean changed,
            String oldTier,
            String newTier,
            String direction,
            String message
    ) {
    }

    private PointTransactionResponse toTransactionResponse(PointTransaction transaction) {
        return new PointTransactionResponse(
                transaction.getId(),
                transaction.getType().name(),
                transaction.getPoints(),
                transaction.getBalanceAfter(),
                transaction.getReason(),
                resolveReferenceBookingId(transaction),
                transaction.getCreatedAt()
        );
    }

    private Booking resolveOptionalBooking(UUID bookingId, User customer) {
        if (bookingId == null) {
            return null;
        }
        return bookingRepository.findByCustomerAndId(customer, bookingId).orElse(null);
    }

    private String resolveReferenceBookingId(PointTransaction transaction) {
        if (transaction.getBooking() != null) {
            return transaction.getBooking().getId().toString();
        }
        if ("First booking bonus".equalsIgnoreCase(transaction.getReason())) {
            return bookingRepository.findFirstByCustomerOrderByCreatedAtAsc(transaction.getLoyaltyAccount().getCustomer())
                    .map(booking -> booking.getId().toString())
                    .orElse(null);
        }
        return null;
    }
}

