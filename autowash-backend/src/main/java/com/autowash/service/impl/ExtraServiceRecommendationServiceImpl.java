package com.autowash.service.impl;

import com.autowash.dto.ExtraServiceRecommendationResponse;
import com.autowash.entity.Combo;
import com.autowash.entity.ComboService;
import com.autowash.entity.enums.ActiveStatus;
import com.autowash.repository.ComboRepository;
import com.autowash.repository.ComboServiceRepository;
import com.autowash.repository.ServiceRepository;
import com.autowash.service.ExtraServiceRecommendationService;
import com.autowash.shared.exception.ApiException;
import com.autowash.shared.exception.ErrorCode;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExtraServiceRecommendationServiceImpl implements ExtraServiceRecommendationService {

    private static final int MAX_RECOMMENDATIONS = 3;
    private static final List<String> TAG_PRIORITY = List.of(
            "interior", "protection", "fresh", "glass", "wheels", "engine", "exterior"
    );

    private final ComboRepository comboRepository;
    private final ComboServiceRepository comboServiceRepository;
    private final ServiceRepository serviceRepository;

    public ExtraServiceRecommendationServiceImpl(
            ComboRepository comboRepository,
            ComboServiceRepository comboServiceRepository,
            ServiceRepository serviceRepository
    ) {
        this.comboRepository = comboRepository;
        this.comboServiceRepository = comboServiceRepository;
        this.serviceRepository = serviceRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExtraServiceRecommendationResponse> recommendForCombo(String comboId) {
        Combo combo = comboRepository.findByIdAndActiveTrue(comboId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "Combo is not available", ErrorCode.BUSINESS_RULE_VIOLATION));
        List<ComboService> included = comboServiceRepository.findByComboIdOrderBySortOrderAsc(combo.getId());
        Set<UUID> includedServiceIds = included.stream()
                .map(ComboService::getOptionId)
                .collect(java.util.stream.Collectors.toSet());
        List<com.autowash.entity.Service> candidates = serviceRepository.findByStatusOrderByIdAsc(ActiveStatus.ACTIVE).stream()
                .filter(service -> !includedServiceIds.contains(service.getId()))
                .toList();

        if (candidates.isEmpty()) {
            return List.of();
        }

        LinkedHashMap<String, ExtraServiceRecommendationResponse> merged = new LinkedHashMap<>();
        ruleBasedRecommendations(included, candidates).forEach(item -> merged.put(item.serviceId(), item));
        return merged.values().stream().limit(MAX_RECOMMENDATIONS).toList();
    }

    private List<ExtraServiceRecommendationResponse> ruleBasedRecommendations(
            List<ComboService> included,
            List<com.autowash.entity.Service> candidates
    ) {
        Set<String> includedTags = new LinkedHashSet<>();
        included.forEach(service -> includedTags.addAll(tags(service.getOptionName(), service.getOptionDescription())));
        List<String> missingTags = TAG_PRIORITY.stream()
                .filter(tag -> !includedTags.contains(tag))
                .toList();

        return candidates.stream()
                .map(service -> Map.entry(service, score(service, missingTags)))
                .sorted(Map.Entry.<com.autowash.entity.Service, Integer>comparingByValue(Comparator.reverseOrder())
                        .thenComparing(entry -> entry.getKey().getPrice()))
                .limit(MAX_RECOMMENDATIONS)
                .map(entry -> toResponse(entry.getKey(), reason(tags(entry.getKey().getName(), entry.getKey().getDescription())), "RULE"))
                .toList();
    }

    private int score(com.autowash.entity.Service service, List<String> missingTags) {
        Set<String> tags = tags(service.getName(), service.getDescription());
        int missingTagScore = missingTags.stream().anyMatch(tags::contains) ? 80 : 0;
        int breadthScore = tags.size() * 6;
        int priceScore = Math.max(0, 30 - (int) (service.getPrice() / 50_000));
        int durationScore = service.getDurationMinutes() <= 30 ? 8 : service.getDurationMinutes() <= 60 ? 4 : 0;
        return missingTagScore + breadthScore + priceScore + durationScore;
    }

    private Set<String> tags(String name, String description) {
        String text = ((name == null ? "" : name) + " " + (description == null ? "" : description)).toLowerCase(Locale.ROOT);
        Set<String> tags = new LinkedHashSet<>();
        if (containsAny(text, "interior", "noi that", "cabin", "vacuum", "hut bui", "seat", "leather", "da")) tags.add("interior");
        if (containsAny(text, "exterior", "ngoai that", "body", "foam", "wash", "rua", "paint", "son")) tags.add("exterior");
        if (containsAny(text, "wax", "sealant", "ceramic", "coating", "polish", "phu", "bong", "bao ve")) tags.add("protection");
        if (containsAny(text, "odor", "deodor", "khu mui", "ozone", "sanitize", "disinfect", "diet khuan")) tags.add("fresh");
        if (containsAny(text, "glass", "kinh", "windshield", "window", "mirror", "guong")) tags.add("glass");
        if (containsAny(text, "wheel", "tire", "tyre", "rim", "lop", "mam")) tags.add("wheels");
        if (containsAny(text, "engine", "may", "khoang may")) tags.add("engine");
        return tags;
    }

    private boolean containsAny(String text, String... needles) {
        for (String needle : needles) {
            if (text.contains(needle)) {
                return true;
            }
        }
        return false;
    }

    private String reason(Set<String> tags) {
        if (tags.contains("interior")) return "Bo sung cham soc noi that";
        if (tags.contains("protection")) return "Tang bao ve be mat xe";
        if (tags.contains("fresh")) return "Giup khoang xe sach mui hon";
        if (tags.contains("glass")) return "Hoan thien phan kinh";
        if (tags.contains("wheels")) return "Bo sung cham soc lop/mam";
        if (tags.contains("engine")) return "Bo sung ve sinh khoang may";
        return "Phu hop de hoan thien combo";
    }

    private ExtraServiceRecommendationResponse toResponse(com.autowash.entity.Service service, String reason, String source) {
        return new ExtraServiceRecommendationResponse(
                service.getId().toString(),
                service.getName(),
                service.getDescription(),
                service.getPrice(),
                service.getDurationMinutes(),
                reason,
                source
        );
    }

}
