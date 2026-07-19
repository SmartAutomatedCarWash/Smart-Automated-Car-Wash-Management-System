package com.autowash.service;

import com.autowash.dto.GoogleAuthTicketResponse;

import com.autowash.dto.LoginResponse;

public interface GoogleOAuthService {
    String buildAuthorizationUrl(String returnUrl);

    String handleCallback(String code, String state);

    GoogleAuthTicketResponse getTicket(String state);

    LoginResponse exchangeTicket(String state);

    LoginResponse confirmLink(String state);
}
