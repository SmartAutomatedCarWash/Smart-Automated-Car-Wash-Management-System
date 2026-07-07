package com.autowash.controller;

import com.autowash.dto.TierVoucherOfferResponse;
import com.autowash.entity.VoucherTemplate;
import com.autowash.entity.enums.ActiveStatus;
import com.autowash.repository.VoucherTemplateRepository;
import com.autowash.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.autowash.repository.VoucherTierRepository;

@RestController
@RequestMapping("/api/v1/public/loyalty/offers")
@Tag(name = "Tier Voucher Offers")
public class PublicLoyaltyController {

    private final VoucherTemplateRepository voucherTemplateRepository;
    private final VoucherTierRepository voucherTierRepository;

    public PublicLoyaltyController(VoucherTemplateRepository voucherTemplateRepository, VoucherTierRepository voucherTierRepository) {
        this.voucherTemplateRepository = voucherTemplateRepository;
        this.voucherTierRepository = voucherTierRepository;
    }

    @GetMapping
    @Operation(summary = "List all active voucher templates for public display")
    public ApiResponse<List<TierVoucherOfferResponse>> listOffers() {
        List<TierVoucherOfferResponse> offers = voucherTemplateRepository.findAll()
                .stream()
                .filter(v -> v.getStatus() == ActiveStatus.ACTIVE)
                .map(this::mapToOfferResponse)
                .toList();
        return ApiResponse.ok("Tier voucher offers retrieved", offers);
    }

    private TierVoucherOfferResponse mapToOfferResponse(VoucherTemplate voucher) {
        List<com.autowash.entity.VoucherTier> tiers = voucherTierRepository.findByVoucherId(voucher.getId());
        
        List<com.autowash.entity.enums.LoyaltyTier> order = List.of(
            com.autowash.entity.enums.LoyaltyTier.BRONZE, 
            com.autowash.entity.enums.LoyaltyTier.SILVER, 
            com.autowash.entity.enums.LoyaltyTier.GOLD, 
            com.autowash.entity.enums.LoyaltyTier.PLATINUM, 
            com.autowash.entity.enums.LoyaltyTier.DIAMOND
        );
        
        com.autowash.entity.enums.LoyaltyTier lowest = com.autowash.entity.enums.LoyaltyTier.BRONZE;
        int minIndex = 999;
        for (com.autowash.entity.VoucherTier t : tiers) {
            try {
                com.autowash.entity.enums.LoyaltyTier lt = com.autowash.entity.enums.LoyaltyTier.valueOf(t.getTier());
                int idx = order.indexOf(lt);
                if (idx != -1 && idx < minIndex) {
                    minIndex = idx;
                    lowest = lt;
                }
            } catch (IllegalArgumentException e) {
                // Ignore unknown tiers
            }
        }
        
        if (minIndex == 999) {
            // Default to BRONZE if no valid tiers found
            lowest = com.autowash.entity.enums.LoyaltyTier.BRONZE;
        }
        
        String minTierStr = lowest.name();
        
        // Define color and badge based on minTier logic
        String accent = "teal";
        String badge = minTierStr.charAt(0) + minTierStr.substring(1).toLowerCase();
        
        return new TierVoucherOfferResponse(
                voucher.getId().toString(),
                voucher.getName(),
                minTierStr,
                voucher.getRequiredPoints(),
                (int) voucher.getDiscountValue(),
                accent,
                badge
        );
    }
}
