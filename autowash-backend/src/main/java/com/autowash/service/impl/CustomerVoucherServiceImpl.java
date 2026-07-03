package com.autowash.service.impl;

import com.autowash.dto.CustomerVoucherResponse;
import com.autowash.entity.LoyaltyAccount;
import com.autowash.entity.User;
import com.autowash.entity.Voucher;
import com.autowash.entity.VoucherTier;
import com.autowash.entity.enums.ActiveStatus;
import com.autowash.repository.LoyaltyAccountRepository;
import com.autowash.repository.VoucherRepository;
import com.autowash.repository.VoucherTierRepository;
import com.autowash.service.CurrentUserService;
import com.autowash.service.CustomerVoucherService;
import com.autowash.service.TierConfigService;
import com.autowash.shared.dto.PaginationMeta;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerVoucherServiceImpl implements CustomerVoucherService {

    private final VoucherRepository voucherRepository;
    private final VoucherTierRepository voucherTierRepository;
    private final LoyaltyAccountRepository loyaltyAccountRepository;
    private final CurrentUserService currentUserService;
    private final TierConfigService tierConfigService;

    public CustomerVoucherServiceImpl(
            VoucherRepository voucherRepository,
            VoucherTierRepository voucherTierRepository,
            LoyaltyAccountRepository loyaltyAccountRepository,
            CurrentUserService currentUserService,
            TierConfigService tierConfigService
    ) {
        this.voucherRepository = voucherRepository;
        this.voucherTierRepository = voucherTierRepository;
        this.loyaltyAccountRepository = loyaltyAccountRepository;
        this.currentUserService = currentUserService;
        this.tierConfigService = tierConfigService;
    }

    @Transactional(readOnly = true)
    public VoucherPage listActiveVouchers(int page, int limit) {
        User user = currentUserService.getCurrentUser();
        Page<Voucher> vouchers = voucherRepository.findActiveForTier(
                Instant.now(),
                eligibleTiersFor(user),
                ActiveStatus.ACTIVE,
                PageRequest.of(Math.max(page - 1, 0), limit)
        );

        List<CustomerVoucherResponse> items = vouchers.getContent().stream()
                .map(this::toResponse)
                .toList();

        PaginationMeta pagination = new PaginationMeta(
                vouchers.getNumber() + 1,
                vouchers.getSize(),
                vouchers.getTotalElements(),
                vouchers.getTotalPages(),
                vouchers.hasNext()
        );

        return new VoucherPage(items, pagination);
    }

    private List<String> eligibleTiersFor(User user) {
        return loyaltyAccountRepository.findByCustomerId(user.getId())
                .map(LoyaltyAccount::getTier)
                .map(tierConfigService::eligibleTierCodesFor)
                .orElseGet(() -> tierConfigService.eligibleTierCodesFor(TierConfigService.BRONZE));
    }

    private CustomerVoucherResponse toResponse(Voucher voucher) {
        List<String> targetTiers = voucherTierRepository.findByVoucherId(voucher.getId()).stream()
                .map(VoucherTier::getTier)
                .toList();

        return new CustomerVoucherResponse(
                voucher.getCode(),
                voucher.getName(),
                voucher.getDiscountType().name(),
                Math.toIntExact(voucher.getDiscountValue()),
                voucher.getMinOrderAmount(),
                voucher.getMaxDiscountAmount(),
                voucher.getEndAt(),
                targetTiers
        );
    }
}
