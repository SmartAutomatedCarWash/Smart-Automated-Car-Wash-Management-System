package com.autowash.service;

import java.util.List;

import java.time.LocalDate;

import com.autowash.dto.CustomerComboResponse;
import com.autowash.dto.CustomerComboPaymentStatusResponse;
import com.autowash.dto.PurchaseCustomerComboRequest;
import com.autowash.dto.PurchaseCustomerComboResponse;
import com.autowash.entity.CustomerCombo;
import com.autowash.entity.User;

public interface CustomerComboService {
    List<CustomerComboResponse> listActiveCustomerCombos(User customer);
    CustomerCombo findActiveOwnedCombo(User customer, String comboId);
    CustomerCombo createOwnedCombo(User customer, String comboId, String purchaseBookingId);
    PurchaseCustomerComboResponse purchaseCombo(User customer, PurchaseCustomerComboRequest request);
    CustomerComboPaymentStatusResponse getPaymentStatus(User customer, String transactionRef);
    void recordUsage(CustomerCombo combo, String bookingId, LocalDate serviceDate);
    void releaseUsageForBooking(String bookingId);
    void markExpired(CustomerCombo combo);
    void markPendingPaymentAsPaid(String transactionRef);
    boolean markPendingPaymentAsPaid(String transactionRef, long paidAmount);
}


