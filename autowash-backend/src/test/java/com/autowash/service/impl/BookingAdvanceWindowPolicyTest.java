package com.autowash.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

import com.autowash.entity.LoyaltyAccount;
import com.autowash.entity.SystemSettings;
import com.autowash.entity.TierConfig;
import com.autowash.entity.User;
import com.autowash.entity.enums.UserRole;
import com.autowash.entity.enums.UserStatus;
import com.autowash.repository.LoyaltyAccountRepository;
import com.autowash.repository.TierConfigRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class BookingAdvanceWindowPolicyTest {

    @Test
    void resolvesLowerBookingWindowForLowerTier() {
        LoyaltyAccountRepository loyaltyAccountRepository = Mockito.mock(LoyaltyAccountRepository.class);
        TierConfigRepository tierConfigRepository = Mockito.mock(TierConfigRepository.class);
        BookingAdvanceWindowPolicy policy = new BookingAdvanceWindowPolicy(loyaltyAccountRepository, tierConfigRepository);
        User customer = customer();
        LoyaltyAccount account = new LoyaltyAccount(customer);
        account.updateTier("SILVER");

        when(loyaltyAccountRepository.findByCustomerId(customer.getId())).thenReturn(Optional.of(account));
        when(tierConfigRepository.findByActiveTrueOrderByRankOrderAsc()).thenReturn(tiers());

        assertEquals(12, policy.resolveMaxAdvanceBookingDays(customer, settings()));
    }

    @Test
    void resolvesMaximumBookingWindowForTopTier() {
        LoyaltyAccountRepository loyaltyAccountRepository = Mockito.mock(LoyaltyAccountRepository.class);
        TierConfigRepository tierConfigRepository = Mockito.mock(TierConfigRepository.class);
        BookingAdvanceWindowPolicy policy = new BookingAdvanceWindowPolicy(loyaltyAccountRepository, tierConfigRepository);
        User customer = customer();
        LoyaltyAccount account = new LoyaltyAccount(customer);
        account.updateTier("DIAMOND");

        when(loyaltyAccountRepository.findByCustomerId(customer.getId())).thenReturn(Optional.of(account));
        when(tierConfigRepository.findByActiveTrueOrderByRankOrderAsc()).thenReturn(tiers());

        assertEquals(30, policy.resolveMaxAdvanceBookingDays(customer, settings()));
    }

    private static User customer() {
        Instant now = Instant.now();
        return User.builder()
                .id(UUID.randomUUID())
                .fullName("Customer")
                .phone("0900000000")
                .email("customer@example.com")
                .passwordHash("hash")
                .role(UserRole.CUSTOMER)
                .status(UserStatus.ACTIVE)
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    private static List<TierConfig> tiers() {
        return List.of(
                tier("BRONZE", 1),
                tier("SILVER", 2),
                tier("GOLD", 3),
                tier("PLATINUM", 4),
                tier("DIAMOND", 5)
        );
    }

    private static TierConfig tier(String tier, int rankOrder) {
        return new TierConfig(tier, tier, 0, BigDecimal.ONE, rankOrder * 10, rankOrder, rankOrder * 6, true, true, null);
    }

    private static SystemSettings settings() {
        try {
            var constructor = SystemSettings.class.getDeclaredConstructor();
            constructor.setAccessible(true);
            return constructor.newInstance();
        } catch (ReflectiveOperationException exception) {
            throw new AssertionError("Unable to create system settings for test", exception);
        }
    }
}
