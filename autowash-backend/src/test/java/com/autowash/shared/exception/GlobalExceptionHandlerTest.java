package com.autowash.shared.exception;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void mapsAuthenticationExceptionToUnauthorized() {
        ResponseEntity<Map<String, Object>> response =
                handler.handleAuthentication(new BadCredentialsException("Bad credentials"));

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals(401, response.getBody().get("statusCode"));
        assertEquals(ErrorCode.UNAUTHORIZED.name(), response.getBody().get("errorCode"));
    }
}
