package com.autowash.loyalty.service;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.autowash.service.LoyaltyService;
import com.autowash.entity.User;
import com.autowash.entity.enums.LoyaltyTier;
import com.autowash.repository.UserRepository;
import com.autowash.entity.Booking;
import com.autowash.entity.enums.PaymentMethod;
import com.autowash.repository.BookingRepository;
import com.autowash.repository.VoucherRepository;
import com.autowash.dto.EarnPointsResponse;
import com.autowash.dto.RedeemPointsResponse;
import com.autowash.entity.LoyaltyAccount;
import com.autowash.entity.PointTransaction;
import com.autowash.entity.enums.PointTransactionType;
import com.autowash.repository.LoyaltyAccountRepository;
import com.autowash.repository.PointTransactionRepository;
import com.autowash.entity.WashSession;
import com.autowash.repository.WashSessionRepository;
import com.autowash.shared.exception.ApiException;
import com.autowash.entity.Vehicle;
import com.autowash.entity.enums.VehicleType;
import com.autowash.repository.VehicleRepository;
import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class LoyaltyServiceTest {

    @Autowired
    private LoyaltyService loyaltyService;

    @Autowired
    private UserRepository UserRepository;

    @Autowired
    private VehicleRepository VehicleRepository;

    @Autowired
    private BookingRepository BookingRepository;

    @Autowired
    private WashSessionRepository washSessionRepository;

    @Autowired
    private LoyaltyAccountRepository loyaltyAccountRepository;

    @Autowired
    private PointTransactionRepository pointTransactionRepository;

    @Autowired
    private VoucherRepository voucherRepository;

    @Test
    void calculateEarnPointsUsesFinalAmountAndTierMultiplier() {
        TestData data = createCompletedSession("0901888001", "LOY_SVC_001", 150000);
        assertThat(loyaltyService.calculateEarnPoints(data.session().getId())).isEqualTo(15);

        LoyaltyAccount account = loyaltyAccountRepository.save(new LoyaltyAccount(data.customer()));
        account.updateTier(LoyaltyTier.GOLD);
        loyaltyAccountRepository.saveAndFlush(account);

        assertThat(loyaltyService.calculateEarnPoints(data.session().getId())).isEqualTo(22);
    }

    @Test
    void postEarnTransactionCreatesLedgerUpdatesBalanceAndIsIdempotent() {
        TestData data = createCompletedSession("0901888002", "LOY_SVC_002", 270000);

        EarnPointsResponse first = loyaltyService.postEarnTransaction(data.customer().getId(), data.session().getId());
        EarnPointsResponse second = loyaltyService.postEarnTransaction(data.customer().getId(), data.session().getId());

        assertThat(first.pointsAwarded()).isEqualTo(27);
        assertThat(second.transactionId()).isEqualTo(first.transactionId());
        assertThat(second.newBalance()).isEqualTo(first.newBalance());
        assertThat(pointTransactionRepository.countByTypeAndBookingId(
                PointTransactionType.EARN,
                data.session().getBooking().getId()
        )).isEqualTo(1);
    }

    @Test
    void redeemPointsReducesBalanceAndWritesNegativeTransaction() {
        TestData data = createCompletedSession("0901888003", "LOY_SVC_003", 1500000);
        loyaltyService.postEarnTransaction(data.customer().getId(), data.session().getId());
        RedeemPointsResponse response = loyaltyService.redeemPoints(data.customer().getId(), 100, "silver-100");

        assertThat(response.pointsRedeemed()).isEqualTo(100);
        assertThat(response.newBalance()).isEqualTo(50);
        assertThat(response.voucherCode()).startsWith("LOY-");
        assertThat(response.voucherValue()).isEqualTo(100_000);
        assertThat(response.status()).isEqualTo("SUCCESS");
        assertThat(response.expiresAt()).isAfter(Instant.now());
        assertThat(voucherRepository.findByCode(response.voucherCode())).isPresent();
        PointTransaction redemption = pointTransactionRepository.search(
                data.customer(),
                PointTransactionType.REDEEM,
                null,
                null,
                org.springframework.data.domain.PageRequest.of(0, 20)
        ).getContent().getFirst();
        assertThat(redemption.getPoints()).isEqualTo(-100);
        assertThat(redemption.getReason()).isEqualTo("Voucher redemption: " + response.voucherCode());
        assertThat(loyaltyService.getAccount(data.customer().getId()).totalEarnedPoints()).isEqualTo(150);
    }

    @Test
    void redeemPointsRejectsBelowMinimumAndInsufficientBalance() {
        TestData data = createCompletedSession("0901888004", "LOY_SVC_004", 270000);
        loyaltyService.getAccount(data.customer().getId());

        assertThatThrownBy(() -> loyaltyService.redeemPoints(data.customer().getId(), 49, "silver-100"))
                .isInstanceOf(ApiException.class)
                .hasMessage("Minimum redemption is 50 points");

        assertThatThrownBy(() -> loyaltyService.redeemPoints(data.customer().getId(), 201, "silver-100"))
                .isInstanceOf(ApiException.class)
                .hasMessage("Maximum redemption is 200 points");

        assertThatThrownBy(() -> loyaltyService.redeemPoints(data.customer().getId(), 100, "silver-100"))
                .isInstanceOf(ApiException.class)
                .hasMessage("Insufficient points: have 0, need 100");
    }

    @Test
    void earnEvaluatesTierUpgradeWithoutDowngradingOnRedeem() {
        TestData data = createCompletedSession("0901888005", "LOY_SVC_005", 5_000_000);

        EarnPointsResponse earnResponse = loyaltyService.postEarnTransaction(data.customer().getId(), data.session().getId());
        assertThat(earnResponse.newBalance()).isEqualTo(500);
        assertThat(earnResponse.tier()).isEqualTo("SILVER");

        loyaltyService.redeemPoints(data.customer().getId(), 100, "silver-100");
        assertThat(loyaltyService.getAccount(data.customer().getId()).tier()).isEqualTo("SILVER");
    }

    @Test
    void earnRejectsNonCompletedSession() {
        TestData data = createPendingSession("0901888006", "LOY_SVC_006", 270000);

        assertThatThrownBy(() -> loyaltyService.postEarnTransaction(data.customer().getId(), data.session().getId()))
                .isInstanceOf(ApiException.class)
                .hasMessage("Wash session must be COMPLETED to earn points");
    }

    private TestData createCompletedSession(String phone, String bookingId, long finalAmount) {
        TestData data = createPendingSession(phone, bookingId, finalAmount);
        Instant now = Instant.now();
        data.session().queue(now);
        data.session().checkIn(now, finalAmount, "VND", 0);
        data.session().start(now);
        data.session().complete(now, 0);
        washSessionRepository.saveAndFlush(data.session());
        return data;
    }

    private TestData createPendingSession(String phone, String bookingId, long finalAmount) {
        User user = new User("Nguyen Van A", phone, phone + "@example.com", "hash");
        user.activate();
        UserRepository.save(user);

        Vehicle vehicle = VehicleRepository.save(new Vehicle(
                user,
                "30H-" + phone.substring(phone.length() - 6),
                VehicleType.CAR,
                "Toyota",
                "Camry",
                2023,
                "Silver",
                true
        ));

        Booking booking = new Booking(
                UUID.randomUUID(),
                user,
                vehicle,
                null,
                null,
                null,
                Instant.now().plusSeconds(86400),
                LocalTime.of(14, 0),
                PaymentMethod.E_WALLET,
                finalAmount,
                0,
                0,
                finalAmount,
                30
        );
        booking.confirmByOtp();
        BookingRepository.save(booking);
        WashSession session = washSessionRepository.saveAndFlush(WashSession.create(booking, "Loyalty service test", null));
        return new TestData(user, booking, session);
    }

    private record TestData(User customer, Booking booking, WashSession session) {
    }
}
