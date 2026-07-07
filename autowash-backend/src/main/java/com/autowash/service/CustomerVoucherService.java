package com.autowash.service;

import com.autowash.dto.CustomerVoucherResponse;
import com.autowash.dto.MyVoucherResponse;
import com.autowash.shared.dto.PaginationMeta;
import java.util.List;
import java.util.UUID;

public interface CustomerVoucherService {

    VoucherPage listActiveVouchers(int page, int limit);
    
    MyVoucherPage listMyVouchers(int page, int limit);
    
    MyVoucherResponse claimVoucher(UUID voucherTemplateId);

    record VoucherPage(List<CustomerVoucherResponse> items, PaginationMeta pagination) {}
    record MyVoucherPage(List<MyVoucherResponse> items, PaginationMeta pagination) {}
}
