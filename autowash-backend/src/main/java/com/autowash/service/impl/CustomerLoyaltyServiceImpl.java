package com.autowash.service.impl;

import com.autowash.service.*;
import com.autowash.entity.User;
import com.autowash.entity.Booking;
import com.autowash.entity.Combo;
import com.autowash.entity.Package;
import com.autowash.repository.ComboRepository;
import com.autowash.repository.PackageRepository;
import com.autowash.dto.LoyaltyAccountResponse;
import com.autowash.dto.LoyaltyTransactionResponse;
import com.autowash.dto.PointTransactionResponse;
import com.autowash.dto.WashHistoryItemResponse;
import com.autowash.entity.WashSession;
import com.autowash.entity.enums.WashSessionStatus;
import com.autowash.repository.WashSessionRepository;
import com.autowash.shared.dto.PaginationMeta;
import com.autowash.service.CurrentUserService;
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

    public CustomerLoyaltyServiceImpl(
            CurrentUserService currentUserService,
            WashSessionRepository washSessionRepository,
            PackageRepository PackageRepository,
            ComboRepository ComboRepository,
            LoyaltyService loyaltyService
    ) {
        this.currentUserService = currentUserService;
        this.washSessionRepository = washSessionRepository;
        this.PackageRepository = PackageRepository;
        this.ComboRepository = ComboRepository;
        this.loyaltyService = loyaltyService;
    }

    @Transactional(readOnly = true)
    public LoyaltyAccountResponse getAccount() {
        User user = currentUserService.getCurrentUser();
        LoyaltyAccountResponse account = loyaltyService.getAccount(user.getId());

        return new LoyaltyAccountResponse(
                user.getId().toString(),
                account.tier(),
                account.currentPoints(),
                account.totalEarnedPoints(),
                account.completedWashCount(),
                account.updatedAt()
        );
    }

    @Transactional(readOnly = true)
    public CustomerLoyaltyService.LoyaltyTransactionPage listTransactions(int page, int limit) {
        User user = currentUserService.getCurrentUser();
        LoyaltyService.TransactionPage transactionPage = loyaltyService.getTransactionHistory(
                user.getId(),
                null,
                null,
                null,
                page,
                limit
        );

        List<LoyaltyTransactionResponse> items = transactionPage.items().stream()
                .map(this::toTransaction)
                .toList();

        return new CustomerLoyaltyService.LoyaltyTransactionPage(items, transactionPage.pagination());
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

    @Transactional(readOnly = true)
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
            return washSessionRepository.findWithBookingById(UUID.fromString(referenceId));
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
                booking.getFinalAmount(),
                session.getAwardedLoyaltyPoints() == null ? 0 : session.getAwardedLoyaltyPoints(),
                session.getStatus().name(),
                session.getCompletedAt()
        );
    }

    private String resolvePackageName(Booking booking) {
        if (booking.getPackageId() != null) {
            return PackageRepository.findById(booking.getPackageId())
                    .map(Package::getName)
                    .orElse(booking.getPackageId() == null ? null : booking.getPackageId().toString());
        }
        if (booking.getComboId() != null) {
            return ComboRepository.findById(booking.getComboId())
                    .map(Combo::getName)
                    .orElse(booking.getComboId() == null ? null : booking.getComboId().toString());
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

