package com.autowash.service;

import com.autowash.dto.ImageUploadResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.multipart.MultipartFile;

public interface ImageUploadService {
    ImageUploadResponse store(MultipartFile file, String folder, HttpServletRequest request);
}
