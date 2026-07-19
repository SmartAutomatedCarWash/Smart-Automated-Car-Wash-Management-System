package com.autowash.service.impl;

import com.autowash.shared.exception.ApiException;
import com.autowash.shared.exception.ErrorCode;

import com.autowash.entity.User;
import com.autowash.repository.UserRepository;
import com.autowash.service.CurrentUserService;
import com.autowash.shared.security.UserPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserServiceImpl implements CurrentUserService {

    private final UserRepository UserRepository;

    public CurrentUserServiceImpl(UserRepository UserRepository) {
        this.UserRepository = UserRepository;
    }

    @Override
    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required", ErrorCode.UNAUTHORIZED);
        }

        return UserRepository.findById(principal.getUserId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found", ErrorCode.RESOURCE_NOT_FOUND));
    }
}
