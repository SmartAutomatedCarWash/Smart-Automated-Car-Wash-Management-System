package com.autowash.service;

import com.autowash.dto.CustomerComboResponse;
import com.autowash.dto.PurchaseCustomerComboRequest;
import com.autowash.dto.PurchaseCustomerComboResponse;
import com.autowash.entity.CustomerCombo;
import com.autowash.entity.User;
import java.util.List;

public interface CustomerComboService {
    List<CustomerComboResponse> listActiveCustomerCombos(User customer);
    CustomerCombo findActiveOwnedCombo(User customer, String comboId);
    CustomerCombo createOwnedCombo(User customer, String comboId, String purchaseBookingId);
    PurchaseCustomerComboResponse purchaseCombo(User customer, PurchaseCustomerComboRequest request);
    void recordUsage(CustomerCombo combo, String bookingId, java.time.LocalDate serviceDate);
    void releaseUsageForBooking(String bookingId);
    void markExpired(CustomerCombo combo);
}


