package com.autowash.service;

import com.autowash.dto.CustomerVoucherResponse;
import com.autowash.shared.dto.PaginationMeta;
import java.util.List;

public interface CustomerVoucherService {

    VoucherPage listActiveVouchers(int page, int limit);

    record VoucherPage(List<CustomerVoucherResponse> items, PaginationMeta pagination) {}
}
