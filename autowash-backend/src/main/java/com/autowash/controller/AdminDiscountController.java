package com.autowash.controller;

import com.autowash.dto.DiscountRequest;
import com.autowash.dto.DiscountResponse;
import com.autowash.entity.enums.DiscountKind;
import com.autowash.service.DiscountService;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/discounts")
@RequiredArgsConstructor
public class AdminDiscountController {

    private final DiscountService discountService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DiscountResponse createDiscount(@RequestBody @Valid DiscountRequest request) {
        return discountService.createDiscount(request);
    }

    @GetMapping
    public Page<DiscountResponse> getDiscounts(
            @RequestParam(required = false) DiscountKind type,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return discountService.getDiscounts(type, pageable);
    }

    @GetMapping("/{id}")
    public DiscountResponse getDiscount(@PathVariable UUID id) {
        return discountService.getDiscount(id);
    }

    @PutMapping("/{id}")
    public DiscountResponse updateDiscount(
            @PathVariable UUID id,
            @RequestBody @Valid DiscountRequest request
    ) {
        return discountService.updateDiscount(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDiscount(@PathVariable UUID id) {
        discountService.deleteDiscount(id);
    }
}
