package com.autowash.controller;

import com.autowash.shared.exception.ApiException;
import com.autowash.shared.exception.ErrorCode;

import com.autowash.dto.AnnouncementRequest;
import com.autowash.dto.AnnouncementResponse;
import com.autowash.entity.Announcement;
import com.autowash.repository.AnnouncementRepository;
import com.autowash.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@Tag(name = "Announcements")
public class AnnouncementController {

    private final AnnouncementRepository announcementRepository;

    public AnnouncementController(AnnouncementRepository announcementRepository) {
        this.announcementRepository = announcementRepository;
    }

    // ── Public ────────────────────────────────────────────────────────────────

    @GetMapping("/api/v1/public/announcements/active")
    @Operation(summary = "Get active announcements for customer pages")
    public ApiResponse<List<AnnouncementResponse>> getActiveAnnouncements() {
        List<AnnouncementResponse> data = announcementRepository
                .findActiveAnnouncements(Instant.now())
                .stream()
                .map(this::toResponse)
                .toList();
        return ApiResponse.ok("Active announcements retrieved", data);
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    @GetMapping("/api/v1/admin/announcements")
    @Operation(summary = "List all announcements")
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<AnnouncementResponse>> listAll() {
        List<AnnouncementResponse> data = announcementRepository
                .findAllByOrderByPriorityDescCreatedAtDesc()
                .stream()
                .map(this::toResponse)
                .toList();
        return ApiResponse.ok("Announcements retrieved", data);
    }

    @PostMapping("/api/v1/admin/announcements")
    @Operation(summary = "Create announcement")
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<AnnouncementResponse> create(@Valid @RequestBody AnnouncementRequest request) {
        Announcement announcement = new Announcement(
                request.title(), request.message(), request.linkUrl(), request.linkLabel(),
                request.type(), request.active(), request.priority(), request.expiresAt()
        );
        announcementRepository.save(announcement);
        return ApiResponse.ok("Announcement created", toResponse(announcement));
    }

    @PutMapping("/api/v1/admin/announcements/{id}")
    @Operation(summary = "Update announcement")
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<AnnouncementResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody AnnouncementRequest request) {
        Announcement announcement = announcementRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Announcement not found", ErrorCode.RESOURCE_NOT_FOUND));
        announcement.update(
                request.title(), request.message(), request.linkUrl(), request.linkLabel(),
                request.type(), request.active(), request.priority(), request.expiresAt()
        );
        announcementRepository.save(announcement);
        return ApiResponse.ok("Announcement updated", toResponse(announcement));
    }

    @DeleteMapping("/api/v1/admin/announcements/{id}")
    @Operation(summary = "Delete announcement")
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<Void> delete(@PathVariable UUID id) {
        if (!announcementRepository.existsById(id)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Announcement not found", ErrorCode.RESOURCE_NOT_FOUND);
        }
        announcementRepository.deleteById(id);
        return ApiResponse.ok("Announcement deleted", null);
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private AnnouncementResponse toResponse(Announcement a) {
        return new AnnouncementResponse(
                a.getId(), a.getTitle(), a.getMessage(), a.getLinkUrl(), a.getLinkLabel(),
                a.getType(), a.isActive(), a.getPriority(), a.getExpiresAt(), a.getCreatedAt()
        );
    }
}
