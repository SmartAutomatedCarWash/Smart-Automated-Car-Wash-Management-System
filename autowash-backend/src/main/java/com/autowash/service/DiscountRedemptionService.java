package com.autowash.service;

import com.autowash.entity.Booking;
import com.autowash.entity.Discount;
import com.autowash.entity.UserDiscount;

public interface DiscountRedemptionService {
    long calculateDiscountAmount(Booking booking, Discount discount);
    void redeemDiscount(Booking booking, Discount discount);
    void redeemUserDiscount(Booking booking, UserDiscount userDiscount);
    void revertRedemption(Booking booking);
    void forfeitRedemption(Booking booking);
}
