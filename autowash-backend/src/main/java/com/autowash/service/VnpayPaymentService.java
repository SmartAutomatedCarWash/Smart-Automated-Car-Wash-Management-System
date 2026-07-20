package com.autowash.service;

import com.autowash.dto.VnpayCheckoutResponse;
import com.autowash.dto.VnpayIpnResponse;
import com.autowash.dto.VnpayPaymentResultResponse;
import java.util.Map;
import java.util.UUID;

public interface VnpayPaymentService {
    VnpayCheckoutResponse createCheckout(UUID bookingId, String ipAddress);
    VnpayPaymentResultResponse handleReturn(Map<String, String> params);
    VnpayIpnResponse handleIpn(Map<String, String> params);
    VnpayPaymentResultResponse queryTransaction(UUID bookingId, String ipAddress);
    VnpayPaymentResultResponse refund(UUID bookingId, Long amount, String createdBy, String ipAddress);
}
