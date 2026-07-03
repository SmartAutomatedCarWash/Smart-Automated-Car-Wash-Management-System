package com.autowash.controller;

import com.autowash.dto.TierVoucherOfferResponse;
import com.autowash.repository.TierVoucherOfferRepository;
import com.autowash.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/loyalty/offers")
@Tag(name = "Tier Voucher Offers")
public class PublicLoyaltyController {

    private final TierVoucherOfferRepository tierVoucherOfferRepository;

    public PublicLoyaltyController(TierVoucherOfferRepository tierVoucherOfferRepository) {
        this.tierVoucherOfferRepository = tierVoucherOfferRepository;
    }

    @GetMapping
    @Operation(summary = "List all tier voucher offers for public display")
    public ApiResponse<List<TierVoucherOfferResponse>> listOffers() {
        List<TierVoucherOfferResponse> offers = tierVoucherOfferRepository.findAll(Sort.by("pointsCost"))
                .stream()
                .map(offer -> new TierVoucherOfferResponse(
                        offer.getId(),
                        offer.getTitle(),
                        offer.getMinTier(),
                        offer.getPointsCost(),
                        offer.getVoucherValue(),
                        offer.getAccent(),
                        offer.getBadge()
                ))
                .toList();
        return ApiResponse.ok("Tier voucher offers retrieved", offers);
    }
}
