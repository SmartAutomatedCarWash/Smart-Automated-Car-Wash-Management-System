package com.autowash.service.impl;

import com.autowash.dto.CustomerVoucherResponse;
import com.autowash.dto.MyVoucherResponse;
import com.autowash.entity.LoyaltyAccount;
import com.autowash.entity.User;
import com.autowash.entity.UserVoucher;
import com.autowash.entity.VoucherTemplate;
import com.autowash.entity.VoucherTier;
import com.autowash.entity.enums.ActiveStatus;
import com.autowash.entity.enums.UserVoucherStatus;
import com.autowash.repository.LoyaltyAccountRepository;
import com.autowash.repository.UserVoucherRepository;
import com.autowash.repository.VoucherApplicableServiceRepository;
import com.autowash.repository.VoucherTemplateRepository;
import com.autowash.repository.VoucherTierRepository;
import com.autowash.service.CurrentUserService;
import com.autowash.service.CustomerVoucherService;
import com.autowash.service.TierConfigService;
import com.autowash.service.VoucherRedemptionService;
import com.autowash.shared.dto.PaginationMeta;
import com.autowash.shared.exception.ApiException;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerVoucherServiceImpl implements CustomerVoucherService {

    private final VoucherTemplateRepository voucherTemplateRepository;
    private final VoucherTierRepository voucherTierRepository;
    private final VoucherApplicableServiceRepository voucherApplicableServiceRepository;
    private final UserVoucherRepository userVoucherRepository;
    private final LoyaltyAccountRepository loyaltyAccountRepository;
    private final CurrentUserService currentUserService;
    private final TierConfigService tierConfigService;
    private final VoucherRedemptionService voucherRedemptionService;

    public CustomerVoucherServiceImpl(
            VoucherTemplateRepository voucherTemplateRepository,
            VoucherTierRepository voucherTierRepository,
            VoucherApplicableServiceRepository voucherApplicableServiceRepository,
            UserVoucherRepository userVoucherRepository,
            LoyaltyAccountRepository loyaltyAccountRepository,
            CurrentUserService currentUserService,
            TierConfigService tierConfigService,
            VoucherRedemptionService voucherRedemptionService
    ) {
        this.voucherTemplateRepository = voucherTemplateRepository;
        this.voucherTierRepository = voucherTierRepository;
        this.voucherApplicableServiceRepository = voucherApplicableServiceRepository;
        this.userVoucherRepository = userVoucherRepository;
        this.loyaltyAccountRepository = loyaltyAccountRepository;
        this.currentUserService = currentUserService;
        this.tierConfigService = tierConfigService;
        this.voucherRedemptionService = voucherRedemptionService;
    }

    @Transactional(readOnly = true)
    public VoucherPage listActiveVouchers(int page, int limit) {
        User user = currentUserService.getCurrentUser();
        List<String> eligibleTiers = eligibleTiersFor(user);
        
        List<VoucherTemplate> activeVouchers = voucherTemplateRepository.findActiveVouchers(ActiveStatus.ACTIVE);
        
        // Filter by tier logic
        List<VoucherTemplate> filteredVouchers = activeVouchers.stream().filter(voucher -> {
            List<VoucherTier> tiers = voucherTierRepository.findByVoucherId(voucher.getId());
            if (tiers.isEmpty()) return true;
            return tiers.stream().anyMatch(tier -> eligibleTiers.contains(tier.getTier()));
        }).toList();
        
        int fromIndex = Math.max(0, (page - 1) * limit);
        int toIndex = Math.min(filteredVouchers.size(), fromIndex + limit);
        List<VoucherTemplate> pagedVouchers = fromIndex < filteredVouchers.size() 
                ? filteredVouchers.subList(fromIndex, toIndex) 
                : List.of();
                
        List<CustomerVoucherResponse> items = pagedVouchers.stream()
                .map(this::toResponse)
                .toList();

        PaginationMeta pagination = new PaginationMeta(
                page,
                limit,
                filteredVouchers.size(),
                (int) Math.ceil((double) filteredVouchers.size() / limit),
                toIndex < filteredVouchers.size()
        );

        return new VoucherPage(items, pagination);
    }

    @Transactional(readOnly = true)
    public MyVoucherPage listMyVouchers(int page, int limit) {
        User user = currentUserService.getCurrentUser();
        Page<UserVoucher> myVouchers = userVoucherRepository.findByUserIdAndStatusOrderByIssuedAtDesc(
                user.getId(),
                UserVoucherStatus.AVAILABLE,
                PageRequest.of(Math.max(page - 1, 0), limit)
        );

        List<MyVoucherResponse> items = myVouchers.getContent().stream()
                .map(this::toMyVoucherResponse)
                .toList();

        PaginationMeta pagination = new PaginationMeta(
                myVouchers.getNumber() + 1,
                myVouchers.getSize(),
                myVouchers.getTotalElements(),
                myVouchers.getTotalPages(),
                myVouchers.hasNext()
        );

        return new MyVoucherPage(items, pagination);
    }
    
    @Transactional
    public MyVoucherResponse claimVoucher(UUID voucherTemplateId) {
        User user = currentUserService.getCurrentUser();
        
        int count = userVoucherRepository.countByUserIdAndVoucherTemplateId(user.getId(), voucherTemplateId);
        if (count > 0) {
            throw new ApiException(org.springframework.http.HttpStatus.BAD_REQUEST, "Voucher already claimed", "ALREADY_CLAIMED");
        }
        
        UserVoucher claimedVoucher = voucherRedemptionService.redeemVoucher(user.getId(), voucherTemplateId);
        return toMyVoucherResponse(claimedVoucher);
    }

    private List<String> eligibleTiersFor(User user) {
        return loyaltyAccountRepository.findByCustomerId(user.getId())
                .map(LoyaltyAccount::getTier)
                .map(tierConfigService::eligibleTierCodesFor)
                .orElseGet(() -> tierConfigService.eligibleTierCodesFor(TierConfigService.BRONZE));
    }

    private CustomerVoucherResponse toResponse(VoucherTemplate voucher) {
        List<String> targetTiers = voucherTierRepository.findByVoucherId(voucher.getId()).stream()
                .map(VoucherTier::getTier)
                .toList();
                
        List<UUID> applicableServiceIds = voucherApplicableServiceRepository.findAllByVoucherTemplateId(voucher.getId()).stream()
                .map(vas -> vas.getService().getId())
                .toList();

        return new CustomerVoucherResponse(
                voucher.getId().toString(),
                voucher.getCode(),
                voucher.getName(),
                voucher.getDescription(),
                voucher.getDiscountType().name(),
                (int)voucher.getDiscountValue(),
                voucher.getMinOrderAmount(),
                voucher.getMaxDiscountAmount(),
                voucher.getRequiredPoints(),
                voucher.getValidDaysAfterClaim(),
                voucher.getEndAt(),
                targetTiers,
                applicableServiceIds
        );
    }
    
    private MyVoucherResponse toMyVoucherResponse(UserVoucher userVoucher) {
        VoucherTemplate voucher = userVoucher.getVoucherTemplate();
        List<String> targetTiers = voucherTierRepository.findByVoucherId(voucher.getId()).stream()
                .map(VoucherTier::getTier)
                .toList();
                
        List<UUID> applicableServiceIds = voucherApplicableServiceRepository.findAllByVoucherTemplateId(voucher.getId()).stream()
                .map(vas -> vas.getService().getId())
                .toList();
                
        return new MyVoucherResponse(
                userVoucher.getId().toString(),
                voucher.getCode(),
                voucher.getName(),
                voucher.getDescription(),
                voucher.getDiscountType().name(),
                (int)voucher.getDiscountValue(),
                voucher.getMinOrderAmount(),
                voucher.getMaxDiscountAmount(),
                userVoucher.getIssuedAt(),
                userVoucher.getExpiredAt(),
                userVoucher.getStatus().name(),
                targetTiers,
                applicableServiceIds
        );
    }
}
