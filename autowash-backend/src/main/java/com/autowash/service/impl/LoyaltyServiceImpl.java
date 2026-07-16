package com.autowash.service.impl;

import com.autowash.service.*;
import com.autowash.entity.User;
import com.autowash.entity.Notification;
import com.autowash.entity.BookingPromotion;
import com.autowash.repository.UserRepository;
import com.autowash.dto.EarnPointsResponse;
import com.autowash.dto.LoyaltyAccountResponse;
import com.autowash.dto.PointTransactionResponse;
import com.autowash.dto.RedeemPointsResponse;
import com.autowash.entity.LoyaltyAccount;
import com.autowash.entity.PointTransaction;
import com.autowash.entity.TierHistory;
import com.autowash.entity.enums.LoyaltyTier;
import com.autowash.entity.enums.NotificationType;
import com.autowash.entity.enums.PointTransactionType;
import com.autowash.entity.enums.UserStatus;
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
    public void postBonusTransaction(UUID customerId, int points, String reason) {
        if (points == 0) return;
        User customer = requireCustomer(customerId);
        LoyaltyAccount account = getOrCreateAccountForUpdate(customer);
        
        int actualPoints = points;
        if (points < 0) {
            actualPoints = Math.max(points, -account.getCurrentPoints());
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
    public RedeemPointsResponse redeemPoints(UUID customerId, int pointsToRedeem, String referenceId) {
        User customer = requireCustomer(customerId);
        if (customer.getStatus() == UserStatus.BLOCKED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Blocked accounts cannot redeem points", "ACCOUNT_BLOCKED");
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
                null,
                PointTransactionType.REDEEM,
                -pointsToRedeem,
                account.getCurrentPoints(),
                "Voucher redemption: " + referenceId
        ));
        
        return new RedeemPointsResponse(
                transaction.getId(),
                pointsToRedeem,
                account.getCurrentPoints(),
                referenceId,
                0,
                null,
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
                .title("Chúc mừng! Bạn đã thăng hạng")
                .message("Hạng thành viên của bạn đã được nâng lên " + targetTier + ".")
                .type(NotificationType.LOYALTY)
                .read(false)
                .createdAt(Instant.now())
                .build();
        notificationRepository.save(notification);
    }

    @Transactional
    public void updateCustomerTierByAdmin(UUID customerId, String newTier) {
        String targetTier = com.autowash.entity.TierConfig.normalizeTier(newTier);
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
        
        String title = "Hạng thành viên đã thay đổi";
        String message = "Hạng thành viên của bạn đã được cập nhật thành " + targetTier + " bởi Quản trị viên.";
        com.autowash.entity.Notification notification = com.autowash.entity.Notification.builder()
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
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Customer not found", "RESOURCE_NOT_FOUND"));
        return customer;
    }

    private WashSession requireSession(UUID sessionId) {
        return washSessionRepository.findWithBookingById(sessionId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Wash session not found", "RESOURCE_NOT_FOUND"));
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

    private BigDecimal bookingPromotionMultiplier(UUID bookingId) {
        return bookingPromotionRepository.findByBooking_Id(bookingId).stream()
                .map(BookingPromotion::getPointMultiplier)
                .max(BigDecimal::compareTo)
                .orElse(BigDecimal.ONE);
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

