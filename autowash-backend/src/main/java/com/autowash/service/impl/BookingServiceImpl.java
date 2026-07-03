package com.autowash.service.impl;

import com.autowash.dto.BookingStatusHistoryItem;
import com.autowash.entity.User;


import com.autowash.dto.BookingOptionResponse;
import com.autowash.dto.BookingDetailResponse;
import com.autowash.dto.BookingListItemResponse;
import com.autowash.dto.CancelBookingResponse;
import com.autowash.dto.CreateBookingRequest;
import com.autowash.dto.CreateBookingResponse;
import com.autowash.dto.PayBookingResponse;
import com.autowash.entity.CustomerCombo;
import com.autowash.entity.enums.BookingStatus;
import com.autowash.entity.Booking;
import com.autowash.entity.BookingOption;
import com.autowash.entity.BookingPromotion;
import com.autowash.entity.BookingStatusHistory;
import com.autowash.entity.Payment;
import com.autowash.entity.enums.PaymentMethod;
import com.autowash.entity.enums.PaymentStatus;
import com.autowash.repository.BookingRepository;
import com.autowash.repository.BookingOptionRepository;
import com.autowash.repository.BookingPromotionRepository;
import com.autowash.repository.BookingStatusHistoryRepository;
import com.autowash.repository.PaymentRepository;
import com.autowash.entity.Combo;
import com.autowash.entity.Package;
import com.autowash.entity.SystemSettings;
import com.autowash.entity.Voucher;
import com.autowash.repository.ComboRepository;
import com.autowash.repository.PackageRepository;
import com.autowash.repository.SystemSettingsRepository;
import com.autowash.service.BookingService;
import com.autowash.service.CatalogService;
import com.autowash.dto.RedeemPointsResponse;
import com.autowash.service.CustomerComboService;

import com.autowash.service.LoyaltyService;
import com.autowash.service.PromotionService;
import com.autowash.shared.dto.PaginationMeta;
import com.autowash.shared.exception.ApiException;
import com.autowash.service.BookingEmailDeliveryService;
import com.autowash.service.CurrentUserService;
import com.autowash.repository.WashSessionRepository;
import com.autowash.entity.Vehicle;
import com.autowash.entity.enums.VehicleStatus;
import com.autowash.repository.VehicleRepository;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingServiceImpl implements BookingService {

    private static final Logger LOGGER = LoggerFactory.getLogger(BookingServiceImpl.class);

    private static final Set<BookingStatus> ACTIVE_BOOKING_STATUSES = Set.of(
            BookingStatus.CONFIRMED,
            BookingStatus.CHECKED_IN,
            BookingStatus.IN_PROGRESS
    );
    private static final Set<BookingStatus> CANCELLABLE_BOOKING_STATUSES = Set.of(
            BookingStatus.PENDING,
            BookingStatus.CONFIRMED
    );

    private final CurrentUserService currentUserService;
    private final VehicleRepository VehicleRepository;
    private final BookingRepository BookingRepository;
    private final CatalogService catalogService;
    private final PackageRepository PackageRepository;
    private final ComboRepository ComboRepository;
    private final WashSessionRepository washSessionRepository;
    private final LoyaltyService loyaltyService;
    private final CustomerComboService customerComboService;
    private final BookingOptionRepository bookingOptionRepository;
    private final BookingPromotionRepository bookingPromotionRepository;
    private final PaymentRepository paymentRepository;
    private final BookingStatusHistoryRepository bookingStatusHistoryRepository;
    private final BookingEmailDeliveryService bookingEmailDeliveryService;
    private final PromotionService promotionService;
    private final SystemSettingsRepository systemSettingsRepository;

    public BookingServiceImpl(
            CurrentUserService currentUserService,
            VehicleRepository VehicleRepository,
            BookingRepository BookingRepository,
            CatalogService catalogService,
            PackageRepository PackageRepository,
            ComboRepository ComboRepository,
            WashSessionRepository washSessionRepository,
            LoyaltyService loyaltyService,
            CustomerComboService customerComboService,
            BookingOptionRepository bookingOptionRepository,
            BookingPromotionRepository bookingPromotionRepository,
            PaymentRepository paymentRepository,
            BookingStatusHistoryRepository bookingStatusHistoryRepository,
            BookingEmailDeliveryService bookingEmailDeliveryService,
            PromotionService promotionService,
            SystemSettingsRepository systemSettingsRepository
    ) {
        this.currentUserService = currentUserService;
        this.VehicleRepository = VehicleRepository;
        this.BookingRepository = BookingRepository;
        this.catalogService = catalogService;
        this.PackageRepository = PackageRepository;
        this.ComboRepository = ComboRepository;
        this.washSessionRepository = washSessionRepository;
        this.loyaltyService = loyaltyService;
        this.customerComboService = customerComboService;
        this.bookingOptionRepository = bookingOptionRepository;
        this.bookingPromotionRepository = bookingPromotionRepository;
        this.paymentRepository = paymentRepository;
        this.bookingStatusHistoryRepository = bookingStatusHistoryRepository;
        this.bookingEmailDeliveryService = bookingEmailDeliveryService;
        this.promotionService = promotionService;
        this.systemSettingsRepository = systemSettingsRepository;
    }

    @Transactional
    public CreateBookingResponse createBooking(CreateBookingRequest request, Object metadata) {
        User user = currentUserService.getCurrentUser();
        LocalTime requestedBookingTime = LocalTime.parse(request.bookingTime());
        SystemSettings settings = loadSettings();
        validateBookingTime(request.bookingDate(), requestedBookingTime, settings);
        validateSlotCapacity(request.bookingDate().atTime(requestedBookingTime), settings.getMaxBookingsPerSlot());
        if (BookingRepository.countByCustomerAndStatusIn(user, ACTIVE_BOOKING_STATUSES) >= 3) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Maximum active bookings exceeded", "MAX_ACTIVE_BOOKINGS_EXCEEDED");
        }

        Vehicle vehicle = VehicleRepository.findByOwnerAndIdAndStatus(
                        user,
                        UUID.fromString(request.vehicleId()),
                        VehicleStatus.ACTIVE
                )
                .orElseThrow(() -> new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Vehicle not found or not owned", "RESOURCE_NOT_FOUND"));

        Package Package = null;
        Combo Combo = null;
        CustomerCombo ownedCombo = null;
        long basePrice;
        int baseDuration;
        String responsePackageId = null;
        String responsePackageName;
        String customerComboId = null;
        boolean comboPurchased = false;

        if (request.packageId() != null && !request.packageId().isBlank()) {
            Package = catalogService.requireActivePackage(request.packageId());
            basePrice = Package.getBasePrice();
            baseDuration = Package.getDurationMinutes();
            responsePackageId = Package.getId().toString();
            responsePackageName = Package.getName();
        } else {
            Combo = catalogService.requireActiveCombo(request.comboId());
            ownedCombo = customerComboService.findActiveOwnedCombo(user, Combo.getId().toString());
            baseDuration = Combo.getDurationMinutes();
            responsePackageName = Combo.getName();
            if (ownedCombo != null) {
                if (ownedCombo.isExpired()) {
                    customerComboService.markExpired(ownedCombo);
                    throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Combo is expired", "BUSINESS_RULE_VIOLATION");
                }
                if (!ownedCombo.hasRemainingUsages()) {
                    throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Combo has no remaining usages", "BUSINESS_RULE_VIOLATION");
                }
                basePrice = 0;
                customerComboId = ownedCombo.getId().toString();
            } else {
                basePrice = Combo.getPrice();
                comboPurchased = true;
            }
        }

        List<CatalogService.CatalogOption> options = Package != null
                ? catalogService.requireActivePackageOptions(Package, request.options())
                : catalogService.requireActiveComboOptions(Combo, request.options());
        long optionsTotal = options.stream().mapToLong(CatalogService.CatalogOption::price).sum();
        long subtotal = basePrice + optionsTotal;
        Voucher voucher = null;
        long voucherDiscount = 0;
        if (request.voucherCode() != null && !request.voucherCode().isBlank()) {
            voucher = catalogService.validateVoucherForBooking(request.voucherCode(), subtotal);
            voucherDiscount = catalogService.calculateDiscountAmount(voucher, subtotal);
        }

        LocalDateTime scheduledAt = request.bookingDate().atTime(requestedBookingTime);
        Booking booking = new Booking(
                UUID.randomUUID(),
                user,
                vehicle,
                Package == null ? null : Package.getId(),
                Combo == null ? null : Combo.getId(),
                voucher == null ? null : voucher.getId(),
                scheduledAt.toInstant(java.time.ZoneOffset.UTC),
                requestedBookingTime,
                request.paymentMethod(),
                basePrice,
                optionsTotal,
                voucherDiscount,
                subtotal - voucherDiscount,
                baseDuration + options.stream().mapToInt(CatalogService.CatalogOption::durationMinutes).sum()
        );
        BookingRepository.save(booking);
        List<BookingOption> bookingOptions = options.stream()
                .map(option -> new BookingOption(booking, option.optionId(), option.name(), option.price()))
                .toList();
        bookingOptionRepository.saveAll(bookingOptions);
        List<BookingPromotion> bookingPromotions = promotionService.listActiveForCustomer(user).stream()
                .map(promotion -> new BookingPromotion(booking, promotion.getId(), promotion.getPointMultiplier()))
                .toList();
        bookingPromotionRepository.saveAll(bookingPromotions);
        Payment payment = paymentRepository.save(new Payment(
                booking,
                request.paymentMethod(),
                initialPaymentStatus(request.paymentMethod()),
                booking.getFinalAmount()
        ));
        if (voucher != null) {
            voucher.recordUse();
        }
        recordStatusHistory(booking, null, booking.getStatus(), user, "Booking created");

        if (Combo != null) {
            if (ownedCombo == null) {
                ownedCombo = customerComboService.createOwnedCombo(user, Combo.getId().toString(), booking.getId().toString());
                customerComboId = ownedCombo.getId().toString();
            }
            customerComboService.recordUsage(ownedCombo, booking.getId().toString(), request.bookingDate());
        }
        sendBookingConfirmationEmailAfterCommit(booking);

        return new CreateBookingResponse(
                booking.getId().toString(),
                user.getId().toString(),
                vehicle.getId().toString(),
                vehicle.getPlate(),
                responsePackageId,
                responsePackageName,
                toOptionSelections(booking),
                booking.getBasePrice(),
                booking.getOptionsTotal(),
                booking.getVoucherDiscount(),
                booking.getFinalAmount(),
                booking.getBookingDate(),
                booking.getBookingTime().toString(),
                booking.getEstimatedDurationMinutes(),
                payment.getMethod().name(),
                payment.getStatus().name(),
                booking.getStatus().name(),
                booking.getConfirmationStatus().name(),
                0,
                null,
                booking.getCreatedAt(),
                booking.getId().toString(),
                Combo == null ? null : Combo.getId().toString(),
                customerComboId,
                comboPurchased,
                null
        );
    }

    @Transactional(readOnly = true)
    public BookingService.BookingPage listBookings(String status, LocalDate dateFrom, LocalDate dateTo, int page, int limit) {
        User user = currentUserService.getCurrentUser();
        Page<Booking> bookings;
        if (status != null && !status.isBlank()) {
            bookings = BookingRepository.findByCustomerAndStatusOrderByCreatedAtDesc(
                    user,
                    BookingStatus.valueOf(status),
                    PageRequest.of(Math.max(page - 1, 0), limit)
            );
        } else {
            bookings = BookingRepository.findByCustomerOrderByCreatedAtDesc(
                    user,
                    PageRequest.of(Math.max(page - 1, 0), limit)
            );
        }

        List<BookingListItemResponse> items = bookings.getContent().stream().map(this::toListItem).toList();
        PaginationMeta pagination = new PaginationMeta(
                bookings.getNumber() + 1,
                bookings.getSize(),
                bookings.getTotalElements(),
                bookings.getTotalPages(),
                bookings.hasNext()
        );
        return new BookingService.BookingPage(items, pagination);
    }

    @Transactional(readOnly = true)
    public BookingDetailResponse getBooking(String bookingId) {
        return toDetailResponse(findOwnedBooking(bookingId));
    }

    @Transactional
    public CancelBookingResponse cancelBooking(String bookingId, String reason) {
        Booking booking = findOwnedBooking(bookingId);
        if (!CANCELLABLE_BOOKING_STATUSES.contains(booking.getStatus())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Booking cannot be cancelled", "RESOURCE_LOCKED");
        }
        BookingStatus oldStatus = booking.getStatus();
        booking.cancel(reason);
        recordStatusHistory(booking, oldStatus, booking.getStatus(), currentActorOrNull(), reason);
        return new CancelBookingResponse(
                booking.getId().toString(),
                booking.getStatus().name(),
                null,
                0L,
                "NONE",
                "Refund will be processed within 3-5 business days"
        );
    }



    @Transactional
    public PayBookingResponse payBooking(String bookingId, String transactionRef) {
        Booking booking = findOwnedBooking(bookingId);
        if (booking.getStatus() == BookingStatus.CANCELLED || booking.getStatus() == BookingStatus.NO_SHOW) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Booking cannot be paid", "BUSINESS_RULE_VIOLATION");
        }

        Payment payment = paymentRepository.findByBooking(booking)
                .orElseGet(() -> paymentRepository.save(new Payment(
                        booking,
                        PaymentMethod.CASH_AT_COUNTER,
                        PaymentStatus.UNPAID,
                        booking.getFinalAmount()
                )));

        if (payment.getStatus() != PaymentStatus.PAID) {
            payment.updateAmount(booking.getFinalAmount());
            payment.markPaid(resolveTransactionRef(booking, transactionRef));
            if (booking.getStatus() == BookingStatus.PENDING) {
                BookingStatus oldStatus = booking.getStatus();
                booking.updateStatus(BookingStatus.CONFIRMED);
                recordStatusHistory(booking, oldStatus, booking.getStatus(), currentActorOrNull(), "Payment completed");
            }
        }

        return toPayBookingResponse(booking, payment);
    }

    @Transactional(readOnly = true)
    public Booking requireBookingForOperations(String bookingId) {
        return BookingRepository.findById(bookingId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Booking not found", "RESOURCE_NOT_FOUND"));
    }

    @Transactional
    public void updateStatus(Booking booking, BookingStatus status) {
        BookingStatus oldStatus = booking.getStatus();
        if (oldStatus == status) {
            return;
        }
        booking.updateStatus(status);
        recordStatusHistory(booking, oldStatus, status, currentActorOrNull(), null);
    }

    private void validateBookingTime(LocalDate bookingDate, LocalTime bookingTime, SystemSettings settings) {
        LocalTime operatingStartTime = LocalTime.parse(settings.getOperatingStartTime());
        LocalTime operatingEndTime = LocalTime.parse(settings.getOperatingEndTime());
        if (bookingTime.isBefore(operatingStartTime) || !bookingTime.isBefore(operatingEndTime)) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Booking time must be within operating hours",
                    "BUSINESS_RULE_VIOLATION"
            );
        }
        LocalDate today = LocalDate.now();
        if (bookingDate.isAfter(today.plusDays(settings.getMaxAdvanceBookingDays()))) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Booking date exceeds maximum advance booking window",
                    "BUSINESS_RULE_VIOLATION"
            );
        }
        if (bookingDate.atTime(bookingTime).isBefore(LocalDateTime.now())) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Booking time cannot be in the past",
                    "BUSINESS_RULE_VIOLATION"
            );
        }
    }

    private void validateSlotCapacity(LocalDateTime scheduledAt, int maxBookingsPerSlot) {
        LocalDateTime slotStart = scheduledAt.withMinute(0).withSecond(0).withNano(0);
        LocalDateTime slotEnd = slotStart.plusHours(1);
        long existingBookings = BookingRepository.countByScheduledAtSlot(
                slotStart.toInstant(java.time.ZoneOffset.UTC),
                slotEnd.toInstant(java.time.ZoneOffset.UTC),
                Set.of(BookingStatus.CANCELLED, BookingStatus.NO_SHOW)
        );
        if (existingBookings >= maxBookingsPerSlot) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Booking slot is full", "BOOKING_SLOT_FULL");
        }
    }

    private SystemSettings loadSettings() {
        return systemSettingsRepository.findById(1)
                .orElseThrow(() -> new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "System settings not found", "SYSTEM_ERROR"));
    }

    private Booking findOwnedBooking(String bookingId) {
        User user = currentUserService.getCurrentUser();
        return BookingRepository.findByCustomerAndId(user, bookingId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Booking not found", "RESOURCE_NOT_FOUND"));
    }

    private BookingListItemResponse toListItem(Booking booking) {
        String packageName = resolvePackageName(booking);
        var washSession = washSessionRepository.findFirstByBooking_IdOrderByCompletedAtDesc(booking.getId())
                .orElse(null);
        String washStatus = washSession == null ? null : washSession.getStatus().name();
        return new BookingListItemResponse(
                booking.getId().toString(),
                booking.getVehicle().getPlate(),
                packageName,
                booking.getBookingDate(),
                booking.getBookingTime().toString(),
                booking.getFinalAmount(),
                booking.getStatus().name(),
                washStatus,
                booking.getCreatedAt(),
                washSession == null ? null : washSession.getCompletedAt()
        );
    }

    public BookingDetailResponse toDetailResponse(Booking booking) {
        String packageName = resolvePackageName(booking);
        var washSession = washSessionRepository.findFirstByBooking_IdOrderByCompletedAtDesc(booking.getId())
                .orElse(null);
        PaymentInfo payment = resolvePaymentInfo(booking);
        List<BookingStatusHistoryItem> statusHistory = bookingStatusHistoryRepository
            .findByBooking_IdOrderByChangedAtAsc(booking.getId())
            .stream()
            .map(h -> new BookingStatusHistoryItem(
                    h.getOldStatus(),
                    h.getNewStatus(),
                    h.getChangedBy() == null ? null : h.getChangedBy().getFullName(),
                    h.getReason(),
                    h.getChangedAt()
            ))
            .toList();

        return new BookingDetailResponse(
                booking.getId().toString(),
                booking.getId().toString(),
                booking.getCustomer().getId().toString(),
                booking.getCustomer().getFullName(),
                booking.getCustomer().getPhone(),
                booking.getVehicle().getId().toString(),
                booking.getVehicle().getPlate(),
                booking.getVehicle().getBrand(),
                booking.getVehicle().getModel(),
                booking.getPackageId() != null ? booking.getPackageId().toString() : null,
                packageName,
                toOptionSelections(booking),
                new BookingDetailResponse.Pricing(
                        booking.getBasePrice(),
                        booking.getOptionsTotal(),
                        booking.getBasePrice() + booking.getOptionsTotal(),
                        booking.getVoucherCode(),
                        booking.getVoucherDiscount(),
                        booking.getPointsRedeemed(),
                        booking.getPointsDiscount(),
                        booking.getFinalAmount(),
                        "VND"
                ),
                new BookingDetailResponse.Scheduling(
                        booking.getBookingDate(),
                        booking.getBookingTime().toString(),
                        booking.getEstimatedDurationMinutes(),
                        booking.getBookingTime().plusMinutes(booking.getEstimatedDurationMinutes()).format(DateTimeFormatter.ofPattern("HH:mm"))
                ),
                new BookingDetailResponse.Payment(
                        payment.method().name(),
                        payment.status().name(),
                        payment.transactionRef(),
                        payment.paidAt()
                ),
                booking.getStatus().name(),
                booking.getConfirmationStatus().name(),
                booking.getConfirmationExpiresAt(),
                washSession == null ? null : washSession.getId().toString(),
                resolveAssignedStaffName(booking, washSession),
                washSession == null ? null : washSession.getStatus().name(),
                washSession == null ? null : washSession.getNotes(),
                booking.getCreatedAt(),
                null,
                statusHistory
        );
    }

    private String resolveAssignedStaffName(Booking booking, com.autowash.entity.WashSession washSession) {
        if (washSession != null && washSession.getAssignedStaff() != null) {
            return washSession.getAssignedStaff().getFullName();
        }
        return booking.getAssignedStaff() == null ? null : booking.getAssignedStaff().getFullName();
    }

    private String resolvePackageName(Booking booking) {
        if (booking.getPackageId() != null) {
            return PackageRepository.findById(booking.getPackageId())
                    .map(Package::getName)
                    .orElse(booking.getPackageId().toString());
        }
        if (booking.getComboId() != null) {
            return ComboRepository.findById(booking.getComboId())
                    .map(Combo::getName)
                    .orElse(booking.getComboId().toString());
        }
        return null;
    }

    private List<BookingOptionResponse> toOptionSelections(Booking booking) {
        return bookingOptionRepository.findByBooking_Id(booking.getId()).stream()
                .map(option -> new BookingOptionResponse(option.getOptionId().toString(), option.getOptionName(), option.getOptionPrice()))
                .toList();
    }

    private PaymentStatus initialPaymentStatus(PaymentMethod method) {
        return method == PaymentMethod.CASH_AT_COUNTER ? PaymentStatus.UNPAID : PaymentStatus.PENDING_PAYMENT;
    }

    private PaymentInfo resolvePaymentInfo(Booking booking) {
        return paymentRepository.findByBooking(booking)
                .map(payment -> new PaymentInfo(
                        payment.getMethod(),
                        payment.getStatus(),
                        payment.getTransactionRef(),
                        payment.getPaidAt()
                ))
                .orElseGet(() -> new PaymentInfo(PaymentMethod.CASH_AT_COUNTER, PaymentStatus.UNPAID, null, null));
    }

    private String resolveTransactionRef(Booking booking, String transactionRef) {
        if (transactionRef != null && !transactionRef.isBlank()) {
            return transactionRef.trim();
        }
        return "PAY-" + booking.getId();
    }

    private PayBookingResponse toPayBookingResponse(Booking booking, Payment payment) {
        User assignedStaff = booking.getAssignedStaff();
        return new PayBookingResponse(
                booking.getId().toString(),
                payment.getId().toString(),
                payment.getMethod().name(),
                payment.getStatus().name(),
                payment.getAmount(),
                payment.getTransactionRef(),
                payment.getPaidAt(),
                booking.getStatus().name(),
                assignedStaff == null ? null : assignedStaff.getId().toString(),
                assignedStaff == null ? null : assignedStaff.getFullName()
        );
    }

    private void recordStatusHistory(
            Booking booking,
            BookingStatus oldStatus,
            BookingStatus newStatus,
            User changedBy,
            String reason
    ) {
        bookingStatusHistoryRepository.save(new BookingStatusHistory(
                booking,
                oldStatus == null ? null : oldStatus.name(),
                newStatus.name(),
                changedBy,
                reason
        ));
    }

    private User currentActorOrNull() {
        try {
            return currentUserService.getCurrentUser();
        } catch (ApiException exception) {
            return null;
        }
    }

    private void sendBookingConfirmationEmailAfterCommit(Booking booking) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    sendBookingConfirmationEmail(booking);
                }
            });
            return;
        }
        sendBookingConfirmationEmail(booking);
    }

    private void sendBookingConfirmationEmail(Booking booking) {
        String email = booking.getCustomer().getEmail();
        if (email == null || email.isBlank()) {
            LOGGER.warn("Skipping booking confirmation email because customer email is empty: bookingId={}", booking.getId());
            return;
        }
        try {
            bookingEmailDeliveryService.sendBookingConfirmation(booking, email);
        } catch (RuntimeException exception) {
            LOGGER.warn("Failed to send booking confirmation email: bookingId={}, to={}", booking.getId(), email, exception);
        }
    }


    private record PaymentInfo(
            PaymentMethod method,
            PaymentStatus status,
            String transactionRef,
            java.time.Instant paidAt
    ) {
    }
}


