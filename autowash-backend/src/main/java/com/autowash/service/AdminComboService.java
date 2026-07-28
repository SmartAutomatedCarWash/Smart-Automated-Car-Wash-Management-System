package com.autowash.service;

import com.autowash.dto.AdminComboRequest;
import com.autowash.dto.ComboResponse;
import com.autowash.shared.dto.PaginationMeta;
import java.util.List;

public interface AdminComboService {
    List<ComboResponse> listCombos();
    ComboPage listCombos(String status, String sortBy, String direction, int page, int limit);
    ComboResponse getCombo(String comboId);
    ComboResponse createCombo(AdminComboRequest request);
    ComboResponse updateCombo(String comboId, AdminComboRequest request);
    ComboResponse deleteCombo(String comboId);

    record ComboPage(List<ComboResponse> items, PaginationMeta pagination) {}
}
