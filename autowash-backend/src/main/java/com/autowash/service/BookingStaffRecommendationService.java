package com.autowash.service;

import com.autowash.dto.BookingStaffOptionResponse;
import com.autowash.dto.BookingStaffOptionsRequest;
import java.util.List;

public interface BookingStaffRecommendationService {
    List<BookingStaffOptionResponse> recommendStaffOptions(BookingStaffOptionsRequest request);
}
