package com.autowash.controller;

import com.autowash.dto.DiscountResponse;
import com.autowash.dto.UserDiscountResponse;
import com.autowash.service.CurrentUserService;
import com.autowash.service.DiscountService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/customer/discounts")
@RequiredArgsConstructor
public class CustomerDiscountController {

    private final DiscountService discountService;
    private final CurrentUserService currentUserService;

    @GetMapping("/active")
    public Page<DiscountResponse> getActiveDiscounts(@PageableDefault(size = 20) Pageable pageable) {
        return discountService.getActiveDiscounts(pageable);
    }

    @PostMapping("/{discountId}/claim")
    public UserDiscountResponse claimDiscount(@PathVariable UUID discountId) {
        UUID userId = currentUserService.getCurrentUser().getId();
        return discountService.claimDiscount(userId, discountId);
    }

    @GetMapping("/my-discounts")
    public Page<UserDiscountResponse> getMyDiscounts(@PageableDefault(size = 20) Pageable pageable) {
        UUID userId = currentUserService.getCurrentUser().getId();
        return discountService.getUserDiscounts(userId, pageable);
    }
}
