package com.autowash.service.impl;

import com.autowash.entity.WashSession;

import com.autowash.service.LoyaltyService;

import com.autowash.entity.enums.BookingItemType;

import com.autowash.dto.PointTransactionResponse;
import com.autowash.dto.BookingPointBreakdownResponse;


import com.autowash.service.CurrentUserService;
import com.autowash.service.CustomerLoyaltyService;
import com.autowash.entity.User;
import com.autowash.entity.Booking;
import com.autowash.entity.Combo;
import com.autowash.entity.Package;
import com.autowash.repository.ComboRepository;
import com.autowash.repository.BookingRepository;
import com.autowash.repository.PackageRepository;
import com.autowash.repository.PointTransactionRepository;
import com.autowash.dto.LoyaltyAccountResponse;
import com.autowash.dto.LoyaltyTransactionResponse;
import com.autowash.dto.WashHistoryItemResponse;
import com.autowash.entity.enums.WashSessionStatus;
import com.autowash.entity.enums.PointTransactionType;
import com.autowash.entity.PointTransaction;
import com.autowash.repository.WashSessionRepository;
import com.autowash.shared.dto.PaginationMeta;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerLoyaltyServiceImpl implements CustomerLoyaltyService {

    private final CurrentUserService currentUserService;
    private final WashSessionRepository washSessionRepository;
    private final PackageRepository PackageRepository;
    private final ComboRepository ComboRepository;
    private final LoyaltyService loyaltyService;
    private final BookingRepository bookingRepository;
    private final PointTransactionRepository pointTransactionRepository;

    public CustomerLoyaltyServiceImpl(
            CurrentUserService currentUserService,
            WashSessionRepository washSessionRepository,
            PackageRepository PackageRepository,
            ComboRepository ComboRepository,
            LoyaltyService loyaltyService,
            BookingRepository bookingRepository,
            PointTransactionRepository pointTransactionRepository
    ) {
        this.currentUserService = currentUserService;
        this.washSessionRepository = washSessionRepository;
        this.PackageRepository = PackageRepository;
        this.ComboRepository = ComboRepository;
        this.loyaltyService = loyaltyService;
        this.bookingRepository = bookingRepository;
        this.pointTransactionRepository = pointTransactionRepository;
    }

    @Transactional
    public LoyaltyAccountResponse getAccount() {
        User user = currentUserService.getCurrentUser();
        LoyaltyAccountResponse account = loyaltyService.getAccount(user.getId());

        return new LoyaltyAccountResponse(
                user.getId().toString(),
                account.tier(),
                account.currentPoints(),
                account.totalEarnedPoints(),
                account.completedWashCount(),
                account.totalBookingCount(),
                account.updatedAt()
        );
    }

    @Transactional(readOnly = true)
    public CustomerLoyaltyService.LoyaltyTransactionPage listTransactions(int page, int limit) {
        User user = currentUserService.getCurrentUser();
        LoyaltyService.TransactionPage transactionPage =
                loyaltyService.getCustomerTransactionHistory(user.getId(), page, limit);

        List<LoyaltyTransactionResponse> items = transactionPage.items().stream()
                .map(this::toTransaction)
                .toList();

        return new CustomerLoyaltyService.LoyaltyTransactionPage(items, transactionPage.pagination());
    }

    @Transactional(readOnly = true)
    public BookingPointBreakdownResponse getBookingPointBreakdown(String bookingId) {
        User user = currentUserService.getCurrentUser();
        UUID parsedBookingId;
        try {
            parsedBookingId = UUID.fromString(bookingId);
        } catch (IllegalArgumentException exception) {
            throw new com.autowash.shared.exception.ApiException(
                    org.springframework.http.HttpStatus.NOT_FOUND,
                    "Booking not found",
                    com.autowash.shared.exception.ErrorCode.RESOURCE_NOT_FOUND
            );
        }

        Booking booking = bookingRepository.findByCustomerAndId(user, parsedBookingId)
                .orElseThrow(() -> new com.autowash.shared.exception.ApiException(
                        org.springframework.http.HttpStatus.NOT_FOUND,
                        "Booking not found",
                        com.autowash.shared.exception.ErrorCode.RESOURCE_NOT_FOUND
                ));
        List<PointTransaction> transactions =
                pointTransactionRepository.findByLoyaltyAccount_CustomerAndBooking_IdOrderByCreatedAtDesc(
                        user,
                        booking.getId()
                );
        int bookingPoints = transactions.stream()
                .filter(transaction -> transaction.getType() == PointTransactionType.EARN)
                .mapToInt(PointTransaction::getPoints)
                .filter(points -> points > 0)
                .sum();
        int reviewPoints = transactions.stream()
                .filter(transaction -> transaction.getType() == PointTransactionType.ADJUST)
                .filter(transaction -> "Review bonus".equalsIgnoreCase(transaction.getReason()))
                .mapToInt(PointTransaction::getPoints)
                .filter(points -> points > 0)
                .sum();

        return new BookingPointBreakdownResponse(
                booking.getId().toString(),
                bookingPoints,
                reviewPoints,
                bookingPoints + reviewPoints
        );
    }

    @Transactional(readOnly = true)
    public CustomerLoyaltyService.WashHistoryPage listWashHistory(int page, int limit) {
        User user = currentUserService.getCurrentUser();
        Page<WashSession> sessions = washSessionRepository.findByBookingCustomerAndStatusOrderByCompletedAtDesc(
                user,
                WashSessionStatus.COMPLETED,
                PageRequest.of(Math.max(page - 1, 0), limit)
        );

        List<WashHistoryItemResponse> items = sessions.getContent().stream()
                .map(this::toWashHistoryItem)
                .toList();

        return new CustomerLoyaltyService.WashHistoryPage(items, toPagination(sessions));
    }

    @Transactional
    public int getCurrentBalance(User user) {
        return loyaltyService.getAccount(user.getId()).currentPoints();
    }


    private LoyaltyTransactionResponse toTransaction(PointTransactionResponse transaction) {
        Optional<WashSession> session = findReferencedSession(transaction.referenceId());
        String sessionId = session.map(value -> value.getId().toString()).orElse(null);
        String bookingId = session.map(value -> value.getBooking().getId().toString()).orElse(transaction.referenceId());
        return new LoyaltyTransactionResponse(
                transaction.transactionId().toString(),
                sessionId,
                bookingId,
                transaction.type(),
                transaction.points(),
                transaction.reason(),
                transaction.createdAt()
        );
    }

    private Optional<WashSession> findReferencedSession(String referenceId) {
        if (referenceId == null || referenceId.isBlank()) {
            return Optional.empty();
        }
        try {
            UUID id = UUID.fromString(referenceId);
            Optional<WashSession> session = washSessionRepository.findWithBookingById(id);
            return session.isPresent() ? session : washSessionRepository.findFirstByBooking_IdOrderByCompletedAtDesc(id);
        } catch (IllegalArgumentException exception) {
            return Optional.empty();
        }
    }

    private WashHistoryItemResponse toWashHistoryItem(WashSession session) {
        Booking booking = session.getBooking();
        return new WashHistoryItemResponse(
                session.getId().toString(),
                booking.getId().toString(),
                booking.getVehicle().getPlate(),
                resolvePackageName(booking),
                booking.getBookingDate(),
                booking.getBookingTime().toString(),
                (booking.getPricing() != null ? booking.getPricing().getFinalAmount() : 0L),
                session.getAwardedLoyaltyPoints() == null ? 0 : session.getAwardedLoyaltyPoints(),
                session.getStatus().name(),
                session.getCompletedAt()
        );
    }

    private String resolvePackageName(Booking booking) {
        if ((booking.getDetails().stream().filter(d -> d.getItemType() == BookingItemType.PACKAGE).map(d -> d.getRefId()).findFirst().orElse(null)) != null) {
            return PackageRepository.findById((booking.getDetails().stream().filter(d -> d.getItemType() == BookingItemType.PACKAGE).map(d -> d.getRefId()).findFirst().orElse(null)))
                    .map(Package::getName)
                    .orElse((booking.getDetails().stream().filter(d -> d.getItemType() == BookingItemType.PACKAGE).map(d -> d.getRefId()).findFirst().orElse(null)) == null ? null : (booking.getDetails().stream().filter(d -> d.getItemType() == BookingItemType.PACKAGE).map(d -> d.getRefId()).findFirst().orElse(null)).toString());
        }
        if ((booking.getDetails().stream().filter(d -> d.getItemType() == BookingItemType.COMBO).map(d -> d.getRefId()).findFirst().orElse(null)) != null) {
            return ComboRepository.findById((booking.getDetails().stream().filter(d -> d.getItemType() == BookingItemType.COMBO).map(d -> d.getRefId()).findFirst().orElse(null)))
                    .map(Combo::getName)
                    .orElse((booking.getDetails().stream().filter(d -> d.getItemType() == BookingItemType.COMBO).map(d -> d.getRefId()).findFirst().orElse(null)) == null ? null : (booking.getDetails().stream().filter(d -> d.getItemType() == BookingItemType.COMBO).map(d -> d.getRefId()).findFirst().orElse(null)).toString());
        }
        return null;
    }

    private PaginationMeta toPagination(Page<?> page) {
        return new PaginationMeta(
                page.getNumber() + 1,
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.hasNext()
        );
    }
}

