package com.autowash.service.impl;

import com.autowash.entity.SystemSettings;
import com.autowash.entity.TierConfig;
import com.autowash.entity.User;
import com.autowash.repository.LoyaltyAccountRepository;
import com.autowash.repository.TierConfigRepository;
import com.autowash.shared.exception.ApiException;
import com.autowash.shared.exception.ErrorCode;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class BookingAdvanceWindowPolicy {

    private static final String DEFAULT_TIER = "BRONZE";

    private final LoyaltyAccountRepository loyaltyAccountRepository;
    private final TierConfigRepository tierConfigRepository;

    public BookingAdvanceWindowPolicy(
            LoyaltyAccountRepository loyaltyAccountRepository,
            TierConfigRepository tierConfigRepository
    ) {
        this.loyaltyAccountRepository = loyaltyAccountRepository;
        this.tierConfigRepository = tierConfigRepository;
    }

    public int resolveMaxAdvanceBookingDays(User customer, SystemSettings settings) {
        int systemMaxDays = Math.max(settings.getMaxAdvanceBookingDays(), 1);
        List<TierConfig> activeTiers = tierConfigRepository.findByActiveTrueOrderByRankOrderAsc();
        if (activeTiers.isEmpty()) {
            return systemMaxDays;
        }

        String customerTier = loyaltyAccountRepository.findByCustomerId(customer.getId())
                .map(account -> TierConfig.normalizeTier(account.getTier()))
                .filter(tier -> !tier.isBlank())
                .orElse(DEFAULT_TIER);

        int tierMaxDays = activeTiers.stream()
                .filter(tier -> tier.getTier().equalsIgnoreCase(customerTier))
                .findFirst()
                .or(() -> activeTiers.stream().findFirst())
                .map(TierConfig::getAdvanceBookingDays)
                .orElse(systemMaxDays);

        return Math.max(1, Math.min(tierMaxDays, systemMaxDays));
    }

    public boolean isWithinAdvanceWindow(User customer, LocalDate bookingDate, SystemSettings settings) {
        LocalDate maxBookingDate = LocalDate.now().plusDays(resolveMaxAdvanceBookingDays(customer, settings));
        return !bookingDate.isAfter(maxBookingDate);
    }

    public void validateWithinAdvanceWindow(User customer, LocalDate bookingDate, SystemSettings settings) {
        int maxAdvanceDays = resolveMaxAdvanceBookingDays(customer, settings);
        if (bookingDate.isAfter(LocalDate.now().plusDays(maxAdvanceDays))) {
            throw new ApiException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Booking date exceeds your tier advance booking window (" + maxAdvanceDays + " days)",
                    ErrorCode.BUSINESS_RULE_VIOLATION
            );
        }
    }
}
