package com.autowash.service;

import com.autowash.dto.VnpayCheckoutResponse;
import com.autowash.dto.VnpayIpnResponse;
import com.autowash.dto.VnpayPaymentResultResponse;
import java.util.Map;

public interface ComboVnpayPaymentService {
    VnpayCheckoutResponse createCheckout(String transactionRef, long amount, String ipAddress);
    VnpayPaymentResultResponse handleReturn(Map<String, String> params);
    VnpayIpnResponse handleIpn(Map<String, String> params);
    VnpayPaymentResultResponse queryTransaction(String vnpayTxnRef, String ipAddress);
}
